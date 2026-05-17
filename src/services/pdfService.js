const PDFDocument = require('pdfkit');
const xml2js = require('xml2js');

/**
 * Gera o Buffer do PDF de uma DANFSE estruturada de forma profissional
 * @param {Object} data - Dados estruturados da nota fiscal
 * @param {number} data.numeroDps - Número da DPS
 * @param {string} data.prestadorNome - Nome do psicólogo / prestador
 * @param {string} data.prestadorCnpj - CNPJ do psicólogo
 * @param {string} data.prestadorIm - Inscrição Municipal do psicólogo
 * @param {string} data.tomadorNome - Nome do tomador / cliente
 * @param {string} data.tomadorDocumento - CPF/CNPJ do tomador
 * @param {number} data.valorTotal - Valor do serviço
 * @param {string} data.descricaoServico - Descrição detalhada do serviço
 * @param {string} data.chaveAcesso - Chave de acesso de 44 dígitos
 * @param {string} data.protocolo - Protocolo de autorização
 * @param {string} data.dataEmissao - Data e hora de autorização
 * @returns {Promise<Buffer>} Buffer binário do PDF gerado
 */
function generateDanfsePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // -------------------------------------------------------------
      // CABEÇALHO DO DOCUMENTO
      // -------------------------------------------------------------
      
      // Retângulo externo principal do cabeçalho
      doc.rect(30, 30, 535, 75).stroke('#1e293b');
      
      // Logo text ou marca
      doc.fontSize(16).fillColor('#1e293b').font('Helvetica-Bold').text('DANFSE', 45, 42);
      doc.fontSize(8).fillColor('#475569').font('Helvetica').text('Documento Auxiliar da Nota Fiscal de Serviço Eletrônica', 45, 60);
      doc.fontSize(8).fillColor('#64748b').text('Padrão Nacional da NFS-e (Decreto Municipal Porto Alegre)', 45, 72);

      // Caixa de Informações de Emissão (Lado Direito)
      doc.rect(370, 30, 195, 75).stroke('#1e293b');
      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold').text('NÚMERO DPS:', 380, 38);
      doc.font('Helvetica').text(String(data.numeroDps || '').padStart(8, '0'), 465, 38);
      
      doc.font('Helvetica-Bold').text('SÉRIE DPS:', 380, 50);
      doc.font('Helvetica').text('00001', 465, 50);
      
      doc.font('Helvetica-Bold').text('TIPO DPS:', 380, 62);
      doc.font('Helvetica').text('1 - DPS', 465, 62);
      
      doc.font('Helvetica-Bold').text('AMBIENTE:', 380, 74);
      doc.font('Helvetica').text(data.protocolo && data.protocolo.startsWith('HM-') ? '2 - Homologação' : '1 - Produção', 465, 74);

      // -------------------------------------------------------------
      // PRESTADOR DE SERVIÇOS (EMITENTE)
      // -------------------------------------------------------------
      doc.rect(30, 115, 535, 70).stroke('#475569');
      doc.rect(30, 115, 535, 18).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold').text('PRESTADOR DE SERVIÇOS (EMITENTE)', 40, 120);
      
      doc.fontSize(9).fillColor('#0f172a');
      doc.font('Helvetica-Bold').text('Nome/Razão Social:', 40, 140);
      doc.font('Helvetica').text(data.prestadorNome || '', 140, 140);
      
      doc.font('Helvetica-Bold').text('CNPJ:', 40, 155);
      doc.font('Helvetica').text(formatCnpj(data.prestadorCnpj || ''), 140, 155);
      
      doc.font('Helvetica-Bold').text('Inscr. Municipal:', 300, 155);
      doc.font('Helvetica').text(data.prestadorIm || '', 380, 155);

      doc.font('Helvetica-Bold').text('Município / UF:', 40, 170);
      doc.font('Helvetica').text('Porto Alegre - RS (CNAE 8610103 - Psicologia)', 140, 170);

      // -------------------------------------------------------------
      // TOMADOR DE SERVIÇOS
      // -------------------------------------------------------------
      doc.rect(30, 195, 535, 55).stroke('#475569');
      doc.rect(30, 195, 535, 18).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold').text('TOMADOR DE SERVIÇOS', 40, 200);

      doc.fontSize(9).fillColor('#0f172a');
      doc.font('Helvetica-Bold').text('Nome:', 40, 220);
      doc.font('Helvetica').text(data.tomadorNome || '', 100, 220);

      doc.font('Helvetica-Bold').text('Documento:', 40, 235);
      doc.font('Helvetica').text(formatDocument(data.tomadorDocumento || ''), 100, 235);

      // -------------------------------------------------------------
      // DESCRIÇÃO DOS SERVIÇOS
      // -------------------------------------------------------------
      doc.rect(30, 260, 535, 195).stroke('#475569');
      doc.rect(30, 260, 535, 18).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold').text('DESCRIÇÃO DOS SERVIÇOS PRESTADOS', 40, 265);

      doc.fontSize(9).fillColor('#0f172a').font('Helvetica');
      doc.text(
        data.descricaoServico || 'PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA CLÍNICA E PSICOTERAPIA PARA ATENDIMENTO E ACOMPANHAMENTO INDIVIDUAL.',
        40,
        290,
        {
          width: 515,
          align: 'left',
          lineGap: 4
        }
      );

      // -------------------------------------------------------------
      // VALORES E TRIBUTOS
      // -------------------------------------------------------------
      doc.rect(30, 465, 535, 80).stroke('#475569');
      doc.rect(30, 465, 535, 18).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold').text('DADOS DOS VALORES E TRIBUTAÇÃO DA NFS-E', 40, 470);

      // Linha 1 de Valores
      doc.fontSize(9).fillColor('#0f172a');
      doc.font('Helvetica-Bold').text('Valor do Serviço:', 40, 495);
      doc.font('Helvetica').text(`R$ ${Number(data.valorTotal || 0).toFixed(2)}`, 140, 495);

      doc.font('Helvetica-Bold').text('ISS Retido:', 300, 495);
      doc.font('Helvetica').text('Não Retido', 380, 495);

      // Linha 2 de Valores
      doc.font('Helvetica-Bold').text('Simples Nacional:', 40, 510);
      doc.font('Helvetica').text('Sim (Optante)', 140, 510);

      doc.font('Helvetica-Bold').text('Regime Especial:', 300, 510);
      doc.font('Helvetica').text('Microempresa Municipal', 380, 510);

      // Alíquota informativa
      doc.font('Helvetica-Bold').text('CNAE / Trib. Nac:', 40, 525);
      doc.font('Helvetica').text('8610103 / Código 01.07 (Psicologia)', 140, 525);

      doc.font('Helvetica-Bold').text('Valor Líquido:', 300, 525);
      doc.font('Helvetica-Bold').fillColor('#0369a1').text(`R$ ${Number(data.valorTotal || 0).toFixed(2)}`, 380, 525);

      // -------------------------------------------------------------
      // INFORMAÇÕES DE PROTOCOLO E ASSINATURA (FOOTER)
      // -------------------------------------------------------------
      doc.rect(30, 555, 535, 90).stroke('#1e293b');
      doc.rect(30, 555, 535, 18).fill('#0f172a');
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold').text('DADOS DE AUTORIZAÇÃO E VALIDAÇÃO DA NFS-E', 40, 560);

      doc.fontSize(8.5).fillColor('#0f172a');
      doc.font('Helvetica-Bold').text('Chave de Acesso:', 40, 582);
      doc.font('Helvetica').text(data.chaveAcesso || 'AGUARDANDO EMISSÃO REAL', 130, 582);

      doc.font('Helvetica-Bold').text('Protocolo Uso:', 40, 600);
      doc.font('Helvetica').text(data.protocolo || 'EM SIMULAÇÃO', 130, 600);

      doc.font('Helvetica-Bold').text('Data Emissão:', 300, 600);
      doc.font('Helvetica').text(data.dataEmissao ? new Date(data.dataEmissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'), 380, 600);

      doc.fontSize(7.5).fillColor('#475569');
      doc.text(
        'Este documento é uma representação gráfica simplificada da Nota Fiscal de Serviço Eletrônica Nacional. A sua autenticidade e validade jurídica podem ser confirmadas no portal nacional da NFS-e através da chave de acesso acima.',
        40,
        620,
        { width: 515, align: 'justify' }
      );

      doc.fontSize(7).fillColor('#94a3b8').text('Emitido via Viggo NFSe Backend para Psicólogos.', 30, 770);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper para realizar o parse do XML de NFSe do Serpro e gerar o PDF diretamente.
 * @param {string} xmlString - XML completo e assinado retornado
 * @returns {Promise<Buffer>} Buffer do PDF gerado
 */
async function generatePdfFromXml(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlString);
  
  // Extrai as tags do padrão nacional
  const infDPS = result.DPS?.infDPS;
  const emit = infDPS?.emit;
  const tom = infDPS?.tom;
  const val = infDPS?.val;
  
  const parsedData = {
    numeroDps: infDPS?.dpsNum ? parseInt(infDPS.dpsNum, 10) : 0,
    prestadorNome: 'Psicólogo Emitente', // Pode ser complementado buscando do DB
    prestadorCnpj: emit?.CNPJ || '',
    prestadorIm: emit?.IM || '',
    tomadorNome: tom?.xNome || '',
    tomadorDocumento: tom?.doc?.CPF || tom?.doc?.CNPJ || '',
    valorTotal: val?.vServ ? parseFloat(val.vServ) : 0,
    descricaoServico: infDPS?.serv?.xDesc || 'Serviços de psicologia clínica e psicoterapia.',
    chaveAcesso: result.DPS?.infDPS?.Id || '',
    protocolo: 'HM-' + Date.now().toString().substring(5),
    dataEmissao: infDPS?.dhEmi || new Date().toISOString()
  };

  return generateDanfsePdf(parsedData);
}

// -------------------------------------------------------------
// Funções Auxiliares de Formatação
// -------------------------------------------------------------

function formatCnpj(cnpj) {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatCpf(cpf) {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatDocument(doc) {
  const clean = doc.replace(/\D/g, '');
  return clean.length === 11 ? formatCpf(clean) : formatCnpj(clean);
}

module.exports = {
  generateDanfsePdf,
  generatePdfFromXml
};
