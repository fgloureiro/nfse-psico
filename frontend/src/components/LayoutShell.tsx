'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { PrivateRoute } from './PrivateRoute';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  UserCircle, 
  Menu, 
  X, 
  LogOut, 
  Activity,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clientes / Tomadores', href: '/clientes', icon: Users },
  { name: 'Emitir NFS-e', href: '/emitir', icon: PlusCircle },
  { name: 'Notas Fiscais', href: '/notas', icon: FileText },
  { name: 'Perfil Profissional', href: '/perfil', icon: UserCircle },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Se for a página de login, renderiza limpo (sem cabeçalho nem sidebar)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        
        {/* ========================================== */}
        {/* DESKTOP SIDEBAR (Fixo no lado esquerdo)    */}
        {/* ========================================== */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-slate-900 text-slate-100 dark:bg-slate-900 border-r border-slate-800">
          {/* Cabeçalho do Sidebar */}
          <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Viggo NFS-e
            </span>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 space-y-1.5 px-4 py-6">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition
                    ${isActive 
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé do Sidebar (Sair) */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between rounded-xl bg-slate-800/40 p-3 mb-2">
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logado como</p>
                <p className="text-sm font-bold text-white truncate max-w-[150px]">{user?.email || 'Psicólogo'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-200 transition"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              Desconectar
            </button>
          </div>
        </aside>

        {/* ========================================== */}
        {/* MOBILE TOP HEADER (Sticky no Mobile/Tablet) */}
        {/* ========================================== */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileMenu}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-slate-950 dark:text-white">
                Viggo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Sair do sistema"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ========================================== */}
        {/* DRAWER LATERAL (Menu responsivo para Mobile) */}
        {/* ========================================== */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop com Safe-Zone */}
            <div 
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
              onClick={closeMobileMenu}
            ></div>

            {/* Caixa do Drawer */}
            <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-slate-900 p-6 text-white shadow-2xl animate-slide-in">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold">Viggo NFS-e</span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Links de navegação dentro do Drawer */}
              <nav className="flex-grow space-y-2 py-8">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition
                        ${isActive 
                          ? 'bg-sky-500 text-white' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Rodapé do Drawer */}
              <div className="border-t border-slate-800 pt-6">
                <p className="text-xs text-slate-400 mb-2 truncate">{user?.email}</p>
                <button
                  onClick={() => { closeMobileMenu(); logout(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-rose-400 hover:bg-rose-950/20"
                >
                  <LogOut className="h-6 w-6" />
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ÁREA DE CONTEÚDO PRINCIPAL (Main Container) */}
        {/* ========================================== */}
        <main className="lg:pl-64 flex flex-col min-h-screen">
          <div className="flex-1 px-4 py-6 sm:p-8 md:p-10 max-w-7xl w-full mx-auto">
            {children}
          </div>
        </main>

      </div>
    </PrivateRoute>
  );
}
