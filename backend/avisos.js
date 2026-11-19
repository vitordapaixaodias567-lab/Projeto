import { Router } from "express";
import { db } from "./db.js";
import { exigirAdmin } from "./rastreio.js";

const r = Router();

const txt = (v, n) => String(v || "").trim().slice(0, n);
const iso = (s) => (s ? String(s).replace(" ", "T") : null);
const paraJson = (a) => ({ id: a.id, titulo: a.titulo, mensagem: a.mensagem, importante: !!a.importante, criadoEm: iso(a.criado_em) });

async function listar() {
    const [rows] = await db.query("SELECT id, titulo, mensagem, importante, criado_em FROM avisos ORDER BY id DESC LIMIT 50");
    return rows.map(paraJson);
}

r.get("/avisos", async (_req, res) => res.json(await listar()));

r.get("/admin/avisos", exigirAdmin, async (_req, res) => res.json(await listar()));

r.post("/admin/avisos", exigirAdmin, async (req, res) => {
    const titulo = txt(req.body?.titulo, 80);
    const mensagem = txt(req.body?.mensagem, 1000);
    if (titulo.length < 2) return res.status(400).json({ mensagem: "Informe o título do aviso (mínimo 2 letras)." });
    if (mensagem.length < 2) return res.status(400).json({ mensagem: "Escreva a mensagem do aviso." });
    const importante = req.body?.importante === true ? 1 : 0;
    const [ins] = await db.execute("INSERT INTO avisos (titulo, mensagem, importante) VALUES (?, ?, ?)", [titulo, mensagem, importante]);
    res.status(201).json({ sucesso: true, id: ins.insertId });
});

r.delete("/admin/avisos/:id", exigirAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ mensagem: "ID inválido." });
    const [d] = await db.execute("DELETE FROM avisos WHERE id = ?", [id]);
    if (!d.affectedRows) return res.status(404).json({ mensagem: "Aviso não encontrado." });
    res.json({ sucesso: true });
});

export default r;
