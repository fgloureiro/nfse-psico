const app = require('./src/server/app');
const env = require('./src/config/env');
const { iniciarWorkerEmissao } = require('./src/workers/worker-emissao');
const { iniciarWorkerConsulta } = require('./src/workers/worker-consulta');

// Inicialização da escuta do Servidor Express
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`=====================================================================`);
  console.log(` Viggo NFS-e Nacional - Backend para Psicólogos (Porto Alegre)`);
  console.log(` Servidor rodando com sucesso na porta: ${PORT}`);
  console.log(` Modo de Execução: ${env.NODE_ENV}`);
  console.log(` API Fiscal Simulada (Mock): ${env.MOCK_FISCAL_API ? 'HABILITADA (Simulação)' : 'DESABILITADA (Produção/Homologação real)'}`);
  console.log(`=====================================================================`);

  // Inicializa os workers de fila em segundo plano no mesmo processo (Altamente otimizado para Render free plan!)
  if (env.START_BACKGROUND_WORKERS) {
    console.log('[Sistema] Inicializando workers de processamento em segundo plano...');
    iniciarWorkerEmissao();
    iniciarWorkerConsulta();
  } else {
    console.log('[Sistema] Workers em segundo plano desativados nesta instância do servidor.');
  }
});
