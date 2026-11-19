
import assert from "node:assert/strict";
const B = process.env.API || "http://localhost:3000";
const KEY = process.env.ADMIN_KEY || "bioleo-admin";
const ok = (n) => console.log("ok -", n);
const call = async (rota, { metodo = "GET", corpo, admin = true } = {}) => {
    const h = { "Content-Type": "application/json" };
    if (admin) h["x-admin-key"] = KEY;
    const r = await fetch(B + rota, { method: metodo, headers: h, body: corpo && JSON.stringify(corpo) });
    return { s: r.status, j: await r.json().catch(() => ({})) };
};

let r = await call("/api/admin/avisos", { metodo: "POST", corpo: { titulo: "Teste", mensagem: "Olá" }, admin: false }); assert.equal(r.s, 401); ok("enviar aviso exige a chave da equipe");
r = await call("/api/admin/avisos", { admin: false }); assert.equal(r.s, 401); ok("lista da equipe exige a chave");
r = await call("/api/admin/avisos", { metodo: "POST", corpo: { titulo: "", mensagem: "Olá" } }); assert.equal(r.s, 400); ok("título vazio é recusado");
r = await call("/api/admin/avisos", { metodo: "POST", corpo: { titulo: "Coleta", mensagem: " " } }); assert.equal(r.s, 400); ok("mensagem vazia é recusada");

const titulo = "Teste " + Date.now();
r = await call("/api/admin/avisos", { metodo: "POST", corpo: { titulo, mensagem: "Coletas de dezembro ajustadas.", importante: true } }); assert.equal(r.s, 201); const id = r.j.id; ok("aviso criado");

r = await call("/api/avisos", { admin: false }); assert.equal(r.s, 200);
const meu = r.j.find((a) => a.id === id);
assert.ok(meu); assert.equal(meu.titulo, titulo); assert.equal(meu.importante, true); assert.ok(meu.criadoEm);
assert.equal(r.j[0].id, Math.max(...r.j.map((a) => a.id))); ok("o cliente lê o aviso sem chave (mais novo primeiro)");

r = await call(`/api/admin/avisos/${id}`, { metodo: "DELETE", admin: false }); assert.equal(r.s, 401); ok("apagar exige a chave da equipe");
r = await call(`/api/admin/avisos/${id}`, { metodo: "DELETE" }); assert.equal(r.s, 200); ok("aviso apagado");
r = await call(`/api/admin/avisos/${id}`, { metodo: "DELETE" }); assert.equal(r.s, 404); ok("apagar de novo: não encontrado");
r = await call("/api/admin/avisos/abc", { metodo: "DELETE" }); assert.equal(r.s, 400); ok("ID inválido é recusado");
r = await call("/api/avisos", { admin: false }); assert.ok(!r.j.some((a) => a.id === id)); ok("o aviso apagado some para o cliente");
console.log("\nTudo certo.");
