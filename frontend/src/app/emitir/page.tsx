'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { 
  PlusCircle, 
  CircleDollarSign, 
  Users, 
  FileCheck2, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
}

export default function EmitirNfsePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Form states
  const [clienteId, setClienteId] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    async function loadClientes() {
      try {
        setLoading(true);
        const res = await fetchApi('/clientes');
        if (res.sucesso && res.clientes) {
          setClientes(res.clientes);
          if (res.clientes.length > 0) {
            setClienteId(res.clientes[0].id);
          }
        }
      } catch (err: any) {
        toast({
          title: 'Erro de Sincronização',
          description: 'Houve um erro ao buscar os clientes cadastrados.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadClientes();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      toast({
        title: 'Dados Inválidos',
        description: 'Por favor, selecione um paciente e informe um valor maior que R$ 0,00.',
        variant: 'error'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi('/emitir', {
        method: 'POST',
        body: {
          cliente_id: clienteId,
          valor: Number(valor)
        }
      });

      if (res.sucesso) {
        toast({
          title: 'Emissão Solicitada',
          description: `DPS Nº ${res.numero_dps} enfileirada com sucesso para processamento assíncrono!`,
          variant: 'success'
        });
        router.push('/notas');
      }
    } catch (err: any) {
      toast({
        title: 'Falha na Emissão',
        description: err.message || 'Erro interno ao processar a DPS.',
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
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

  const hasNoClientes = clientes.length === 0;

  return (
    <div className="space-y-8 max-w-3xl">
      
      {/* Header Emissão */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Emitir NFS-e Nacional
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gere uma Declaração de Prestação de Serviço (DPS) simplificada para psicologia clínica (CNAE 8610103).
        </p>
      </div>

      {hasNoClientes ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300 space-y-4 animate-slide-in">
          <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold">Nenhum Paciente Cadastrado</h3>
          <p className="text-sm opacity-90 max-w-md mx-auto leading-relaxed">
            Antes de emitir uma nota fiscal, você deve cadastrar pelo menos um tomador de serviços em seu console de clientes.
          </p>
          <div className="pt-2">
            <Link
              href="/clientes/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-600/10 transition"
            >
              Cadastrar Primeiro Paciente <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Formulário Principal (Esquerda - 2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Seleção do Cliente */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-sky-500" />
                    Selecionar Paciente (Tomador)
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.cpf_cnpj.length === 11 ? 'CPF' : 'CNPJ'}: {c.cpf_cnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor do Serviço */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-sky-500" />
                    Valor do Serviço (R$)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <span className="text-sm font-bold text-slate-400">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="150,00"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Botão de Enviar (Hit target premium) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Enfileirando Lote...
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="h-5 w-5" />
                        Transmitir DPS
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Instruções Fiscais (Direita - 1 coluna) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-sky-500" />
                Como Funciona?
              </h4>
              <p>1. O console fiscal recebe o ID do cliente selecionado e herda automaticamente o nome e documento (CPF/CNPJ).</p>
              <p>2. Um número DPS sequencial é adquirido usando travamento transacional <strong>SELECT FOR UPDATE</strong> para evitar duplicidade.</p>
              <p>3. O lote é assinado com o seu Certificado Digital A1 e colocado na fila assíncrona.</p>
              <p>4. Em segundos, o lote é validado e a NFS-e é autorizada na Prefeitura de Porto Alegre.</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
