import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../hooks/useAuth";
import { ToastProvider } from "../components/Toast";
import { LayoutShell } from "../components/LayoutShell";

export const metadata: Metadata = {
  title: "Viggo NFS-e Nacional - Psicologia Porto Alegre",
  description: "Plataforma SaaS premium para gestão de clientes e emissão simplificada de NFS-e Nacional para Psicólogos Clínicos de Porto Alegre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthProvider>
          <ToastProvider>
            <LayoutShell>
              {children}
            </LayoutShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
