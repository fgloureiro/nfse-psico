const express = require('express');
const { 
  testHomologacao, 
  emitirNfse,
  obterPerfil,
  salvarPerfil,
  listarNotas,
  obterNota
} = require('../controllers/nfseController');
const { login } = require('../controllers/authController');

const router = express.Router();

/**
 * Rota POST /login
 * Realiza a autenticação de usuários contra o banco do Supabase.
 */
router.post('/login', login);

/**
 * Rotas de Perfil Profissional do Psicólogo
 * Requer Token JWT no cabeçalho Authorization: Bearer <JWT>
 */
router.get('/perfil', obterPerfil);
router.post('/perfil', salvarPerfil);
router.put('/perfil', salvarPerfil);

/**
 * Rota POST /homologacao/testar
 * Testa a geração e envio de DPS.
 */
router.post('/homologacao/testar', testHomologacao);

/**
 * Rota POST /emitir
 * Envia uma DPS real para a fila de processamento.
 */
router.post('/emitir', emitirNfse);

/**
 * Rotas de Histórico de Notas Fiscais (NFS-e)
 * Requer Token JWT no cabeçalho Authorization: Bearer <JWT>
 */
router.get('/notas', listarNotas);
router.get('/notas/:id', obterNota);

module.exports = router;
