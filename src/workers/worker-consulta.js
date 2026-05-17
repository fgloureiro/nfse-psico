const { supabaseAdmin } = require('../config/supabase');
const { consultarNFSe } = require('../services/fiscal/serproService');
const { extractCredentialsFromP12 } = require('../utils/xmlSigner');
const { decrypt } = require('../utils/crypto');
const { generateDanfsePdf } = require('../services/pdfService');
const env = require('../config/env');

let consultaRunning = false;

/**
 * Loop principal do Worker de Consulta de NFS-e Assíncronas.
 * Busca notas fiscais pendentes de autorização na SEFAZ/Serpro.
 */
async function processarConsultasFila() {
  if (consultaRunning) return;
  consultaRunning = true;

  try {
    // 1. Seleciona notas com status 'processando' (que foram submetidas mas aguardam retorno)
    const { data: notasPendentes, error: dbError } = await supabaseAdmin
      .from('notas_fiscais')
      .select('*')
      .eq('status', 'processando')
      .limit(10); // Processa em lotes de no máximo 10 notas por rodada

    if (dbError) {
      throw new Error(`Erro ao buscar notas pendentes de consulta no banco: ${dbError.message}`);
    }

    if (!notasPendentes || notasPendentes.length === 0) {
      consultaRunning = false;
      return; // Nada para consultar, encerra rodada
    }

    console.log(`[Worker Consulta] Encontrada(s) ${notasPendentes.length} nota(s) em processamento assíncrono para verificar.`);

    for (const nota of notasPendentes) {
      const { id: notaId, user_id: userId, protocolo, numero_dps } = nota;
      
      try {
        console.log(`[Worker Consulta] Consultando situação da nota ${notaId} (Protocolo: ${protocolo})...`);

        if (!protocolo) {
          throw new Error('Nota em processamento sem protocolo de consulta registrado.');
        }

        // 2. Busca o perfil do psicólogo emitente
        const { data: perfil, error: perfilError } = await supabaseAdmin
          .from('perfis_psicologos')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (perfilError || !perfil) {
          throw new Error(`Perfil do psicólogo emitente não encontrado para o usuário ${userId}.`);
        }

        // 3. Obtém o certificado digital
        let pfxBuffer;
        let senhaDecriptada;

        if (env.MOCK_FISCAL_API && !perfil.certificado_a1_path) {
          pfxBuffer = Buffer.from('MOCK_PFX_CERTIFICATE_BUFFER_DATA');
          senhaDecriptada = 'senha_teste_123';
        } else {
          if (!perfil.certificado_a1_path) {
            throw new Error('Certificado digital A1 não configurado no perfil.');
          }

          const { data: certData, error: certError } = await supabaseAdmin.storage
            .from('certificados-a1')
            .download(perfil.certificado_a1_path);

          if (certError || !certData) {
            throw new Error(`Erro ao baixar certificado A1 do Storage: ${certError.message}`);
          }

          pfxBuffer = Buffer.from(await certData.arrayBuffer());
          senhaDecriptada = decrypt(perfil.certificado_senha_key);
        }

        let credentials = { privateKeyPem: 'MOCK_KEY', certPem: 'MOCK_CERT' };
        if (!(env.MOCK_FISCAL_API && pfxBuffer.toString() === 'MOCK_PFX_CERTIFICATE_BUFFER_DATA')) {
          credentials = extractCredentialsFromP12(pfxBuffer, senhaDecriptada);
        }

        // 4. Efetua a consulta de situação no Serpro
        const consulta = await consultarNFSe(protocolo, credentials.privateKeyPem, credentials.certPem);
        const baseStoragePath = `${userId}/${notaId}`;

        if (consulta.status === 'autorizada') {
          // --- NOTA FOI AUTORIZADA NA SEFAZ ---
          console.log(`[Worker Consulta] Sucesso! Nota ${notaId} foi autorizada.`);

          // A. Salva o XML retornado no Storage
          const xmlPath = `${baseStoragePath}_nfse.xml`;
          const xmlContent = consulta.xml_retorno || `<xmlMockAutorizado><chNFSe>${consulta.chave_acesso}</chNFSe></xmlMockAutorizado>`;
          
          await supabaseAdmin.storage
            .from('nfse-arquivos')
            .upload(xmlPath, Buffer.from(xmlContent), {
              contentType: 'text/xml',
              upsert: true
            });

          // B. Desenha o PDF da DANFSE
          const pdfBuffer = await generateDanfsePdf({
            numeroDps: numero_dps,
            prestadorNome: perfil.nome,
            prestadorCnpj: perfil.cnpj,
            prestadorIm: perfil.im,
            tomadorNome: nota.tomador_nome,
            tomadorDocumento: nota.tomador_documento,
            valorTotal: nota.valor,
            descricaoServico: 'PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA CLÍNICA E PSICOTERAPIA.',
            chaveAcesso: consulta.chave_acesso,
            protocolo: protocolo,
            dataEmissao: new Date().toISOString()
          });

          // C. Salva o PDF gerado no Storage
          const pdfPath = `${baseStoragePath}_danfse.pdf`;
          await supabaseAdmin.storage
            .from('nfse-arquivos')
            .upload(pdfPath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          // D. Atualiza os dados da nota no banco de dados para 'autorizada'
          await supabaseAdmin
            .from('notas_fiscais')
            .update({
              status: 'autorizada',
              nfse_path: xmlPath,
              pdf_path: pdfPath,
              chave_acesso: consulta.chave_acesso,
              data_emissao: new Date().toISOString(),
              erro_mensagem: null
            })
            .eq('id', notaId);

        } else if (consulta.status === 'rejeitada') {
          // --- NOTA REJEITADA OU COM ERRO NA SEFAZ ---
          console.warn(`[Worker Consulta] Atenção: Nota ${notaId} foi rejeitada pelo Fisco.`);

          await supabaseAdmin
            .from('notas_fiscais')
            .update({
              status: 'rejeitada',
              erro_mensagem: consulta.mensagem || 'Rejeição genérica reportada pelo fisco.'
            })
            .eq('id', notaId);
        } else {
          // --- NOTA CONTINUA EM PROCESSAMENTO ---
          console.log(`[Worker Consulta] Nota ${notaId} continua em processamento. Tentará novamente na próxima execução.`);
        }

      } catch (notaError) {
        console.error(`[Worker Consulta] Erro ao processar consulta individual da nota ${notaId}:`, notaError.message);
        // Atualiza a nota com erro informativo temporário para facilitar o monitoramento
        await supabaseAdmin
          .from('notas_fiscais')
          .update({
            erro_mensagem: `Erro na última tentativa de consulta: ${notaError.message}`
          })
          .eq('id', notaId);
      }
    }

  } catch (globalError) {
    console.error('[Worker Consulta] Erro crítico no loop do worker de consulta:', globalError.message);
  } finally {
    consultaRunning = false;
  }
}

/**
 * Inicializa o loop contínuo do worker de consulta
 */
function iniciarWorkerConsulta() {
  console.log('[Worker Consulta] Inicializado e monitorando notas em processamento...');
  // Roda a cada 15 segundos para evitar sobrecarga ou rate limits da API governamental
  setInterval(processarConsultasFila, 15000);
}

// Inicializa automaticamente se executado de forma direta via terminal
if (require.main === module) {
  iniciarWorkerConsulta();
}

module.exports = {
  iniciarWorkerConsulta,
  processarConsultasFila
};
