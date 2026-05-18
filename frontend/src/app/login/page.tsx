'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { Activity, KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);

  // Redireciona se o usuário já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Verifica se a sessão expirou na query string
  useEffect(() => {
    if (searchParams.get('expirado') === 'true') {
      setShowExpiredAlert(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Por favor, preencha o e-mail e a senha.',
        variant: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, senha);
      toast({
        title: 'Acesso Autorizado',
        description: 'Bem-vindo de volta! Carregando painel principal...',
        variant: 'success'
      });
    } catch (err: any) {
      toast({
        title: 'Falha na Autenticação',
        description: err.message || 'E-mail ou senha incorretos.',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logotipo e Chamada */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Viggo NFS-e
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Console de Emissão para Psicólogos Clínicos (Porto Alegre)
          </p>
        </div>

        {/* Alerta de Sessão Expirada */}
        {showExpiredAlert && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="space-y-1">
              <h5 className="text-sm font-semibold leading-none">Sessão Expirada</h5>
              <p className="text-xs opacity-90 leading-relaxed">
                Seu token de autenticação expirou. Por favor, faça login novamente para reestabelecer a conexão segura.
              </p>
            </div>
          </div>
        )}

        {/* Painel do Formulário */}
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input de E-mail */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                E-mail Profissional
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="exemplo@psicologia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-sky-500"
                />
              </div>
            </div>

            {/* Input de Senha */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="senha" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-sky-500"
                />
              </div>
            </div>

            {/* Botão de Entrar (Hitbox Mobile Aumentada) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Autenticando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Acessar Painel
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer Rodapé */}
        <div className="text-center text-xs text-slate-400">
          Viggo Fiscal Integration. Protegido com criptografia SSL e Supabase RLS.
        </div>

      </div>
    </div>
  );
}
