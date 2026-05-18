'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.warn('[PrivateRoute] Acesso negado. Usuário não autenticado. Redirecionando para login...');
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Se estiver carregando, exibe uma tela de transição com esqueletos premium de carregamento
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Logo animado / Spinner */}
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          
          <div className="space-y-3">
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
          </div>
          
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Carregando sua sessão com segurança...
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver carregando mas não estiver autenticado, não renderiza nada até redirecionar
  if (!isAuthenticated) {
    return null;
  }

  // Caso esteja autenticado, renderiza a página normalmente
  return <>{children}</>;
}
