const https = require('https');
const axios = require('axios');
const env = require('../../config/env');

/**
 * Cria um cliente Axios configurado com mTLS (Mutual SSL/TLS) usando as credenciais do certificado A1
 * @param {string} privateKeyPem - Chave privada PEM
 * @param {string} certPem - Certificado PEM
 * @returns {import('axios').AxiosInstance} Cliente Axios instanciado
 */
function getMtlsClient(privateKeyPem, certPem) {
  const agent = new https.Agent({
    key: privateKeyPem,
    cert: certPem,
    rejectUnauthorized: env.NODE_ENV === 'production' // Desativa rejeição estrita em dev/homologação se necessário
  });

  return axios.create({
    baseURL: env.SERPRO_API_URL,
    httpsAgent: agent,
    headers: {
      'Content-Type': 'application/xml',
      'Accept': 'application/xml'
    },
    timeout: 15000 // 15 segundos de timeout
  });
}

/**
 * Envia o XML da DPS assinado para a API do Serpro (ou simula no modo Mock)
 * @param {string} signedXml - XML da DPS assinado com XMLDSig
 * @param {string} privateKeyPem - Chave privada PEM (para mTLS)
 * @param {string} certPem - Certificado PEM (para mTLS)
 * @returns {Promise<{sucesso: boolean, protocolo: string, chave_acesso: string, status: string, xml_retorno?: string, mensagem: string}>}
 */
async function enviarDPS(signedXml, privateKeyPem, certPem) {
  if (env.MOCK_FISCAL_API) {
    console.log('[SerproService] Executando envio de DPS em modo SIMULADO (MOCK)');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simula latência de rede
    
    const randomProtocol = 'PR' + Math.floor(1000000000 + Math.random() * 9000000000);
    // Gera chave de acesso simulada de 44 caracteres (Estado: 43 = RS)
    const randomAccessKey = '43' + Date.now().toString().padEnd(42, '0').substring(0, 42);
    
    // Simula 80% de chance de autorização imediata e 20% de processamento assíncrono para testar a fila de consulta!
    const status = Math.random() > 0.2 ? 'autorizada' : 'processando';

    return {
      sucesso: true,
      protocolo: randomProtocol,
      chave_acesso: randomAccessKey,
      status: status,
      mensagem: status === 'autorizada' 
        ? 'NFS-e emitida e autorizada com sucesso (Simulação).' 
        : 'DPS recebida com sucesso. Processamento assíncrono iniciado (Simulação).',
      xml_retorno: `<retAutorizacao xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
        <tpAmb>2</tpAmb>
        <verAplic>ViggoNFe_1.0</verAplic>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NFS-e</xMotivo>
        <infProt>
          <chNFe>${randomAccessKey}</chNFe>
          <dhProt>${new Date().toISOString()}</dhProt>
          <nProt>${randomProtocol}</nProt>
        </infProt>
      </retAutorizacao>`
    };
  }

  try {
    const client = getMtlsClient(privateKeyPem, certPem);
    console.log('[SerproService] Enviando DPS assinado real via mTLS para Serpro...');
    
    // Endpoint padrão do Serpro / NFS-e Nacional para recepção de DPS
    const response = await client.post('/dps', signedXml);
    
    // Tratamento fictício do XML de retorno da API nacional do Serpro.
    // Em produção, deve-se realizar o parse do XML ou JSON retornado.
    const xmlRetorno = response.data;
    
    // Exemplo genérico de extração de protocolo e chave no padrão nacional
    const protocoloMatch = xmlRetorno.match(/<nProt>([^<]+)<\/nProt>/);
    const chaveMatch = xmlRetorno.match(/<chNFe>([^<]+)<\/chNFe>/);
    const statusMatch = xmlRetorno.match(/<cStat>([^<]+)<\/cStat>/);

    const protocolo = protocoloMatch ? protocoloMatch[1] : 'PR-PENDENTE';
    const chave = chaveMatch ? chaveMatch[1] : '';
    const cStat = statusMatch ? statusMatch[1] : '';

    let status = 'processando';
    if (cStat === '100') {
      status = 'autorizada';
    } else if (['103', '104', '105'].includes(cStat)) {
      status = 'processando';
    } else {
      status = 'rejeitada';
    }

    return {
      sucesso: status !== 'rejeitada',
      protocolo,
      chave_acesso: chave,
      status,
      xml_retorno: xmlRetorno,
      mensagem: status === 'autorizada' ? 'NFS-e autorizada com sucesso.' : 'DPS enviada, aguardando processamento.'
    };
  } catch (error) {
    console.error('[SerproService] Erro ao enviar DPS para o Serpro:', error.response?.data || error.message);
    throw new Error(`Erro na comunicação com a API Nacional da NFS-e: ${error.message}`);
  }
}

/**
 * Consulta o status de uma DPS ou NFS-e enviada anteriormente
 * @param {string} protocolo - Número do protocolo de recebimento da DPS
 * @param {string} privateKeyPem - Chave privada PEM (para mTLS)
 * @param {string} certPem - Certificado PEM (para mTLS)
 * @returns {Promise<{sucesso: boolean, status: string, chave_acesso: string, xml_retorno?: string, mensagem: string}>}
 */
async function consultarNFSe(protocolo, privateKeyPem, certPem) {
  if (env.MOCK_FISCAL_API) {
    console.log(`[SerproService] Executando consulta de protocolo ${protocolo} em modo SIMULADO (MOCK)`);
    await new Promise(resolve => setTimeout(resolve, 600));

    // No modo Mock, a consulta sempre retorna autorizada com sucesso
    const randomAccessKey = '43' + Date.now().toString().padEnd(42, '0').substring(0, 42);

    return {
      sucesso: true,
      status: 'autorizada',
      chave_acesso: randomAccessKey,
      mensagem: 'Consulta realizada. NFS-e autorizada com sucesso (Simulação).',
      xml_retorno: `<retConsSitNFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
        <tpAmb>2</tpAmb>
        <cStat>100</cStat>
        <xMotivo>NFS-e Autorizada</xMotivo>
        <chNFSe>${randomAccessKey}</chNFSe>
      </retConsSitNFSe>`
    };
  }

  try {
    const client = getMtlsClient(privateKeyPem, certPem);
    console.log(`[SerproService] Consultando protocolo ${protocolo} real via mTLS...`);
    
    // Endpoint nacional para consulta de situação da NFS-e
    const response = await client.get(`/dps/${protocolo}`);
    const xmlRetorno = response.data;
    
    const statusMatch = xmlRetorno.match(/<cStat>([^<]+)<\/cStat>/);
    const chaveMatch = xmlRetorno.match(/<chNFSe>([^<]+)<\/chNFSe>/);
    
    const cStat = statusMatch ? statusMatch[1] : '';
    const chave = chaveMatch ? chaveMatch[1] : '';
    
    let status = 'processando';
    if (cStat === '100') {
      status = 'autorizada';
    } else if (cStat === '101' || cStat === '102') {
      status = 'rejeitada';
    }

    return {
      sucesso: status === 'autorizada',
      status,
      chave_acesso: chave,
      xml_retorno: xmlRetorno,
      mensagem: status === 'autorizada' ? 'Consulta concluída: NFS-e Autorizada.' : 'Consulta concluída: NFS-e ainda em processamento.'
    };
  } catch (error) {
    console.error(`[SerproService] Erro ao consultar protocolo ${protocolo}:`, error.response?.data || error.message);
    throw new Error(`Erro ao consultar situação do protocolo na API Nacional: ${error.message}`);
  }
}

module.exports = {
  enviarDPS,
  consultarNFSe
};
