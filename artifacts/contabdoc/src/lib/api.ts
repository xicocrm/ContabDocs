const getBase = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const API = {
  url: (path: string) => `${getBase()}/api${path}`,

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(API.url(path));
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as any).message || `Erro ${res.status}`);
    }
    return res.json();
  },

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API.url(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as any).message || `Erro ${res.status}`);
    }
    return res.json();
  },

  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API.url(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as any).message || `Erro ${res.status}`);
    }
    return res.json();
  },

  async del(path: string): Promise<void> {
    const res = await fetch(API.url(path), { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as any).message || `Erro ${res.status}`);
    }
  },
};
