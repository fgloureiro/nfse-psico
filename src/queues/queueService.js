const { supabaseAdmin } = require('../config/supabase');

/**
 * Insere um novo trabalho de emissão na fila de processamento.
 * @param {string} notaId - UUID da nota fiscal correspondente
 * @param {string} userId - UUID do psicólogo emitente
 * @returns {Promise<Object>} Registro inserido na fila
 */
async function enqueueEmission(notaId, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('fila_emissao')
      .insert({
        nota_id: notaId,
        user_id: userId,
        status: 'pendente',
        tentativas: 0,
        proxima_execucao: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao enfileirar emissão: ${error.message}`);
    }

    console.log(`[QueueService] Nota ${notaId} enfileirada com sucesso na fila de emissão.`);
    return data;
  } catch (error) {
    console.error(`[QueueService] Falha ao enfileirar nota ${notaId}:`, error.message);
    throw error;
  }
}

/**
 * Retira e bloqueia de forma segura os próximos itens pendentes na fila para processamento.
 * Utiliza a função do Postgres processar_proximos_fila (com FOR UPDATE SKIP LOCKED) para evitar que
 * múltiplos workers concorrentes peguem o mesmo trabalho.
 * 
 * @param {number} limit - Quantidade máxima de itens a retirar
 * @returns {Promise<Array<{id: string, nota_id: string, user_id: string, tentativas: number}>>} Lista de itens travados para execução
 */
async function dequeueEmission(limit = 1) {
  try {
    const { data, error } = await supabaseAdmin.rpc('processar_proximos_fila', {
      p_limite: limit
    });

    if (error) {
      throw new Error(`Erro ao retirar itens da fila: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('[QueueService] Falha ao executar dequeue da fila:', error.message);
    return [];
  }
}

/**
 * Marca um trabalho na fila como concluído com sucesso (removendo ou mudando o status para audit)
 * @param {string} queueId - UUID da fila de emissão
 */
async function completeJob(queueId) {
  try {
    const { error } = await supabaseAdmin
      .from('fila_emissao')
      .update({
        status: 'concluido',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (error) throw error;
    console.log(`[QueueService] Trabalho da fila ${queueId} marcado como concluído.`);
  } catch (error) {
    console.error(`[QueueService] Falha ao finalizar trabalho da fila ${queueId}:`, error.message);
  }
}

/**
 * Trata falha no trabalho de emissão, aplicando retentativas com backoff exponencial.
 * @param {string} queueId - UUID da fila de emissão
 * @param {string} errorMessage - Mensagem do erro ocorrido
 * @param {number} currentAttempts - Tentativas já efetuadas antes desta falha
 */
async function failJob(queueId, errorMessage, currentAttempts) {
  try {
    const nextAttempts = currentAttempts + 1;
    
    // Backoff Exponencial: tenta novamente em 2^tentativas minutos (2min, 4min, 8min, 16min, etc.)
    const delayMinutes = Math.pow(2, nextAttempts);
    const proximaExecucao = new Date();
    proximaExecucao.setMinutes(proximaExecucao.getMinutes() + delayMinutes);

    const status = nextAttempts >= 5 ? 'erro' : 'erro'; // Fica como 'erro' até bater 5 tentativas

    const { error } = await supabaseAdmin
      .from('fila_emissao')
      .update({
        status: status,
        tentativas: nextAttempts,
        erro_mensagem: errorMessage,
        proxima_execucao: proximaExecucao.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (error) throw error;
    
    console.log(`[QueueService] Trabalho ${queueId} falhou (${nextAttempts}ª tentativa). Próxima execução agendada para: ${proximaExecucao.toISOString()}`);
  } catch (error) {
    console.error(`[QueueService] Falha ao registrar erro no trabalho ${queueId}:`, error.message);
  }
}

module.exports = {
  enqueueEmission,
  dequeueEmission,
  completeJob,
  failJob
};
