'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../utils/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Carrega a sessão guardada no LocalStorage ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('viggo_jwt');
        const savedUser = localStorage.getItem('viggo_user');
        
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Falha ao restaurar dados de sessão do LocalStorage:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Efetua o login via chamada para o backend Node.js
   */
  const login = async (email: string, senha: string) => {
    setIsLoading(true);
    try {
      const response = await fetchApi('/login', {
        method: 'POST',
        body: { email, senha }
      });

      if (response.sucesso && response.access_token) {
        const payloadToken = response.access_token;
        const loggedUser: User = {
          id: response.user_id,
          email: email
        };

        // Salva metadados no LocalStorage
        localStorage.setItem('viggo_jwt', payloadToken);
        localStorage.setItem('viggo_user', JSON.stringify(loggedUser));

        setToken(payloadToken);
        setUser(loggedUser);

        console.log('[AuthContext] Login efetuado com sucesso.');
        router.push('/dashboard');
      } else {
        throw new Error(response.mensagem || 'Falha inexplicável na autenticação.');
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao autenticar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Limpa a sessão e envia o usuário de volta para a tela de login
   */
  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('viggo_jwt');
      localStorage.removeItem('viggo_user');
    }
    setToken(null);
    setUser(null);
    console.log('[AuthContext] Desconectado. Redirecionando...');
    router.push('/login');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}
