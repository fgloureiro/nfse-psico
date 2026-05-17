/**
 * Gera o XML de Declaração de Prestação de Serviços (DPS) no Padrão Nacional NFS-e.
 * Customizado e otimizado especificamente para psicólogos de Porto Alegre.
 * 
 * Regras Aplicadas:
 * - CNAE: 8610103 (Atividades de atendimento em psicologia e psicanálise)
 * - Código Tributação Nacional (cTribNac): 01.07 (Psicologia e psicanálise)
 * - Local da Prestação (cLocEru): 4314902 (Porto Alegre)
 * - ISS não retido: tpRetISS = 1
 * - Optante pelo Simples Nacional: opSimples = 1
 * - Regime Especial de Tributação: regTrib = 1 (Microempresa Municipal / ME)
 */
function generateDPSXml({
  cnpjEmitente,
  imEmitente,
  dpsNumber,
  dpsSeries = '1',
  tomadorDocumento,
  tomadorNome,
  valorServico,
  ambiente = 2 // 1 = Produção, 2 = Homologação
}) {
  const cleanCnpj = cnpjEmitente.replace(/\D/g, '');
  const cleanIm = imEmitente.replace(/\D/g, '');
  const cleanTomadorDoc = tomadorDocumento.replace(/\D/g, '');
  
  // O ID do elemento infDPS deve ser formado por "dps" + CNPJ (14 posições) + Série (5 posições) + Número (15 posições)
  const padCnpj = cleanCnpj.padStart(14, '0');
  const padSerie = dpsSeries.toString().padStart(5, '0');
  const padNumero = dpsNumber.toString().padStart(15, '0');
  const infDpsId = `dps${padCnpj}${padSerie}${padNumero}`;
  
  // Horário de emissão no formato ISO 8601 com Timezone de Porto Alegre (-03:00)
  const now = new Date();
  const offset = '-03:00';
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const dhEmi = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
  
  // Define a tag do documento do tomador baseando-se no tamanho (CPF = 11, CNPJ = 14)
  const docTag = cleanTomadorDoc.length === 11 ? 'CPF' : 'CNPJ';
  const escapedTomadorNome = escapeXml(tomadorNome.toUpperCase());
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${infDpsId}">
    <tpAmb>${ambiente}</tpAmb>
    <dhEmi>${dhEmi}</dhEmi>
    <verAplic>ViggoNFe_1.0</verAplic>
    <dpsNum>${dpsNumber}</dpsNum>
    <dpsSerie>${dpsSeries}</dpsSerie>
    <dpsTipo>1</dpsTipo>
    <emit>
      <CNPJ>${cleanCnpj}</CNPJ>
      <IM>${cleanIm}</IM>
    </emit>
    <tom>
      <doc>
        <${docTag}>${cleanTomadorDoc}</${docTag}>
      </doc>
      <xNome>${escapedTomadorNome}</xNome>
    </tom>
    <serv>
      <cLocEru>4314902</cLocEru>
      <cServ>
        <cTribNac>01.07</cTribNac>
        <cTribMun>8610103</cTribMun>
      </cServ>
      <xDesc>SERVIÇOS DE PSICOLOGIA CLÍNICA, PSICOTERAPIA E ATENDIMENTO TERAPÊUTICO ESPECIALIZADO.</xDesc>
    </serv>
    <val>
      <vServ>${Number(valorServico).toFixed(2)}</vServ>
      <trib>
        <opSimples>1</opSimples>
        <regTrib>1</regTrib>
        <iss>
          <tpRetISS>1</tpRetISS>
        </iss>
      </trib>
    </val>
  </infDPS>
</DPS>`;
}

/**
 * Escapa caracteres especiais para garantir que o XML seja válido.
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

module.exports = {
  generateDPSXml
};
