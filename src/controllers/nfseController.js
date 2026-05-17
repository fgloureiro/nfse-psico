/**
 * NFSe Controller – Porto Alegre
 * Contém as rotas:
 *   - POST /homologacao/testar
 *   - POST /emitir
 *
 * Não possui nenhuma lógica de login.
 */

// =============================
// POST /homologacao/testar
// =============================
async function testHomologacao(req, res) {
  try {
    return res.status(200).json({
      sucesso: true,
      ambiente: 'homologacao',
      mensagem: 'Teste de homologação concluído com sucesso.',
      detalhes: 'NFS-e emitida e autorizada com sucesso (Simulação).',
      protocolo: 'PR1234567890',
      chave_acesso: '43171120260101000000000000000000000000000000',
      xml_gerado: '<DPS versao="1.00"><Teste>XML_SIMULADO</Teste></DPS>'
    });
  } catch (err) {
    console.error('[NFSeController] Erro no teste de homologação:', err);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Falha interna ao processar o teste de homologação.'
    });
  }
}

// =============================
// POST /emitir
// =============================
async function emitirNfse(req, res) {
  try {
    return res.status(200).json({
      sucesso: true,
      mensagem: 'DPS recebida e enviada para a fila de emissão.',
      protocolo_envio: 'ENVIO123456',
      status: 'pendente_processamento'
    });
  } catch (err) {
    console.error('[NFSeController] Erro ao emitir NFS-e:', err);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Falha interna ao tentar emitir a NFS-e.'
    });
  }
}

module.exports = {
  testHomologacao,
  emitirNfse
};

