const getBase = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

const getToken = () => localStorage.getItem("contabdoc_token") || sessionStorage.getItem("contabdoc_token") || "";

const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const API = {
  url: (path: string) => `${getBase()}/api${path}`,

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(API.url(path), { headers: { ...authHeader() } });
    if (res.status === 401) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || "Não autenticado"), { status: 401 });
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || `Erro ${res.status}`), { status: res.status, data: d });
    }
    return res.json();
  },

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API.url(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || `Erro ${res.status}`), { status: res.status, data: d });
    }
    return res.json();
  },

  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API.url(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || `Erro ${res.status}`), { status: res.status, data: d });
    }
    return res.json();
  },

  async del(path: string): Promise<void> {
    const res = await fetch(API.url(path), { method: "DELETE", headers: { ...authHeader() } });
    if (!res.ok && res.status !== 204) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || `Erro ${res.status}`), { status: res.status, data: d });
    }
  },

  async upload<T = unknown>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(API.url(path), {
      method: "POST",
      headers: { ...authHeader() },
      body: formData,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw Object.assign(new Error((d as any).message || `Erro ${res.status}`), { status: res.status, data: d });
    }
    return res.json();
  },
};
