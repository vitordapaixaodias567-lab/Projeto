export const API = import.meta.env.VITE_API_URL || `https://projeto-7u2t.onrender.com`;
export const STATUS = { AGENDADA: "Coleta agendada", ENTREGUE: "Frasco entregue", EM_ROTA: "Equipe a caminho", COLETADO: "Coletado", CANCELADA: "Cancelada" };
export const linkRastreio = (id, t) => `/empresa/rastreio/rastreio.html?id=${id}${t ? `&t=${t}` : ""}`;

export const lerChave = () => {
  try { return localStorage.getItem("bioleo_admin_key") || ""; } catch { return ""; }
};
export const salvarChave = (k) => {
  try { localStorage.setItem("bioleo_admin_key", k); } catch {}
};
