const express = require('express');
const { testHomologacao, emitirNfse } = require('../controllers/nfseController');

const router = express.Router();

/**
 * Rota para testar a comunicação, assinatura e homologação de DPS fake
 * Requer JWT no cabeçalho Authorization: Bearer <token>
 */
router.post('/homologacao/testar', testHomologacao);

/**
 * Rota para emissão de nota fiscal real assíncrona
 * Requer JWT no cabeçalho Authorization: Bearer <token>
 */
router.post('/emitir', emitirNfse);

module.exports = router;
