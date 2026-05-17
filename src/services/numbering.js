const { supabaseAdmin } = require('../config/supabase');

/**
 * Obtém o próximo número de DPS para o psicólogo de forma atômica e segura.
 * Utiliza bloqueio transacional (SELECT FOR UPDATE) no PostgreSQL para evitar duplicidade 
 * caso múltiplas requisições de emissão ocorram simultaneamente para o mesmo usuário.
 * 
 * @param {string} userId - UUID do usuário psicólogo
 * @returns {Promise<number>} Próximo número de DPS livre e incrementado
 */
async function getNextDPSNumber(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('obter_proximo_numero_dps', {
      p_user_id: userId
    });

    if (error) {
      console.error(`[NumberingService] Erro retornado pela função obter_proximo_numero_dps para o usuário ${userId}:`, error);
      throw new Error(error.message);
    }

    if (data === null || data === undefined) {
      throw new Error('Função de banco retornou um valor nulo. Verifique se o perfil do psicólogo existe.');
    }

    console.log(`[NumberingService] Novo número DPS reservado com sucesso para o usuário ${userId}: ${data}`);
    return data;
  } catch (error) {
    console.error(`[NumberingService] Erro ao obter próximo número DPS para o usuário ${userId}:`, error.message);
    throw new Error(`Controle de Numeração falhou: ${error.message}`);
  }
}

module.exports = {
  getNextDPSNumber
};
