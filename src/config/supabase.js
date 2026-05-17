const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Anon client (padrão)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Admin/Service Role client (necessário para workers e operações do sistema que burlam o RLS de maneira segura)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Cria uma instância do cliente Supabase injetando o JWT do usuário logado.
 * Isso garante que todas as operações respeitem estritamente as regras de RLS configuradas no banco.
 * @param {string} jwt - Bearer token enviado pelo frontend nas requisições.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getTenantClient(jwt) {
  const token = jwt.replace('Bearer ', '');
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false
    }
  });
}

module.exports = {
  supabase,
  supabaseAdmin,
  getTenantClient
};
