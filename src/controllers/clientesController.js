const { getTenantClient } = require('../config/supabase');

/**
 * Controller para gerenciamento de Clientes (Tomadores de Serviço)
 */

/**
 * Rota POST /clientes
 * Cria um novo cliente associado ao psicólogo autenticado
 */
async function criarCliente(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { data: { user }, error: authError } = await tenantClient.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ sucesso: false, mensagem: 'Token JWT inválido ou expirado.' });
    }

    const userId = user.id;
    const { 
      nome, cpf_cnpj, email, telefone, logradouro, 
      numero, complemento, bairro, cidade, uf, cep, tipo 
    } = req.body;

    // Validações obrigatórias
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "nome" é obrigatório.' });
    }
    if (!cpf_cnpj || cpf_cnpj.trim() === '') {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "cpf_cnpj" é obrigatório.' });
    }
    if (!tipo || !['PF', 'PJ'].includes(tipo.toUpperCase())) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "tipo" deve ser PF (Pessoa Física) ou PJ (Pessoa Jurídica).' });
    }

    const cleanCpfCnpj = cpf_cnpj.replace(/\D/g, '');

    // Insere o cliente herdando automaticamente o usuario_id do usuário logado
    const { data: cliente, error: insertError } = await tenantClient
      .from('clientes')
      .insert({
        usuario_id: userId,
        nome: nome.trim(),
        cpf_cnpj: cleanCpfCnpj,
        email: email ? email.trim() : null,
        telefone: telefone ? telefone.trim() : null,
        logradouro: logradouro ? logradouro.trim() : null,
        numero: numero ? numero.trim() : null,
        complemento: complemento ? complemento.trim() : null,
        bairro: bairro ? bairro.trim() : null,
        cidade: cidade ? cidade.trim() : null,
        uf: uf ? uf.toUpperCase().trim() : null,
        cep: cep ? cep.replace(/\D/g, '') : null,
        tipo: tipo.toUpperCase()
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao criar cliente: ${insertError.message}` });
    }

    console.log(`[ClientesController] Cliente ${cliente.nome} criado com sucesso para o usuário ${userId}`);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Cliente cadastrado com sucesso.',
      cliente
    });

  } catch (error) {
    console.error('[ClientesController] Erro ao criar cliente:', error);
    return res.status(500).json({ sucesso: false, mensagem: `Erro interno no servidor: ${error.message}` });
  }
}

/**
 * Rota GET /clientes
 * Lista todos os clientes pertencentes ao psicólogo autenticado (Filtrado automaticamente via RLS)
 */
async function listarClientes(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    
    // Consulta direta sem filtros adicionais de user_id - O RLS do PostgreSQL garante isolamento!
    const { data: clientes, error: queryError } = await tenantClient
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (queryError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao listar clientes: ${queryError.message}` });
    }

    return res.status(200).json({
      sucesso: true,
      quantidade: clientes.length,
      clientes
    });

  } catch (error) {
    console.error('[ClientesController] Erro ao listar clientes:', error);
    return res.status(500).json({ sucesso: false, mensagem: `Erro interno no servidor: ${error.message}` });
  }
}

/**
 * Rota GET /clientes/:id
 * Obtém os detalhes de um cliente específico (Garante isolamento via RLS)
 */
async function obterCliente(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { id } = req.params;

    const { data: cliente, error: queryError } = await tenantClient
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Retorna nulo de forma amigável se RLS bloquear ou não existir

    if (queryError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao buscar cliente: ${queryError.message}` });
    }

    if (!cliente) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Cliente não encontrado ou você não possui permissão para acessá-lo.' 
      });
    }

    return res.status(200).json({
      sucesso: true,
      cliente
    });

  } catch (error) {
    console.error('[ClientesController] Erro ao obter cliente:', error);
    return res.status(500).json({ sucesso: false, mensagem: `Erro interno no servidor: ${error.message}` });
  }
}

/**
 * Rota PUT /clientes/:id
 * Atualiza os dados de um cliente existente (Garante isolamento via RLS)
 */
async function atualizarCliente(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { id } = req.params;
    const updates = req.body;

    // Impede alteração manual do proprietário da linha
    delete updates.usuario_id;
    delete updates.id;
    delete updates.data_cadastro;

    if (updates.cpf_cnpj) {
      updates.cpf_cnpj = updates.cpf_cnpj.replace(/\D/g, '');
    }
    if (updates.cep) {
      updates.cep = updates.cep.replace(/\D/g, '');
    }
    if (updates.tipo) {
      updates.tipo = updates.tipo.toUpperCase();
      if (!['PF', 'PJ'].includes(updates.tipo)) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "tipo" deve ser PF ou PJ.' });
      }
    }

    const { data: cliente, error: updateError } = await tenantClient
      .from('clientes')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao atualizar cliente: ${updateError.message}` });
    }

    if (!cliente) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Cliente não encontrado ou você não possui permissão para atualizá-lo.' 
      });
    }

    console.log(`[ClientesController] Cliente ${cliente.nome} atualizado com sucesso.`);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Cliente atualizado com sucesso.',
      cliente
    });

  } catch (error) {
    console.error('[ClientesController] Erro ao atualizar cliente:', error);
    return res.status(500).json({ sucesso: false, mensagem: `Erro interno no servidor: ${error.message}` });
  }
}

/**
 * Rota DELETE /clientes/:id
 * Exclui um cliente (Garante isolamento via RLS)
 */
async function excluirCliente(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ sucesso: false, mensagem: 'Cabeçalho de autorização (JWT) ausente.' });
    }

    const tenantClient = getTenantClient(authHeader);
    const { id } = req.params;

    const { error: deleteError } = await tenantClient
      .from('clientes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ sucesso: false, mensagem: `Erro ao excluir cliente: ${deleteError.message}` });
    }

    console.log(`[ClientesController] Cliente ${id} excluído com sucesso.`);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Cliente excluído com sucesso.'
    });

  } catch (error) {
    console.error('[ClientesController] Erro ao excluir cliente:', error);
    return res.status(500).json({ sucesso: false, mensagem: `Erro interno no servidor: ${error.message}` });
  }
}

module.exports = {
  criarCliente,
  listarClientes,
  obterCliente,
  atualizarCliente,
  excluirCliente
};
