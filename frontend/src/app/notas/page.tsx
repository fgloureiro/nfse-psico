'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight,
  Filter,
  PlusCircle
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

export default function NotasPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadNotas() {
      try {
        setLoading(true);
        const res = await fetchApi('/notas');
        if (res.sucesso && res.notas) {
          setNotas(res.notas);
        }
      } catch (err: any) {
        toast({
          title: 'Erro de Sincronização',
          description: 'Houve um erro de rede ao buscar a listagem de notas.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadNotas();
  }, [toast]);

  const filteredNotas = notas.filter(n => {
    const term = search.toLowerCase();
    return (
      n.tomador_nome.toLowerCase().includes(term) ||
      n.tomador_documento.includes(term) ||
      n.numero_dps.toString().includes(term)
    );
  });

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
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header Notas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Notas Fiscais (NFS-e)
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Acompanhe o processamento de lotes e a autorização de suas Declarações de Prestação de Serviço.
          </p>
        </div>

        <Link
          href="/emitir"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition"
        >
          <PlusCircle className="h-5 w-5" />
          Emitir NFS-e
        </Link>
      </div>

      {/* Filtros */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por Paciente, CPF/CNPJ ou Nº DPS..."
          className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Card / Tabela Ledger */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {filteredNotas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-slate-500 dark:text-slate-400">
            <FileText className="h-14 w-14 opacity-20 mb-4" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma nota correspondente</h4>
            <p className="text-xs max-w-sm mt-1">A consulta não retornou resultados ou você não emitiu notas no valor especificado.</p>
          </div>
        ) : (
          <div>
            
            {/* Tabela Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <th className="px-6 py-4">Nº DPS</th>
                    <th className="px-6 py-4">Paciente (Tomador)</th>
                    <th className="px-6 py-4">Valor Cobrado</th>
                    <th className="px-6 py-4">Data Emissão</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNotas.map((nota) => (
                    <tr key={nota.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-sm">
                      <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                        #{nota.numero_dps}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{nota.tomador_nome}</div>
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
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-750 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                          Ver Status
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stacked Cards Mobile */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotas.map((nota) => (
                <Link
                  key={nota.id}
                  href={`/notas/${nota.id}`}
                  className="block p-5 space-y-4 hover:bg-slate-50/10 transition"
                >
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
                    <span className="flex items-center gap-0.5 text-xs font-bold text-sky-500">
                      Rastrear <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
