const express = require('express');
const { testHomologacao, emitirNfse } = require('../controllers/nfseController');
const { login } = require('../controllers/authController');

const router = express.Router();

/**
 * Rota POST /login
 * Realiza a autenticação de usuários contra o banco do Supabase.
 * Recebe: { "email": "...", "senha": "..." }
 * Retorna: { "sucesso": true, "access_token": "...", "user_id": "..." }
 */
router.post('/login', login);

/**
 * Rota POST /homologacao/testar
 * Gera, assina e transmite uma DPS simulada em homologação para validar as credenciais e o fluxo fiscal.
 * Requer o Token JWT obtido no login no cabeçalho: Authorization: Bearer <JWT>
 */
router.post('/homologacao/testar', testHomologacao);

/**
 * Rota POST /emitir
 * Gera uma DPS real e a envia para a fila de processamento assíncrono nacional.
 * Requer o Token JWT obtido no login no cabeçalho: Authorization: Bearer <JWT>
 */
router.post('/emitir', emitirNfse);

module.exports = router;
