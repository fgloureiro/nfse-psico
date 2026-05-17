const { supabaseAdmin } = require('../config/supabase');
const { dequeueEmission, completeJob, failJob } = require('../queues/queueService');
const { generateDPSXml } = require('../services/fiscal/xml/dpsGenerator');
const { signDPSXml, extractCredentialsFromP12 } = require('../utils/xmlSigner');
const { decrypt } = require('../utils/crypto');
const { enviarDPS } = require('../services/fiscal/serproService');
const { generateDanfsePdf } = require('../services/pdfService');
const env = require('../config/env');

let workerRunning = false;

/**
 * Loop principal do Worker de Emissão.
 * Executado continuamente para processar itens da fila de mensagens.
 */
async function processarFilaEmissao() {
  if (workerRunning) return;
  workerRunning = true;

  try {
    // 1. Pede e locka de forma segura a próxima tarefa pendente na fila (FOR UPDATE SKIP LOCKED)
    const jobs = await dequeueEmission(1);
    if (jobs.length === 0) {
      workerRunning = false;
      return; // Fila vazia, encerra a iteração
    }

    const job = jobs[0];
    const { id: queueId, nota_id: notaId, user_id: userId, tentativas } = job;
    
    console.log(`[Worker Emissão] Iniciando processamento da nota ${notaId} (Tentativa: ${tentativas + 1})`);

    try {
      // 2. Busca os dados reais da nota fiscal
      const { data: nota, error: notaError } = await supabaseAdmin
        .from('notas_fiscais')
        .select('*')
        .eq('id', notaId)
        .single();

      if (notaError || !nota) {
        throw new Error(`Nota fiscal ${notaId} não encontrada no banco de dados.`);
      }

      // 3. Busca o perfil do psicólogo emitente
      const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('perfis_psicologos')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (perfilError || !perfil) {
        throw new Error(`Perfil do psicólogo emitente para o usuário ${userId} não encontrado.`);
      }

      // 4. Carrega e decripta o certificado digital
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

      // 5. Gera o XML da DPS real (ambiente configurado pelo usuário ou homologação por padrão se não liberada)
      const ambiente = perfil.homologacao_liberada ? 1 : 2; 
      const xmlBase = generateDPSXml({
        cnpjEmitente: perfil.cnpj,
        imEmitente: perfil.im,
        dpsNumber: nota.numero_dps,
        tomadorDocumento: nota.tomador_documento,
        tomadorNome: nota.tomador_nome,
        valorServico: nota.valor,
        ambiente: ambiente
      });

      let xmlAssinado;
      let credentials = { privateKeyPem: 'MOCK_KEY', certPem: 'MOCK_CERT' };

      // 6. Assina digitalmente o XML da DPS
      if (env.MOCK_FISCAL_API && pfxBuffer.toString() === 'MOCK_PFX_CERTIFICATE_BUFFER_DATA') {
        xmlAssinado = xmlBase.replace(
          '</infDPS>',
          '</infDPS><Signature><SignedInfo><SignatureValue>MOCK_SIGNATURE_DATA</SignatureValue></SignedInfo></Signature>'
        );
      } else {
        credentials = extractCredentialsFromP12(pfxBuffer, senhaDecriptada);
        xmlAssinado = signDPSXml(xmlBase, credentials.privateKeyPem, credentials.certPem);
      }

      // 7. Envia para a API do Serpro / NFS-e Nacional
      const resultado = await enviarDPS(xmlAssinado, credentials.privateKeyPem, credentials.certPem);

      // Caminhos de arquivos estruturados organizados por ID de inquilino para garantir privacidade absoluta no Storage
      const baseStoragePath = `${userId}/${notaId}`;

      if (resultado.status === 'autorizada') {
        // --- PROCESSO SÍNCRONO OU AUTORIZADO DE IMEDIATO ---
        console.log(`[Worker Emissão] Nota ${notaId} autorizada de imediato!`);

        // A. Salva o XML assinado completo no storage
        const xmlPath = `${baseStoragePath}_nfse.xml`;
        const { error: xmlUploadError } = await supabaseAdmin.storage
          .from('nfse-arquivos')
          .upload(xmlPath, Buffer.from(xmlAssinado), {
            contentType: 'text/xml',
            upsert: true
          });

        if (xmlUploadError) throw new Error(`Erro ao fazer upload do XML autorizado para o Storage: ${xmlUploadError.message}`);

        // B. Gera e desenha o PDF da DANFSE
        const pdfBuffer = await generateDanfsePdf({
          numeroDps: nota.numero_dps,
          prestadorNome: perfil.nome,
          prestadorCnpj: perfil.cnpj,
          prestadorIm: perfil.im,
          tomadorNome: nota.tomador_nome,
          tomadorDocumento: nota.tomador_documento,
          valorTotal: nota.valor,
          descricaoServico: 'PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA CLÍNICA E PSICOTERAPIA.',
          chaveAcesso: resultado.chave_acesso,
          protocolo: resultado.protocolo,
          dataEmissao: new Date().toISOString()
        });

        // C. Salva o PDF no storage
        const pdfPath = `${baseStoragePath}_danfse.pdf`;
        const { error: pdfUploadError } = await supabaseAdmin.storage
          .from('nfse-arquivos')
          .upload(pdfPath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (pdfUploadError) throw new Error(`Erro ao fazer upload do PDF da nota para o Storage: ${pdfUploadError.message}`);

        // D. Atualiza o registro da nota fiscal no banco
        const { error: updateDbError } = await supabaseAdmin
          .from('notas_fiscais')
          .update({
            status: 'autorizada',
            dps_path: `${baseStoragePath}_dps_assinado.xml`, // Opcional, salva onde foi o DPS
            nfse_path: xmlPath,
            pdf_path: pdfPath,
            chave_acesso: resultado.chave_acesso,
            protocolo: resultado.protocolo,
            data_emissao: new Date().toISOString(),
            erro_mensagem: null
          })
          .eq('id', notaId);

        if (updateDbError) throw new Error(`Erro ao atualizar dados da nota fiscal autorizada no banco: ${updateDbError.message}`);

      } else {
        // --- PROCESSO ASSÍNCRONO EM PROCESSAMENTO ---
        console.log(`[Worker Emissão] Nota ${notaId} foi recebida e está em processamento assíncrono no Serpro.`);

        // A. Salva a DPS assinada no storage para auditoria
        const dpsPath = `${baseStoragePath}_dps_assinado.xml`;
        await supabaseAdmin.storage
          .from('nfse-arquivos')
          .upload(dpsPath, Buffer.from(xmlAssinado), {
            contentType: 'text/xml',
            upsert: true
          });

        // B. Atualiza o banco para processando e guarda o protocolo de consulta
        await supabaseAdmin
          .from('notas_fiscais')
          .update({
            status: 'processando',
            dps_path: dpsPath,
            protocolo: resultado.protocolo,
            erro_mensagem: null
          })
          .eq('id', notaId);
      }

      // 8. Marca o job na fila como concluído com sucesso
      await completeJob(queueId);

    } catch (jobError) {
      console.error(`[Worker Emissão] Erro ao processar nota específica ${notaId}:`, jobError.message);
      
      // Controla limite de retentativas
      if (tentativas >= 4) {
        // Se já bateu 5 tentativas fracassadas, falha a nota fiscal permanentemente no banco
        await supabaseAdmin
          .from('notas_fiscais')
          .update({
            status: 'erro',
            erro_mensagem: `Falha permanente na emissão após 5 tentativas: ${jobError.message}`
          })
          .eq('id', notaId);
      }
      
      // Registra a falha na fila para reagendamento com backoff
      await failJob(queueId, jobError.message, tentativas);
    }

  } catch (globalError) {
    console.error('[Worker Emissão] Erro crítico global no loop do worker de emissão:', globalError.message);
  } finally {
    workerRunning = false;
  }
}

/**
 * Inicializa o loop contínuo do worker de emissão
 */
function iniciarWorkerEmissao() {
  console.log('[Worker Emissão] Iniciado e escutando a fila fila_emissao...');
  // Roda a cada 5 segundos buscando novos trabalhos
  setInterval(processarFilaEmissao, 5000);
}

// Inicializa automaticamente se executado de forma direta via terminal
if (require.main === module) {
  iniciarWorkerEmissao();
}

module.exports = {
  iniciarWorkerEmissao,
  processarFilaEmissao
};
