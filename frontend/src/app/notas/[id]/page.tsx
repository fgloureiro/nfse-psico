'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '../../../utils/api';
import { useToast } from '../../../components/Toast';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Download,
  Eye,
  FileCode,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Nota {
  id: string;
  numero_dps: number;
  status: string;
  valor: number;
  tomador_nome: string;
  tomador_documento: string;
  erro_mensagem?: string;
  chave_acesso?: string;
  protocolo?: string;
  data_emissao?: string;
  created_at: string;
  dps_path?: string;
  nfse_path?: string;
}

export default function NotaDetalhesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState<Nota | null>(null);

  useEffect(() => {
    async function loadNota() {
      try {
        setLoading(true);
        const res = await fetchApi(`/notas/${resolvedParams.id}`);
        if (res.sucesso && res.nota) {
          setNota(res.nota);
        }
      } catch (err: any) {
        toast({
          title: 'Erro de Rastreamento',
          description: err.message || 'Não foi possível carregar os detalhes desta nota.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadNota();
  }, [resolvedParams.id, toast]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBanner = (status: string) => {
    switch (status.toLowerCase()) {
      case 'autorizada':
        return (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-250 bg-emerald-50/50 p-6 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold">NFS-e Autorizada com Sucesso!</h3>
              <p className="text-xs opacity-90 leading-relaxed">
                A Declaração de Prestação de Serviço foi homologada e gerou uma Nota Fiscal de Serviço Eletrônica válida nacionalmente.
              </p>
            </div>
          </div>
        );
      case 'processando':
      case 'fila':
        return (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-250 bg-amber-50/50 p-6 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300 animate-pulse">
            <Clock className="h-8 w-8 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold">Documento em Fila de Processamento</h3>
              <p className="text-xs opacity-90 leading-relaxed">
                O lote assinado está na fila transacional do SERPRO aguardando retorno dos servidores do município de Porto Alegre.
              </p>
            </div>
          </div>
        );
      case 'rejeitada':
      case 'erro':
        return (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-250 bg-rose-50/50 p-6 text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-350">
            <XCircle className="h-8 w-8 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-grow">
              <h3 className="text-base font-bold">Emissão Rejeitada pela SEFAZ</h3>
              <p className="text-xs opacity-90 leading-relaxed">
                Houve uma inconsistência nas informações enviadas. Veja abaixo o motivo detalhado retornado pelo processador fiscal:
              </p>
              {nota?.erro_mensagem && (
                <div className="rounded-lg bg-rose-100/50 dark:bg-rose-950/40 p-3.5 text-xs font-mono font-bold border border-rose-250/20">
                  {nota.erro_mensagem}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (!nota) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-350">Nota fiscal não encontrada</h3>
        <p className="text-xs mt-1">O ID do registro pesquisado não existe ou você não possui permissões multi-tenant para visualizá-lo.</p>
        <div className="pt-4">
          <Link
            href="/notas"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-500 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o histórico
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Botão de Voltar */}
      <div>
        <Link
          href="/notas"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o histórico
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
          Rastreamento DPS #{nota.numero_dps}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Consulte o log transacional e os metadados de validação municipal.
        </p>
      </div>

      {/* Banner de Status Dinâmico */}
      {getStatusBanner(nota.status)}

      {/* Grid de Detalhes (2 colunas) */}
      <div className="grid gap-8 md:grid-cols-2">
        
        {/* Painel 1: Dados do Tomador / Paciente */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Building className="h-5 w-5 text-sky-500" />
            Dados do Paciente (Tomador)
          </h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400">Nome / Razão Social</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{nota.tomador_nome}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Documento de Identificação</span>
              <p className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {nota.tomador_documento.length === 11 
                  ? nota.tomador_documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                  : nota.tomador_documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Painel 2: Metadados da Emissão */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <FileText className="h-5 w-5 text-sky-500" />
            Dados Fiscais
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-slate-400" /> Valor Cobrado</span>
              <p className="font-black text-slate-900 dark:text-white mt-0.5">{formatCurrency(nota.valor)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Data Criação</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {new Date(nota.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {nota.protocolo && (
              <div className="col-span-2">
                <span className="text-xs text-slate-400">Protocolo Municipal</span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-350 mt-0.5">{nota.protocolo}</p>
              </div>
            )}
            {nota.chave_acesso && (
              <div className="col-span-2">
                <span className="text-xs text-slate-400">Chave de Acesso Nacional</span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-350 mt-0.5">{nota.chave_acesso}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Painel 3: Botões de Ação para Notas Autorizadas (Premium Safe overlay) */}
      {nota.status.toLowerCase() === 'autorizada' && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Downloads e Arquivos Fiscais</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Visualizar DANFE/PDF */}
            <a
              href={`https://nfse-psico-backend.onrender.com/notas/${nota.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 py-3.5 px-4 text-sm font-bold text-slate-700 transition active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-850"
            >
              <Eye className="h-5 w-5" />
              Visualizar PDF / DANFE
            </a>

            {/* Baixar XML de Distribuição */}
            <a
              href={`https://nfse-psico-backend.onrender.com/notas/${nota.id}/xml`}
              download
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-sky-500/10 transition active:scale-[0.98]"
            >
              <Download className="h-5 w-5" />
              Baixar XML Autorizado
            </a>

          </div>
        </div>
      )}

    </div>
  );
}
