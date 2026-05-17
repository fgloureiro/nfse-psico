const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

/**
 * Extrai a chave privada PEM e o certificado PEM de um buffer de certificado A1 (.pfx)
 * @param {Buffer} pfxBuffer - Buffer contendo o arquivo .pfx
 * @param {string} password - Senha de descriptografia do certificado
 * @returns {{ privateKeyPem: string, certPem: string }} Objeto com as credenciais em formato PEM
 */
function extractCredentialsFromP12(pfxBuffer, password) {
  try {
    // Converte o buffer para uma string binária legível pelo node-forge
    const pfxBinary = pfxBuffer.toString('binary');
    const asn1 = forge.asn1.fromDer(pfxBinary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
    
    let privateKeyPem = null;
    let certPem = null;
    
    // Varre os safeContents do P12 para encontrar a chave privada e o certificado correspondente
    for (let i = 0; i < p12.safeContents.length; i++) {
      const safeContents = p12.safeContents[i];
      for (let j = 0; j < safeContents.safeBags.length; j++) {
        const bag = safeContents.safeBags[j];
        
        // Se for a chave privada
        if (bag.key) {
          privateKeyPem = forge.pki.privateKeyToPem(bag.key);
        }
        
        // Se for o certificado
        if (bag.cert) {
          certPem = forge.pki.certificateToPem(bag.cert);
        }
      }
    }
    
    if (!privateKeyPem) {
      throw new Error('Chave privada (Private Key Bag) não encontrada no arquivo PFX.');
    }
    
    if (!certPem) {
      throw new Error('Certificado (Certificate Bag) não encontrado no arquivo PFX.');
    }
    
    return { privateKeyPem, certPem };
  } catch (error) {
    throw new Error(`Erro ao extrair credenciais do certificado A1: ${error.message}`);
  }
}

/**
 * Assina digitalmente uma tag <infDPS> dentro do XML do DPS utilizando padrão XMLDSig
 * @param {string} xmlString - Conteúdo XML completo da DPS contendo a tag <infDPS Id="...">
 * @param {string} privateKeyPem - Chave privada do emitente no formato PEM
 * @param {string} certPem - Certificado digital do emitente no formato PEM
 * @returns {string} XML assinado com a tag <Signature> inserida no local correto
 */
function signDPSXml(xmlString, privateKeyPem, certPem) {
  try {
    // 1. Extrai o ID da tag <infDPS> para referenciar na assinatura
    const idMatch = xmlString.match(/<infDPS\s+Id="([^"]+)"/);
    if (!idMatch) {
      throw new Error('Tag <infDPS> com atributo "Id" não foi encontrada no XML.');
    }
    const infDpsId = idMatch[1];
    const referenceUri = `#${infDpsId}`;

    const sig = new SignedXml();

    // 2. Configura a referência com os algoritmos de transformação exigidos pelo padrão nacional
    sig.addReference(
      "//*[local-name(.)='infDPS']",
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      "http://www.w3.org/2000/09/xmldsig#sha1",
      referenceUri
    );

    // 3. Define a chave e algoritmos de criptografia (RSA-SHA1 é padrão para NFe/NFSe)
    sig.signingKey = privateKeyPem;
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

    // 4. Limpa o certificado PEM para extrair apenas a string base64
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\s+/g, "");

    // 5. Configura o elemento <KeyInfo> com o <X509Data> e o certificado
    sig.keyInfoProvider = {
      getKeyInfo: function(key, prefix) {
        const pfx = prefix ? `${prefix}:` : "";
        return `<${pfx}X509Data><${pfx}X509Certificate>${certBase64}</${pfx}X509Certificate></${pfx}X509Data>`;
      }
    };

    // 6. Computa a assinatura digital
    sig.computeSignature(xmlString, {
      prefix: "", // Sem prefixo para as tags da assinatura (padrão nacional)
      location: {
        reference: "//*[local-name(.)='infDPS']",
        action: "after" // A assinatura deve vir imediatamente após o término do bloco infDPS
      }
    });

    return sig.getSignedXml();
  } catch (error) {
    throw new Error(`Erro na assinatura do XML DPS: ${error.message}`);
  }
}

module.exports = {
  extractCredentialsFromP12,
  signDPSXml
};
