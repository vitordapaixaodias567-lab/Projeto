// Rotas /pessoas e /agendamentos no estilo json-server, gravando em ../db.json.
// ATENÇÃO: no plano gratuito do Render o disco é apagado a cada deploy/reinício.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO = process.env.PESSOAS_DB || path.join(__dirname, "../db.json");
const COLECOES = ["pessoas", "agendamentos"];

function ler() {
    try { return JSON.parse(fs.readFileSync(ARQUIVO, "utf8")); } catch { return {}; }
}
let fila = Promise.resolve();
function gravar(dados) {
    const tmp = ARQUIVO + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
    fs.renameSync(tmp, ARQUIVO);
}
// executa uma leitura+alteração+gravação de cada vez
function transacao(fn) {
    const r = fila.then(() => { const d = ler(); const out = fn(d); gravar(d); return out; });
    fila = r.catch(() => {});
    return r;
}
const novoId = () => crypto.randomBytes(8).toString("base64url").slice(0, 11);

const router = express.Router();

for (const nome of COLECOES) {
    const lista = (d) => (d[nome] ||= []);

    router.get(`/${nome}`, (req, res) => {
        let itens = lista(ler());
        for (const [k, v] of Object.entries(req.query)) {
            if (k.startsWith("_")) continue;
            itens = itens.filter((i) => String(i[k]) === String(v));
        }
        res.json(itens);
    });

    router.get(`/${nome}/:id`, (req, res) => {
        const item = lista(ler()).find((i) => String(i.id) === req.params.id);
        if (!item) return res.status(404).json({});
        res.json(item);
    });

    router.post(`/${nome}`, async (req, res, next) => {
        try {
            const item = await transacao((d) => {
                const novo = { ...req.body, id: req.body?.id ?? novoId() };
                lista(d).push(novo);
                return novo;
            });
            res.status(201).json(item);
        } catch (e) { next(e); }
    });

    const alterar = (substituir) => async (req, res, next) => {
        try {
            const item = await transacao((d) => {
                const arr = lista(d);
                const i = arr.findIndex((x) => String(x.id) === req.params.id);
                if (i < 0) return null;
                arr[i] = substituir ? { ...req.body, id: arr[i].id } : { ...arr[i], ...req.body, id: arr[i].id };
                return arr[i];
            });
            if (!item) return res.status(404).json({});
            res.json(item);
        } catch (e) { next(e); }
    };
    router.patch(`/${nome}/:id`, alterar(false));
    router.put(`/${nome}/:id`, alterar(true));

    router.delete(`/${nome}/:id`, async (req, res, next) => {
        try {
            const ok = await transacao((d) => {
                const arr = lista(d);
                const i = arr.findIndex((x) => String(x.id) === req.params.id);
                if (i < 0) return false;
                arr.splice(i, 1);
                return true;
            });
            res.status(ok ? 200 : 404).json({});
        } catch (e) { next(e); }
    });
}

export default router;
