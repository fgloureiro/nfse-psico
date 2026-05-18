const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nfse-psico-backend.onrender.com';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Função utilitária global para chamadas HTTP ao Backend.
 * Injeta o Token JWT automaticamente e trata respostas unificadas e erros unificados (como 401).
 */
export async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  // Ajusta o endpoint para garantir que comece com barra '/'
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${formattedEndpoint}`;

  // Configura cabeçalhos padrão
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Recupera o JWT do LocalStorage se existir no ambiente de cliente
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('viggo_jwt');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Prepara a configuração final da requisição
  const config: RequestInit = {
    ...options,
    headers,
  };

  // Serializa o corpo se for um objeto simples
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Trata erros de autenticação (401 - Unauthorized)
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        console.warn('[fetchApi] Recebido HTTP 401. Sessão expirada. Redirecionando...');
        localStorage.removeItem('viggo_jwt');
        localStorage.removeItem('viggo_user');
        
        // Evita loop de redirecionamento caso já esteja na página de login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expirado=true';
        }
      }
      throw new Error('Sessão expirada. Por favor, realize o login novamente.');
    }

    const contentType = response.headers.get('content-type');
    let data: any = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { text: await response.text() };
    }

    // Se o HTTP status não for de sucesso, trata o erro contendo o JSON da API
    if (!response.ok) {
      const errorMessage = data?.mensagem || data?.erro || `Erro HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: any) {
    console.error(`[fetchApi Error] no endpoint ${endpoint}:`, error.message);
    throw error;
  }
}
