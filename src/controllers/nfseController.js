const { supabase } = require('../config/supabase');

/**
 * Rota POST /login
 * Realiza autenticação do psicólogo no Supabase Auth e retorna o JWT (access_token) para requisições subsequentes.
 * 
 * @param {import('express').Request} req - Objeto de Requisição Express
 * @param {import('express').Response} res - Objeto de Resposta Express
 */
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    // 1. Validações básicas de entrada
    if (!email || email.trim() === '') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'O campo "email" é obrigatório para realizar o login.' 
      });
    }
    if (!senha || senha.trim() === '') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'O campo "senha" é obrigatório para realizar o login.' 
      });
    }

    console.log(`[AuthController] Tentativa de login iniciada para o e-mail: ${email}`);

    // 2. Chama o Supabase Auth Client utilizando chaves anon normais para login de usuário (respeitando RLS)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha
    });

    // 3. Trata erros retornados pelo Supabase (credenciais incorretas, usuário inexistente, etc.)
    if (error) {
      console.warn(`[AuthController] Falha na autenticação para ${email}: ${error.message}`);
      return res.status(401).json({ 
        sucesso: false, 
        mensagem: `Falha na autenticação: ${error.message}` 
      });
    }

    // 4. Retorna resposta de sucesso contendo o Token JWT (access_token) e o ID do usuário para uso no frontend
    console.log(`[AuthController] Login efetuado com sucesso para o usuário: ${data.user.email}`);
    
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Autenticação realizada com sucesso no Supabase.',
      access_token: data.session.access_token,
      user_id: data.user.id
    });

  } catch (error) {
    console.error('[AuthController] Erro crítico no processamento de login:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: `Erro interno no servidor ao processar login: ${error.message}` 
    });
  }
}

module.exports = {
  login
};

