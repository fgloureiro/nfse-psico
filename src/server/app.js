const express = require('express');
const cors = require('cors');
const env = require('../config/env');
const nfseRoutes = require('../routes/nfseRoutes');
const clientesRoutes = require('../routes/clientesRoutes');

const app = express();

// Configurações de Middlewares Globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    mockMode: env.MOCK_FISCAL_API,
    ambiente: env.NODE_ENV
  });
});

// Acoplamento das rotas principais da API (POST /homologacao/testar, POST /emitir, POST /login e Clientes)
app.use('/', nfseRoutes);
app.use('/clientes', clientesRoutes);

// Tratamento de erros globais (Fallback de segurança)
app.use((err, req, res, next) => {
  console.error('[App Critical Error]:', err.stack);
  res.status(500).json({ 
    sucesso: false, 
    mensagem: 'Ocorreu um erro interno no servidor backend da NFS-e.', 
    erro: env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

module.exports = app;
