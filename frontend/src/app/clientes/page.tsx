'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { 
  Users, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit3, 
  UserCheck, 
  AlertOctagon, 
  Phone, 
  Mail, 
  FileSpreadsheet,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  tipo: string;
  cidade: string;
  uf: string;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  
  // Exclusão modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadClientes() {
      try {
        setLoading(true);
        const res = await fetchApi('/clientes');
        if (res.sucesso && res.clientes) {
          setClientes(res.clientes);
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar',
          description: err.message || 'Falha ao buscar a lista de clientes.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadClientes();
  }, [toast]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetchApi(`/clientes/${deletingId}`, {
        method: 'DELETE'
      });

      if (res.sucesso) {
        setClientes(prev => prev.filter(c => c.id !== deletingId));
        toast({
          title: 'Cliente Removido',
          description: 'Os dados cadastrais do tomador foram excluídos com sucesso.',
          variant: 'success'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o cliente.',
        variant: 'error'
      });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const filteredClientes = clientes.filter(c => {
    const term = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      c.cpf_cnpj.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  const formatDoc = (doc: string) => {
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
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
      
      {/* Header Clientes */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Clientes / Tomadores
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Cadastre os pacientes ou empresas tomadoras para agilizar a emissão de NFS-e simplificada.
          </p>
        </div>

        <Link
          href="/clientes/novo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition"
        >
          <PlusCircle className="h-5 w-5" />
          Novo Cliente
        </Link>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nome, CPF/CNPJ ou e-mail..."
          className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Painel do Grid / Tabela */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {filteredClientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-slate-500 dark:text-slate-400">
            <Users className="h-14 w-14 opacity-20 mb-4" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum cliente correspondente</h4>
            <p className="text-xs max-w-sm mt-1">Nenhum registro encontrado para a busca ou você ainda não possui pacientes cadastrados.</p>
          </div>
        ) : (
          <div>
            
            {/* Tabela Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Documento</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-sm">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {cliente.nome}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.tipo === 'PJ' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
                            <Building className="h-3 w-3" /> PJ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
                            <UserCheck className="h-3 w-3" /> PF
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-350">
                        {formatDoc(cliente.cpf_cnpj)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {cliente.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 flex-shrink-0 text-slate-400" /> {cliente.email}</span>}
                          {cliente.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0 text-slate-400" /> {cliente.telefone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {cliente.cidade ? `${cliente.cidade} - ${cliente.uf}` : 'Não informado'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/clientes/${cliente.id}/editar`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition"
                            title="Editar cadastro"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </Link>
                          <button
                            onClick={() => setDeletingId(cliente.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 dark:border-rose-950/30 dark:hover:bg-rose-950/20 transition"
                            title="Excluir cliente"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stacked Cards Mobile */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClientes.map((cliente) => (
                <div key={cliente.id} className="p-5 space-y-4 hover:bg-slate-50/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cliente.nome}</h4>
                      <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">{formatDoc(cliente.cpf_cnpj)}</p>
                    </div>
                    {cliente.tipo === 'PJ' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/20 dark:text-purple-400">PJ</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/20 dark:text-sky-400">PF</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {cliente.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span>{cliente.email}</span>
                      </div>
                    )}
                    {cliente.telefone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span>{cliente.telefone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="text-xs text-slate-400">
                      {cliente.cidade ? `${cliente.cidade} - ${cliente.uf}` : 'Sem localidade'}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/clientes/${cliente.id}/editar`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 active:bg-slate-100"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => setDeletingId(cliente.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-100 px-3 py-1.5 text-xs font-bold text-rose-500 dark:border-rose-950/30 active:bg-rose-50/50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* OVERLAY DIALOG: CONFIRMAÇÃO DE EXCLUSÃO    */}
      {/* ========================================== */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          
          {/* Backdrop Blur overlay */}
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setDeletingId(null)}></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-slide-in dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-rose-500">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Deseja mesmo excluir?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Esta ação é irreversível. O cadastro do tomador será deletado permanentemente do banco do Supabase e as políticas RLS bloquearão qualquer emissão pendente sob este ID.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
