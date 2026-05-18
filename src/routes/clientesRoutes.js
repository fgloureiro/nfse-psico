const express = require('express');
const {
  criarCliente,
  listarClientes,
  obterCliente,
  atualizarCliente,
  excluirCliente
} = require('../controllers/clientesController');

const router = express.Router();

/**
 * Rotas para o módulo de Clientes (Tomadores de Serviço)
 * Todas as rotas abaixo requerem autenticação Bearer Token JWT no cabeçalho.
 */

// POST /clientes - Cadastrar um novo cliente
router.post('/', criarCliente);

// GET /clientes - Listar todos os clientes pertencentes ao inquilino autenticado
router.get('/', listarClientes);

// GET /clientes/:id - Buscar detalhes de um cliente específico
router.get('/:id', obterCliente);

// PUT /clientes/:id - Atualizar dados cadastrais de um cliente
router.put('/:id', atualizarCliente);

// DELETE /clientes/:id - Remover um cliente
router.delete('/:id', excluirCliente);

module.exports = router;
