import axios from "axios";

const TOKEN_KEY = "estulanches.token";

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* armazenamento indisponível (modo privado) */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// Mesma origem em produção (Express serve o frontend) e proxy do Vite em desenvolvimento.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 15000,
});

// Anexa o JWT em todas as requisições autenticadas.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada/inválida: avisa a aplicação para fazer logout.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStorage.get()) {
      window.dispatchEvent(new Event("estulanches:unauthorized"));
    }
    return Promise.reject(error);
  },
);

/** Extrai uma mensagem amigável de um erro do axios. */
export function getErrorMessage(error, fallback = "Algo deu errado. Tente novamente.") {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === "ECONNABORTED") return "O servidor demorou para responder.";
  if (error?.message === "Network Error") return "Sem conexão com o servidor.";
  return fallback;
}

/** Converte os detalhes de validação do backend em { campo: mensagem }. */
export function getFieldErrors(error) {
  const details = error?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}
