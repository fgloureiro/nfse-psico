'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { 
  Users, 
  FileText, 
  CircleDollarSign, 
  HelpCircle,
  PlusCircle, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

interface Nota {
  id: string;
  numero_dps: number;
  status: string;
  valor: number;
  tomador_nome: string;
  tomador_documento: string;
  created_at: string;
}

interface Perfil {
  nome: string;
  cnpj: string;
  im: string;
  ultimo_numero_dps: number;
  certificado_a1_path?: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Dashboard states
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [clientesCount, setClientesCount] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Busca perfil
        const perfilRes = await fetchApi('/perfil');
        if (perfilRes.sucesso && perfilRes.perfil) {
          setPerfil(perfilRes.perfil);
        }

        // Busca clientes
        const clientesRes = await fetchApi('/clientes');
        if (clientesRes.sucesso && clientesRes.clientes) {
          setClientesCount(clientesRes.clientes.length);
        }

        // Busca histórico de notas
        const notasRes = await fetchApi('/notas');
        if (notasRes.sucesso && notasRes.notas) {
          setNotas(notasRes.notas);
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar dados',
          description: err.message || 'Houve uma falha de rede ao consultar o backend.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [toast]);

  // Cálculos de KPIs
  const totalFaturamento = notas
    .filter(n => n.status === 'autorizada')
    .reduce((sum, n) => sum + Number(n.valor), 0);

  const totalNotasEmitidas = notas.filter(n => n.status === 'autorizada').length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'autorizada':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50">
            <CheckCircle2 className="h-3 w-3" /> Autorizada
          </span>
        );
      case 'processando':
      case 'fila':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 animate-pulse">
            <Clock className="h-3 w-3" /> Fila / Processando
          </span>
        );
      case 'rejeitada':
      case 'erro':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50">
            <XCircle className="h-3 w-3" /> Erro / Rejeitada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/50">
            <Clock className="h-3 w-3" /> Rascunho
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  const isProfileComplete = perfil?.nome && perfil?.cnpj && perfil?.im;
  const isCertConfigured = !!perfil?.certificado_a1_path;

  return (
    <div className="space-y-8">
      
      {/* Header do Dashboard */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Painel Geral
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Bem-vindo, {perfil?.nome || 'Psicólogo'}! Gerencie seu faturamento e suas DPS fiscais.
          </p>
        </div>
        
        {/* Atalhos Rápidos com hit target premium */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/emitir"
            className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition"
          >
            <PlusCircle className="h-5 w-5" />
            Emitir NFS-e
          </Link>
        </div>
      </div>

      {/* Banner de Aviso de Configuração Faltante */}
      {(!isProfileComplete || !isCertConfigured) && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-1" />
          <div className="space-y-2 flex-grow">
            <h3 className="text-base font-bold">Perfil Emitente Incompleto</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              Você precisa completar os dados cadastrais (CNPJ/IM) e subir seu Certificado Digital A1 nas configurações antes de assinar e transmitir notas reais no ambiente da SEFAZ Nacional.
            </p>
            <div className="pt-2">
              <Link
                href="/perfil"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition underline underline-offset-4"
              >
                Configurar Perfil Emitente <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      /* GRID DE CARDS KPI (Estilo SaaS Premium)    */
      /* ========================================== */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* KPI: Faturamento */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturamento</span>
            <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 p-2.5 text-sky-500">
              <CircleDollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {formatCurrency(totalFaturamento)}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500 font-semibold">
              <TrendingUp className="h-3 w-3" /> Faturamento de notas autorizadas
            </p>
          </div>
        </div>

        {/* KPI: Notas Emitidas */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NFS-e Emitidas</span>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-emerald-500">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {totalNotasEmitidas}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Notas fiscais homologadas com sucesso
            </p>
          </div>
        </div>

        {/* KPI: Clientes Cadastrados */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clientes (Tomadores)</span>
            <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-2.5 text-purple-500">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {clientesCount}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pacientes cadastrados no sistema
            </p>
          </div>
        </div>

        {/* KPI: Próxima DPS */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Próxima DPS</span>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5 text-amber-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Nº {perfil ? perfil.ultimo_numero_dps + 1 : 1}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Controle sequencial da prefeitura
            </p>
          </div>
        </div>

      </section>

      {/* ========================================== */}
      /* TABELA E CARDS DE NOTAS RECENTES          */
      /* ========================================== */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* Header do Bloco */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Histórico Recente</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Últimas notas processadas ou em fila no lote municipal</p>
          </div>
          <Link
            href="/notas"
            className="flex items-center gap-1 text-xs font-bold text-sky-500 hover:text-sky-600 transition"
          >
            Ver Tudo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tabela Responsiva / Stacked Cards no Mobile */}
        {notas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
            <Briefcase className="h-12 w-12 opacity-30 mb-4" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma Nota Emitida</h4>
            <p className="text-xs max-w-sm mt-1">Sua fila de emissão de NFS-e está vazia. Você pode emitir sua primeira DPS de serviço clicando no atalho superior.</p>
          </div>
        ) : (
          <div>
            
            {/* Modo Desktop: Tabela clássica */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <th className="px-6 py-4">Nº DPS</th>
                    <th className="px-6 py-4">Paciente (Tomador)</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Data Emissão</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notas.slice(0, 5).map((nota) => (
                    <tr key={nota.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-sm">
                      <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                        #{nota.numero_dps}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-850 dark:text-slate-200">{nota.tomador_nome}</div>
                        <div className="text-xs text-slate-400">{nota.tomador_documento}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                        {formatCurrency(nota.valor)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(nota.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(nota.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/notas/${nota.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                          Ver Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modo Mobile: Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {notas.slice(0, 5).map((nota) => (
                <div key={nota.id} className="p-5 space-y-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">DPS #{nota.numero_dps}</span>
                    {getStatusBadge(nota.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{nota.tomador_nome}</h4>
                    <p className="text-xs text-slate-400">{nota.tomador_documento}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {formatCurrency(nota.valor)}
                    </span>
                    <Link
                      href={`/notas/${nota.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 active:bg-slate-100 transition"
                    >
                      Acessar
                    </Link>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </section>

    </div>
  );
}
