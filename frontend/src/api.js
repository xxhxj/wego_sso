const TOKEN_KEY = 'wego_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !url.endsWith('/login')) {
    clearToken();
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  if (!response.ok) throw new Error(data.message || '请求失败');
  return data;
}

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  menus: (app) => request(`/api/auth/menus?app=${encodeURIComponent(app)}`),
  portals: () => request('/api/auth/apps'),
  users: () => request('/api/users'),
  saveUser: (id, body) => request(id ? `/api/users/${id}` : '/api/users', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(body),
  }),
  removeUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  roles: () => request('/api/roles'),
  saveRole: (id, body) => request(id ? `/api/roles/${id}` : '/api/roles', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(body),
  }),
  removeRole: (id) => request(`/api/roles/${id}`, { method: 'DELETE' }),
  apps: () => request('/api/menus/apps'),
  saveApp: (id, body) => request(id ? `/api/menus/apps/${id}` : '/api/menus/apps', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(body),
  }),
  removeApp: (id) => request(`/api/menus/apps/${id}`, { method: 'DELETE' }),
  menuList: (appId) => request(`/api/menus?appId=${appId}`),
  saveMenu: (id, body) => request(id ? `/api/menus/${id}` : '/api/menus', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(body),
  }),
  removeMenu: (id) => request(`/api/menus/${id}`, { method: 'DELETE' }),
  loginLogs: (page) => request(`/api/login-logs?page=${page}&pageSize=20`),
  operationLogs: (page) => request(`/api/operation-logs?page=${page}&pageSize=20`),
};
