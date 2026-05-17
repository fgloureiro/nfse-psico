const { extractCredentialsFromP12, signDPSXml } = require('../../../utils/xmlSigner');

/**
 * Camada fiscal específica para assinador XMLDSig
 * Re-exporta chaves e funções utilitárias de assinatura digital de DPS.
 */
module.exports = {
  extractCredentialsFromP12,
  signDPSXml
};
