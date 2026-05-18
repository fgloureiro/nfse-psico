'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../../utils/api';
import { useToast } from '../../../../components/Toast';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Save, 
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditarClientePage({ params }: PageProps) {
  // Desembrulha a promise params conforme padrão Next.js 14/15
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('PF');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  useEffect(() => {
    async function loadCliente() {
      try {
        setLoading(true);
        const res = await fetchApi(`/clientes/${resolvedParams.id}`);
        if (res.sucesso && res.cliente) {
          const c = res.cliente;
          setNome(c.nome || '');
          setTipo(c.tipo || 'PF');
          setCpfCnpj(c.cpf_cnpj || '');
          setEmail(c.email || '');
          setTelefone(c.telefone || '');
          setLogradouro(c.logradouro || '');
          setNumero(c.numero || '');
          setComplemento(c.complemento || '');
          setBairro(c.bairro || '');
          setCidade(c.cidade || '');
          setUf(c.uf || '');
          setCep(c.cep || '');
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao buscar dados',
          description: err.message || 'Não foi possível carregar os dados cadastrais deste cliente.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadCliente();
  }, [resolvedParams.id, toast]);

  // Busca CEP via API ViaCEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '');
    setCep(rawCep);

    if (rawCep.length === 8) {
      try {
        toast({
          title: 'Consultando CEP',
          description: `Buscando endereço para o CEP ${rawCep}...`
        });
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || '');
          toast({
            title: 'Endereço Encontrado',
            description: 'Campos de localização preenchidos automaticamente.',
            variant: 'success'
          });
        } else {
          toast({
            title: 'CEP não encontrado',
            description: 'Por favor, digite o endereço manualmente.',
            variant: 'error'
          });
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cpfCnpj) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Por favor, preencha o Nome e o CPF/CNPJ.',
        variant: 'error'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi(`/clientes/${resolvedParams.id}`, {
        method: 'PUT',
        body: {
          nome,
          tipo,
          cpf_cnpj: cpfCnpj,
          email: email || null,
          telefone: telefone || null,
          logradouro: logradouro || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          uf: uf || null,
          cep: cep || null
        }
      });

      if (res.sucesso) {
        toast({
          title: 'Cadastro Sincronizado',
          description: `Os dados do cliente "${nome}" foram atualizados com sucesso.`,
          variant: 'success'
        });
        router.push('/clientes');
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err.message || 'Houve uma falha ao atualizar o cliente.',
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

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Botão de Voltar */}
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
          Editar Cliente
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Modifique os dados cadastrais ou o endereço do paciente selecionado.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Seção 1: Identificação Básica */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <User className="h-5 w-5 text-sky-500" />
              Identificação Básica
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-3">
              
              {/* Nome Completo */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nome Completo / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo do paciente"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Tipo (PF ou PJ) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tipo de Tomador
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="PF">Pessoa Física (CPF)</option>
                  <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                </select>
              </div>

              {/* Documento (CPF / CNPJ) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Documento (Somente dígitos)
                </label>
                <input
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
                  placeholder={tipo === 'PJ' ? 'CNPJ sem pontos' : 'CPF sem pontos'}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  E-mail de Contato
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@dominio.com"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(51) 99999-9999"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Seção 2: Localização e Endereço */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <MapPin className="h-5 w-5 text-sky-500" />
              Localização (Endereço)
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-4">
              
              {/* CEP (ViaCEP automatizado) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  CEP
                </label>
                <input
                  type="text"
                  value={cep}
                  onChange={handleCepChange}
                  maxLength={8}
                  placeholder="90000000"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                />
              </div>

              {/* Logradouro */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Logradouro (Rua/Av)
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua da Praia"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Número */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Número
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Complemento */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto 402, Bloco B"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Bairro */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bairro
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Centro"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Porto Alegre"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* UF */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  UF
                </label>
                <input
                  type="text"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="RS"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                />
              </div>

            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Link
              href="/clientes"
              className="rounded-xl border border-slate-200 hover:bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 transition dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
