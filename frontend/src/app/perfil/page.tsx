'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { 
  UserCircle, 
  Building2, 
  FileCheck2, 
  Activity, 
  Lock, 
  Save, 
  Check, 
  AlertTriangle,
  PlayCircle
} from 'lucide-react';

interface Perfil {
  nome: string;
  cpf: string;
  cnpj: string;
  im: string;
  certificado_a1_path?: string;
  certificado_senha_key?: string;
}

export default function PerfilPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [im, setIm] = useState('');
  const [certificadoSenha, setCertificadoSenha] = useState('');
  
  // Resultado do teste de homologação
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadPerfil() {
      try {
        setLoading(true);
        const res = await fetchApi('/perfil');
        if (res.sucesso && res.perfil) {
          const p: Perfil = res.perfil;
          setNome(p.nome || '');
          setCpf(p.cpf || '');
          setCnpj(p.cnpj || '');
          setIm(p.im || '');
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar dados',
          description: err.message || 'Não foi possível carregar as configurações do perfil.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    loadPerfil();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cpf || !cnpj || !im) {
      toast({
        title: 'Dados Incompletos',
        description: 'Nome, CPF, CNPJ e Inscrição Municipal são obrigatórios.',
        variant: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetchApi('/perfil', {
        method: 'POST',
        body: {
          nome,
          cpf,
          cnpj,
          im,
          certificado_senha_key: certificadoSenha || undefined
        }
      });

      if (res.sucesso) {
        toast({
          title: 'Perfil Sincronizado',
          description: 'Dados salvos e atualizados com sucesso.',
          variant: 'success'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar',
        description: err.message || 'Ocorreu um erro ao salvar o perfil.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestarHomologacao = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchApi('/homologacao/testar', {
        method: 'POST'
      });

      if (res.sucesso) {
        setTestResult(res);
        toast({
          title: 'Conexão Estabelecida',
          description: 'XML DPS gerado, assinado e validado com sucesso na SEFAZ Nacional!',
          variant: 'success'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro de Validação Fiscal',
        description: err.message || 'Falha ao homologar. Verifique sua chave de certificado e as credenciais.',
        variant: 'error'
      });
    } finally {
      setTesting(false);
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
      
      {/* Header do Perfil */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configuração do Emitente
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gerencie suas credenciais fiscais de Psicólogo de Porto Alegre (CNAE 8610103, Código Nacional 01.07).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Formulário Principal (Esquerda - 2 colunas no desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* Nome Completo */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nome Completo / Razão Social
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <UserCircle className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Dr. Psicólogo Loureiro"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    CPF (Emitente)
                  </label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    CNPJ (Emitente)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Inscrição Municipal (IM) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Inscrição Municipal (IM)
                  </label>
                  <input
                    type="text"
                    required
                    value={im}
                    onChange={(e) => setIm(e.target.value)}
                    placeholder="Inscrição municipal de Porto Alegre"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* Senha do Certificado Digital */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Senha do Certificado A1
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={certificadoSenha}
                      onChange={(e) => setCertificadoSenha(e.target.value)}
                      placeholder="Senha do arquivo PFX"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

              </div>

              {/* Botão de Salvar (Premium touch hitbox) */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-sm font-bold text-white shadow-lg shadow-sky-500/10 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Salvar Cadastro
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Bloco de Ações e Validação Fiscal (Direita - 1 coluna) */}
        <div className="space-y-6">
          
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-sky-500" />
              Homologação Municipal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Você pode enviar uma DPS em ambiente de teste para validar se o Certificado A1 está assinando o XML corretamente de acordo com os padrões da SEFAZ Nacional e do SERPRO.
            </p>

            <button
              onClick={handleTestarHomologacao}
              disabled={testing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-50 py-3.5 px-4 text-sm font-bold text-sky-700 active:scale-[0.98] transition disabled:opacity-50 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-400"
            >
              {testing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent dark:border-sky-400"></div>
                  Assinando e Transmitindo...
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  Testar Homologação
                </>
              )}
            </button>
          </div>

          {/* Dica de Segurança */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
            <h4 className="font-bold text-slate-700 dark:text-slate-350">Criptografia Forte</h4>
            <p>Seu certificado digital A1 (.pfx) é guardado com criptografia forte AES-256 de grau bancário. Nem mesmo os administradores da plataforma conseguem ler a senha descriptografada sem o seu Bearer JWT.</p>
          </div>

        </div>

      </div>

      {/* Resultado do Teste de Homologação */}
      {testResult && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-slide-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Resultado do Teste Fiscal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Faturamento Simulado (tpAmb = 2 - Homologação)</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50">
              <Check className="h-3 w-3" /> Transmitida com Sucesso
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Protocolo</span>
              <p className="font-bold font-mono mt-1 text-slate-900 dark:text-white">{testResult.protocolo || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl sm:col-span-2">
              <span className="text-xs text-slate-400">Chave de Acesso Municipal</span>
              <p className="font-bold font-mono mt-1 text-slate-900 dark:text-white">{testResult.chave_acesso || 'N/A'}</p>
            </div>
          </div>

          {/* XML Assinado Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">XML Assinado Digitalmente (DSig)</span>
            <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-400 border border-slate-800">
              <pre>{testResult.xml_gerado}</pre>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
