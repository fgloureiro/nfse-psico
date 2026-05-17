require('dotenv').config();

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const missing = requiredEnv.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes em produção: ${missing.join(', ')}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://mock-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key',
  
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'viggo-default-super-secret-key-32-chars-long!',
  
  MOCK_FISCAL_API: process.env.MOCK_FISCAL_API === 'true',
  
  SERPRO_API_URL: process.env.SERPRO_API_URL || 'https://homologacao.nfse.gov.br/api/v1',
  SERPRO_CLIENT_ID: process.env.SERPRO_CLIENT_ID || '',
  SERPRO_CLIENT_SECRET: process.env.SERPRO_CLIENT_SECRET || '',
  
  START_BACKGROUND_WORKERS: process.env.START_BACKGROUND_WORKERS !== 'false'
};
