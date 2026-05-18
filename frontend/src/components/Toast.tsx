'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    
    // Auto-remove após 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Portal - Posição adaptada para mobile (bottom-center) e desktop (top-right) */}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col-reverse gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-auto sm:flex-col sm:w-[380px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in
              ${t.variant === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100' 
                : t.variant === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-100'
                : 'bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'
              }`}
          >
            {/* Ícones específicos por variante */}
            <div className="flex-shrink-0 mt-0.5">
              {t.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {t.variant === 'error' && <AlertCircle className="h-5 w-5 text-rose-500" />}
              {t.variant === 'default' && <Info className="h-5 w-5 text-primary" />}
            </div>

            {/* Conteúdo do Toast */}
            <div className="flex-1 space-y-1">
              <h5 className="text-sm font-semibold leading-none">{t.title}</h5>
              {t.description && (
                <p className="text-xs opacity-90 font-normal leading-relaxed">{t.description}</p>
              )}
            </div>

            {/* Botão de Fechar */}
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um <ToastProvider>');
  }
  return context;
}
