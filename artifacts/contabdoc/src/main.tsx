import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemento #root não encontrado");

try {
  createRoot(rootEl).render(<App />);
} catch (err) {
  console.error("Erro ao inicializar o app:", err);
  rootEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117;color:#e6edf3;font-family:sans-serif;flex-direction:column;gap:16px">
      <div style="font-size:48px">⚠️</div>
      <h1 style="margin:0;font-size:24px">Erro ao carregar o ContabDOC</h1>
      <p style="color:#8b949e;margin:0">Por favor, recarregue a página ou entre em contato com o suporte.</p>
      <button onclick="location.reload()" style="background:#238636;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:16px">Recarregar</button>
    </div>
  `;
}
