const { getTenantClient, supabaseAdmin } = require('../config/supabase');
const { getNextDPSNumber } = require('../services/numbering');
const { enqueueEmission } = require('../queues/queueService');
const { generateDPSXml } = require('../services/fiscal/xml/dpsGenerator');
const { signDPSXml, extractCredentialsFromP12 } = require('../utils/xmlSigner');
const { decrypt } = require('../utils/crypto');
const { enviarDPS } = require('../services/fiscal/serproService');
const env = require('../config/env');

/**
 * Rota POST /homologacao/testar
 * Testa a geração, assinatura e envio de uma DPS fictícia no ambiente de homologação.
 */
async function testHomologacao(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    // 1. Valida o usuário e escopa a consulta através de RLS do Supabase
    const tenantClient = getTenantClient(authHeader);
    const { data: { user }, error: authError } = await tenantClient.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ sucesso: false, mensagem: 'Token JWT inválido ou expirado.' });
    }

    const userId = user.id;

    // 2. Busca o perfil do psicólogo no banco (respeitando RLS)
    const { data: perfil, error: perfilError } = await tenantClient
      .from('perfis_psicologos')
      .select('*')
      .single();

    if (perfilError || !perfil) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Perfil do psicólogo não encontrado. É necessário cadastrar os dados do emitente antes de testar.' 
      });
    }

    let pfxBuffer;
    let senhaDecriptada;

    // 3. Obtém o certificado digital A1
    if (env.MOCK_FISCAL_API && !perfil.certificado_a1_path) {
      // Em modo Mock, se o usuário não subiu o certificado, simulamos um de teste para prosseguir
      console.log('[Controller] Usando certificado A1 simulado (Mock Mode)');
      pfxBuffer = Buffer.from('MOCK_PFX_CERTIFICATE_BUFFER_DATA');
      senhaDecriptada = 'senha_teste_123';
    } else {
      if (!perfil.certificado_a1_path) {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: 'Certificado digital A1 não configurado no perfil.' 
        });
      }

      // Download do certificado privado do storage
      const { data: certData, error: certError } = await supabaseAdmin.storage
        .from('certificados-a1')
        .download(perfil.certificado_a1_path);

      if (certError || !certData) {
        return res.status(500).json({ 
          sucesso: false, 
          mensagem: `Falha ao carregar arquivo de certificado A1 do Storage: ${certError?.message}` 
        });
      }

      pfxBuffer = Buffer.from(await certData.arrayBuffer());
      senhaDecriptada = decrypt(perfil.certificado_senha_key);
    }

    // 4. Gera o XML de DPS fake no ambiente de homologação (tpAmb = 2)
    const fakeDpsNumber = 999999;
    const xmlBase = generateDPSXml({
      cnpjEmitente: perfil.cnpj,
      imEmitente: perfil.im,
      dpsNumber: fakeDpsNumber,
      tomadorDocumento: '00000000000', // CPF genérico para homologação
      tomadorNome: 'CLIENTE TESTE HOMOLOGACAO',
      valorServico: 150.00,
      ambiente: 2 // Homologação
    });

    let xmlAssinado;
    let credentials = { privateKeyPem: 'MOCK_KEY', certPem: 'MOCK_CERT' };

    // 5. Assina o XML DPS
    if (env.MOCK_FISCAL_API && pfxBuffer.toString() === 'MOCK_PFX_CERTIFICATE_BUFFER_DATA') {
      xmlAssinado = xmlBase.replace(
        '</infDPS>',
        '</infDPS><Signature><SignedInfo><SignatureValue>MOCK_SIGNATURE</SignatureValue></SignedInfo></Signature>'
      );
    } else {
      credentials = extractCredentialsFromP12(pfxBuffer, senhaDecriptada);
      xmlAssinado = signDPSXml(xmlBase, credentials.privateKeyPem, credentials.certPem);
    }

    // 6. Envia para o Serpro (ou simula retorno)
    const resultado = await enviarDPS(xmlAssinado, credentials.privateKeyPem, credentials.certPem);

    return res.status(200).json({
      sucesso: true,
      ambiente: 'homologacao',
      mensagem: 'Teste de homologação concluído com sucesso.',
      detalhes: resultado.mensagem,
      protocolo: resultado.protocolo,
      chave_acesso: resultado.chave_acesso,
      xml_gerado: xmlAssinado
    });

  } catch (error) {
    console.error('[Controller] Erro na rota de teste de homologação:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: `Falha ao testar homologação: ${error.message}` 
    });
  }
}

/**
 * Rota POST /emitir
 * Gera uma DPS real baseada no cliente fornecido e insere na fila de processamento.
 * Recebe: { valor, cliente_id }
 */
async function emitirNfse(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    // 1. Valida o usuário logado via Supabase Auth
    const tenantClient = getTenantClient(authHeader);
    const { data: { user }, error: authError } = await tenantClient.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ sucesso: false, mensagem: 'Token JWT inválido ou expirado.' });
    }

    const userId = user.id;
    const { valor, cliente_id } = req.body;

    // 2. Validações básicas de payload
    if (!valor || isNaN(valor) || Number(valor) <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "valor" é obrigatório e deve ser maior que zero.' });
    }
    if (!cliente_id) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "cliente_id" é obrigatório para emissão.' });
    }

    // 3. Busca automaticamente o cliente no Supabase sob o contexto de segurança RLS do inquilino
    const { data: cliente, error: clienteError } = await tenantClient
      .from('clientes')
      .select('*')
      .eq('id', cliente_id)
      .maybeSingle();

    if (clienteError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao consultar dados do cliente: ${clienteError.message}` });
    }

    if (!cliente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Cliente não encontrado ou você não possui permissão para emitir notas para este cliente_id.' 
      });
    }

    // 4. Garante o próximo número DPS de forma segura usando SELECT FOR UPDATE no Postgres
    let proximoNumero;
    try {
      proximoNumero = await getNextDPSNumber(userId);
    } catch (err) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Erro ao gerar número DPS. Certifique-se de que o seu perfil de psicólogo está criado e ativo no banco.' 
      });
    }

    // 5. Cria o registro da nota fiscal herdando os dados do cliente selecionado
    const { data: notaFiscal, error: dbError } = await tenantClient
      .from('notas_fiscais')
      .insert({
        user_id: userId,
        numero_dps: proximoNumero,
        status: 'fila',
        valor: Number(valor),
        tomador_nome: cliente.nome,
        tomador_documento: cliente.cpf_cnpj
      })
      .select()
      .single();

    if (dbError || !notaFiscal) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao criar nota fiscal no banco: ${dbError?.message}` });
    }

    // 6. Agenda a emissão assíncrona empurrando para a fila do banco
    await enqueueEmission(notaFiscal.id, userId);

    return res.status(202).json({
      sucesso: true,
      mensagem: 'Emissão de NFS-e iniciada. O processo foi enviado para a fila de processamento assíncrono.',
      nota_id: notaFiscal.id,
      numero_dps: proximoNumero,
      status: 'processando'
    });

  } catch (error) {
    console.error('[Controller] Erro na rota de emissão de nota:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: `Falha ao processar emissão de NFS-e: ${error.message}` 
    });
  }
}

/**
 * Rota GET /perfil
 * Retorna o perfil do psicólogo autenticado (Isolado via RLS)
 */
async function obterPerfil(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { data: perfil, error } = await tenantClient
      .from('perfis_psicologos')
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao consultar perfil: ${error.message}` });
    }

    return res.status(200).json({ sucesso: true, perfil });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error.message });
  }
}

/**
 * Rota POST/PUT /perfil
 * Cria ou atualiza o perfil do psicólogo autenticado (Isolado via RLS)
 */
async function salvarPerfil(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { data: { user }, error: authError } = await tenantClient.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ sucesso: false, mensagem: 'JWT inválido ou expirado.' });
    }

    const userId = user.id;
    const { nome, cpf, cnpj, im, certificado_a1_path, certificado_senha_key } = req.body;

    const { data: perfil, error } = await tenantClient
      .from('perfis_psicologos')
      .upsert({
        user_id: userId,
        nome: nome?.trim(),
        cpf: cpf?.replace(/\D/g, ''),
        cnpj: cnpj?.replace(/\D/g, ''),
        im: im?.trim(),
        certificado_a1_path: certificado_a1_path || null,
        certificado_senha_key: certificado_senha_key || null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao salvar perfil: ${error.message}` });
    }

    return res.status(200).json({ sucesso: true, mensagem: 'Perfil salvo com sucesso.', perfil });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error.message });
  }
}

/**
 * Rota GET /notas
 * Lista todas as notas fiscais do inquilino logado (Isolado via RLS)
 */
async function listarNotas(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { data: notas, error } = await tenantClient
      .from('notas_fiscais')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao consultar notas: ${error.message}` });
    }

    return res.status(200).json({ sucesso: true, notas });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error.message });
  }
}

/**
 * Rota GET /notas/:id
 * Detalhes de uma nota fiscal específica (Isolado via RLS)
 */
async function obterNota(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { id } = req.params;

    const { data: nota, error } = await tenantClient
      .from('notas_fiscais')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao obter nota: ${error.message}` });
    }

    if (!nota) {
      return res.status(404).json({ sucesso: false, mensagem: 'Nota fiscal não encontrada ou sem permissão.' });
    }

    return res.status(200).json({ sucesso: true, nota });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error.message });
  }
}

module.exports = {
  testHomologacao,
  emitirNfse,
  obterPerfil,
  salvarPerfil,
  listarNotas,
  obterNota
};
