// Gerencia sessão do cliente (não usa auth do base44, é separado)
const STORAGE_KEY = 'labelle_client';

export function getClientSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveClientSession(client) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(client));
}

export function clearClientSession() {
  localStorage.removeItem(STORAGE_KEY);
}