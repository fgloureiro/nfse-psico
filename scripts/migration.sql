-- =====================================================================
-- MIGRATION: CONFIGURAÇÃO DE BANCO DE DADOS PARA EMISSÃO DE NFS-E NACIONAL
-- OTIMIZADO PARA PSICÓLOGOS DE PORTO ALEGRE (CNAE 8610103, CÓD. NACIONAL 01.07)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Criação das Tabelas Principais
-- ---------------------------------------------------------------------

-- Tabela: perfis_psicologos
CREATE TABLE IF NOT EXISTS public.perfis_psicologos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    nome TEXT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    im VARCHAR(20) NOT NULL,
    certificado_a1_path TEXT,
    certificado_senha_key TEXT, -- Senha criptografada (salva no Vault/Crypto)
    ultimo_numero_dps INTEGER NOT NULL DEFAULT 0,
    homologacao_liberada BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: notas_fiscais
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_dps INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'rascunho', -- rascunho, fila, processando, autorizada, rejeitada, cancelada, erro
    dps_path TEXT,
    nfse_path TEXT,
    pdf_path TEXT,
    chave_acesso VARCHAR(44),
    protocolo VARCHAR(100),
    data_emissao TIMESTAMP WITH TIME ZONE,
    valor NUMERIC(15, 2) NOT NULL,
    tomador_nome TEXT NOT NULL,
    tomador_documento VARCHAR(14) NOT NULL,
    erro_mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: fila_emissao (pgmq - fila de mensagens baseada em banco)
CREATE TABLE IF NOT EXISTS public.fila_emissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- pendente, processando, erro, concluido
    tentativas INTEGER NOT NULL DEFAULT 0,
    erro_mensagem TEXT,
    proxima_execucao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. Habilitando o Row Level Security (RLS)
-- ---------------------------------------------------------------------
ALTER TABLE public.perfis_psicologos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_emissao ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. Políticas RLS para Multi-tenant (Isolamento por user_id)
-- ---------------------------------------------------------------------

-- Políticas para: perfis_psicologos
CREATE POLICY "perfis_psicologos_select_policy" ON public.perfis_psicologos
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "perfis_psicologos_insert_policy" ON public.perfis_psicologos
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "perfis_psicologos_update_policy" ON public.perfis_psicologos
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "perfis_psicologos_delete_policy" ON public.perfis_psicologos
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para: notas_fiscais
CREATE POLICY "notas_fiscais_select_policy" ON public.notas_fiscais
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notas_fiscais_insert_policy" ON public.notas_fiscais
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notas_fiscais_update_policy" ON public.notas_fiscais
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notas_fiscais_delete_policy" ON public.notas_fiscais
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para: fila_emissao
CREATE POLICY "fila_emissao_select_policy" ON public.fila_emissao
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "fila_emissao_insert_policy" ON public.fila_emissao
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fila_emissao_update_policy" ON public.fila_emissao
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fila_emissao_delete_policy" ON public.fila_emissao
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. Função Transacional de Controle de Numeração (Lock para evitar duplicidade)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.obter_proximo_numero_dps(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_proximo_numero INTEGER;
BEGIN
    -- Realiza o SELECT FOR UPDATE para lockar a linha do psicólogo e evitar concorrência
    SELECT (ultimo_numero_dps + 1)
    INTO v_proximo_numero
    FROM public.perfis_psicologos
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Se não encontrar o perfil, lança uma exceção
    IF v_proximo_numero IS NULL THEN
        RAISE EXCEPTION 'Perfil do psicólogo não encontrado para o ID fornecido.';
    END IF;

    -- Atualiza o último número DPS no perfil
    UPDATE public.perfis_psicologos
    SET ultimo_numero_dps = v_proximo_numero,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;

    RETURN v_proximo_numero;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 5. Função Transacional para Processar Fila (FOR UPDATE SKIP LOCKED)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.processar_proximos_fila(p_limite INTEGER)
RETURNS TABLE (
    id UUID,
    nota_id UUID,
    user_id UUID,
    tentativas INTEGER,
    proxima_execucao TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.fila_emissao f
    SET status = 'processando',
        updated_at = timezone('utc'::text, now())
    FROM (
        SELECT f2.id
        FROM public.fila_emissao f2
        WHERE f2.status IN ('pendente', 'erro')
          AND f2.tentativas < 5
          AND f2.proxima_execucao <= timezone('utc'::text, now())
        ORDER BY f2.proxima_execucao ASC, f2.created_at ASC
        LIMIT p_limite
        FOR UPDATE SKIP LOCKED -- Evita concorrência entre instâncias paralelizáveis de workers!
    ) sub
    WHERE f.id = sub.id
    RETURNING f.id, f.nota_id, f.user_id, f.tentativas, f.proxima_execucao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 6. Configuração dos Buckets de Armazenamento no Supabase
-- ---------------------------------------------------------------------

-- Insere as configurações dos buckets se não existirem
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('certificados-a1', 'certificados-a1', false, 5242880, '{"application/x-pkcs12", "application/octet-stream"}'),
  ('nfse-arquivos', 'nfse-arquivos', false, 10485760, '{"text/xml", "application/xml", "application/pdf"}')
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para o bucket: certificados-a1 (Privado por user_id)
CREATE POLICY "Permitir upload de certificado próprio" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'certificados-a1' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Permitir leitura de certificado próprio" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'certificados-a1' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Permitir exclusão de certificado próprio" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'certificados-a1' AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Políticas de RLS para o bucket: nfse-arquivos (Privado por user_id)
CREATE POLICY "Permitir upload de arquivos de notas próprios" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'nfse-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Permitir leitura de arquivos de notas próprios" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'nfse-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Permitir exclusão de arquivos de notas próprios" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'nfse-arquivos' AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------------------
-- 7. Triggers de Atualização de Timestamp (Updated_at)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.atualizar_coluna_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_perfis_psicologos
    BEFORE UPDATE ON public.perfis_psicologos
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_updated_at();

CREATE TRIGGER trigger_update_notas_fiscais
    BEFORE UPDATE ON public.notas_fiscais
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_updated_at();

CREATE TRIGGER trigger_update_fila_emissao
    BEFORE UPDATE ON public.fila_emissao
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_coluna_updated_at();
