const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';
// Deriva uma chave de 32 bytes de forma determinística e segura a partir da chave do ambiente
const KEY = crypto.scryptSync(env.ENCRYPTION_KEY, 'viggo-salt', 32);

/**
 * Criptografa uma string em formato seguro (IV + Dados)
 * @param {string} text - Texto plano para criptografar (ex: senha do certificado)
 * @returns {string} Texto criptografado prefixado pelo IV hexadecimal separado por dois pontos
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descriptografa uma string em formato seguro (IV + Dados)
 * Se a string não estiver no formato esperado (não possuir dois pontos), retorna o texto plano
 * para garantir compatibilidade com configurações em desenvolvimento
 * @param {string} text - Texto criptografado retornado da coluna vault
 * @returns {string} Texto original descriptografado
 */
function decrypt(text) {
  if (!text) return null;
  const parts = text.split(':');
  if (parts.length !== 2) {
    // Fallback: Se não estiver criptografado com IV, retorna o texto puro (útil para desenvolvimento local rápido)
    return text;
  }
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Falha ao descriptografar senha com a chave configurada. Retornando texto puro como fallback.', error.message);
    return text;
  }
}

module.exports = {
  encrypt,
  decrypt
};
