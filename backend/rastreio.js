import { Router } from "express";
import crypto from "node:crypto";
import { db } from "./db.js";
import { baseOrigem, rotaDaEntrega } from "./google.js";

const ADMIN_KEY = process.env.ADMIN_KEY || "bioleo-admin";
if (!process.env.ADMIN_KEY) {
    if (process.env.NODE_ENV === "production") { console.error("[rastreio] Defina ADMIN_KEY em produção."); process.exit(1); }
    console.warn("[rastreio] ADMIN_KEY não definida: usando a chave de DESENVOLVIMENTO.");
}

export const pool = db;
const ID_RE = /^BO-(\d{5})$/;
const CAD_RE = /^(?:FR-\d{5}|(?!BO-|FR-)[A-Z0-9._-]{3,40})$/;

export const codigo = (id) => "BO-" + String(id).padStart(5, "0");
export const codigoFrasco = (id) => "FR-" + String(id).padStart(5, "0");

const iguais = (a, b) => {
    const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
    return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};
const ehAdmin = (req) => iguais(req.get("x-admin-key"), ADMIN_KEY);
export const exigirAdmin = (req, res, next) =>
    ehAdmin(req) ? next() : res.status(401).json({ mensagem: "Acesso restrito à equipe." });
const iso = (s) => (s ? String(s).replace(" ", "T") : null);
const txt = (v, n) => String(v || "").trim().slice(0, n);

export async function registrarAgendamentoCriado(conn, id, dia, hora) {
    await conn.execute("INSERT INTO movimentacoes (agendamento_id, status, obs) VALUES (?, 'AGENDADA', ?)", [
        id, `Coleta prevista para ${dia} às ${hora}`,
    ]);
}

async function carregar(id) {
    const [[a]] = await pool.query("SELECT * FROM agendamentos WHERE id = ?", [id]);
    if (!a) return null;
    const [movs] = await pool.query(
        "SELECT status, data_hora, local, responsavel, obs FROM movimentacoes WHERE agendamento_id = ? ORDER BY data_hora, id", [id]);
    return { a, movs };
}

async function carregarFrascoCadastrado(chaveBusca) {
    const norm = String(chaveBusca || "").trim().toUpperCase();
    const [[f]] = await pool.query(
        "SELECT * FROM frascos WHERE UPPER(codigo) = ? OR UPPER(qr_codigo) = ? LIMIT 1",
        [norm, norm]
    );
    if (!f) return null;
    const [movs] = await pool.query(
        "SELECT status, data_hora, local, responsavel, obs FROM frasco_movimentacoes WHERE frasco_id = ? ORDER BY data_hora, id",
        [f.id]
    );
    return { f, movs };
}

const r = Router();

r.get("/config/mapa", (_req, res) => {
    const chave = process.env.GOOGLE_MAPS_BROWSER_KEY || "";
    res.json({ provedor: chave ? "google" : "osm", chave, mapId: process.env.GOOGLE_MAP_ID || "DEMO_MAP_ID" });
});

r.get("/frascos/:id", async (req, res) => {
    const raw = String(req.params.id || "").trim().toUpperCase();
    const m = ID_RE.exec(raw);

    if (m) {
        const id = parseInt(m[1], 10);
        const d = await carregar(id);
        if (!d) return res.status(404).json({ mensagem: "Frasco não encontrado." });
        const { a, movs } = d;
        const movimentacoes = movs.map((x) => ({
            status: x.status, dataHora: iso(x.data_hora), local: x.local || "", responsavel: x.responsavel || "", obs: x.obs || "",
        }));
        const completo = req.query.visao !== "publica" && (ehAdmin(req) || iguais(req.query.t, a.token));
        if (!completo) {
            return res.json({ id: codigo(id), publico: true, movimentacoes: movimentacoes.map(({ status, dataHora }) => ({ status, dataHora })) });
        }
        const atual = movimentacoes.length ? movimentacoes[movimentacoes.length - 1].status : null;
        const encerrado = atual === "COLETADO" || atual === "CANCELADA";
        let loc = null;
        if (!encerrado) {
            [[loc]] = await pool.query(
                "SELECT lat, lng, data_hora, responsavel FROM localizacoes WHERE agendamento_id = ? ORDER BY data_hora DESC, id DESC LIMIT 1", [id]);
        }
        const destino = a.destino_lat == null ? null : { lat: Number(a.destino_lat), lng: Number(a.destino_lng), aproximado: !!a.destino_aproximado };
        const equipe = loc ? { lat: Number(loc.lat), lng: Number(loc.lng) } : null;
        const origem = encerrado ? null : await baseOrigem();
        const rota = encerrado ? null : await rotaDaEntrega(id, origem, equipe, destino);
        return res.json({
            id: codigo(id), cliente: a.nome, pedido: "#" + String(id).padStart(4, "0"), bairro: a.bairro,
            endereco: `${a.rua}, ${a.casa} - ${a.bairro}`, dataPrevista: `${a.dia} ${a.hora}`,
            litrosPrevistos: Number(a.quantidade_litros),
            litrosColetados: a.litros_coletados == null ? null : Number(a.litros_coletados),
            responsavel: [...movimentacoes].reverse().map((x) => x.responsavel).find(Boolean) || "",
            destino, origem, rota,
            localizacao: loc ? { lat: Number(loc.lat), lng: Number(loc.lng), dataHora: iso(loc.data_hora), responsavel: loc.responsavel || "" } : null,
            movimentacoes,
        });
    }

    if (!CAD_RE.test(raw)) return res.status(400).json({ mensagem: "ID inválido." });
    const cad = await carregarFrascoCadastrado(raw);
    if (!cad) return res.status(404).json({ mensagem: "Frasco não encontrado." });

    const { f, movs } = cad;
    const movimentacoes = movs.map((x) => ({
        status: x.status, dataHora: iso(x.data_hora), local: x.local || "", responsavel: x.responsavel || "", obs: x.obs || "",
    }));
    const completo = req.query.visao !== "publica" && ehAdmin(req);
    if (!completo) {
        return res.json({
            id: f.codigo,
            qrCodigo: f.qr_codigo,
            publico: true,
            movimentacoes: movimentacoes.map(({ status, dataHora }) => ({ status, dataHora })),
        });
    }

    return res.json({
        id: f.codigo,
        qrCodigo: f.qr_codigo,
        tipoFrasco: f.tipo,
        cliente: f.cliente_nome || "Estoque / Em circulação",
        pedido: f.agendamento_id ? "#" + String(f.agendamento_id).padStart(4, "0") : "Cadastro avulso",
        bairro: f.bairro || "Base Bio Óleo",
        endereco: f.endereco || "Base / Depósito Bio Óleo",
        litrosPrevistos: Number(f.capacidade_litros),
        litrosColetados: null,
        responsavel: [...movimentacoes].reverse().map((x) => x.responsavel).find(Boolean) || "Equipe Bio Óleo",
        destino: null,
        origem: null,
        rota: null,
        localizacao: null,
        movimentacoes,
    });
});

r.get("/admin/frascos", exigirAdmin, async (_req, res) => {
    const [rows] = await pool.query(`SELECT a.id, a.token, a.nome, a.telefone, a.dia, a.hora, a.rua, a.casa, a.bairro,
        a.quantidade_litros, a.litros_coletados,
        (SELECT status FROM movimentacoes m WHERE m.agendamento_id = a.id ORDER BY m.data_hora DESC, m.id DESC LIMIT 1) AS status
        FROM agendamentos a ORDER BY a.id DESC LIMIT 500`);
    res.json(rows.map((a) => ({
        id: codigo(a.id), token: a.token, cliente: a.nome, telefone: a.telefone, dia: a.dia, hora: a.hora,
        endereco: `${a.rua}, ${a.casa} - ${a.bairro}`, bairro: a.bairro, status: a.status || "AGENDADA",
        litrosPrevistos: Number(a.quantidade_litros), litrosColetados: a.litros_coletados == null ? null : Number(a.litros_coletados),
    })));
});

r.get("/admin/frascos-cadastrados", exigirAdmin, async (_req, res) => {
    const [rows] = await pool.query(`
        SELECT f.*,
        (SELECT status FROM frasco_movimentacoes m WHERE m.frasco_id = f.id ORDER BY m.data_hora DESC, m.id DESC LIMIT 1) AS status
        FROM frascos f ORDER BY f.id DESC LIMIT 500
    `);
    res.json(rows.map((f) => ({
        id: f.codigo,
        qrCodigo: f.qr_codigo,
        tipo: f.tipo,
        capacidadeLitros: Number(f.capacidade_litros),
        clienteNome: f.cliente_nome || "",
        bairro: f.bairro || "",
        endereco: f.endereco || "",
        agendamentoId: f.agendamento_id ? codigo(f.agendamento_id) : null,
        observacoes: f.observacoes || "",
        status: f.status || "AGENDADA",
        criadoEm: iso(f.criado_em),
    })));
});

r.post("/admin/frascos", exigirAdmin, async (req, res) => {
    const { tipo, capacidadeLitros, qrCodigo, clienteNome, bairro, endereco, agendamentoCodigo, observacoes, statusInicial } = req.body || {};
    const cap = Number(capacidadeLitros);
    if (!(cap > 0 && cap <= 50000)) {
        return res.status(400).json({ mensagem: "Informe uma capacidade válida em litros (maior que zero)." });
    }
    const tipoLimpo = txt(tipo, 60) || "Bombona PEAD";
    const status = ["AGENDADA", "ENTREGUE", "EM_ROTA", "COLETADO"].includes(statusInicial) ? statusInicial : "AGENDADA";
    const quem = txt(req.get("x-responsavel"), 80) || "Equipe Bio Óleo";

    let agId = null;
    if (agendamentoCodigo) {
        const m = ID_RE.exec(String(agendamentoCodigo).trim().toUpperCase());
        if (!m) return res.status(400).json({ mensagem: "Código de agendamento inválido (use BO-00000)." });
        agId = parseInt(m[1], 10);
        const [[ag]] = await pool.query("SELECT id FROM agendamentos WHERE id = ?", [agId]);
        if (!ag) return res.status(404).json({ mensagem: "Agendamento vinculado não encontrado." });
    }

    const qrCustom = txt(qrCodigo, 40).toUpperCase();
    if (qrCustom && !CAD_RE.test(qrCustom)) {
        return res.status(400).json({ mensagem: "Código QR inválido. Use FR-00000 ou um código alfanumérico (3 a 40 caracteres, sem começar com BO-)." });
    }

    try {
        const tempCode = "TMP-" + crypto.randomBytes(6).toString("hex").toUpperCase();
        const [ins] = await pool.execute(
            `INSERT INTO frascos (codigo, qr_codigo, tipo, capacidade_litros, cliente_nome, bairro, endereco, agendamento_id, observacoes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tempCode,
                qrCustom || tempCode,
                tipoLimpo,
                cap,
                txt(clienteNome, 120) || null,
                txt(bairro, 80) || null,
                txt(endereco, 180) || null,
                agId,
                txt(observacoes, 255) || null,
            ]
        );
        const novoCodigo = codigoFrasco(ins.insertId);
        const qrFinal = qrCustom || novoCodigo;
        await pool.execute("UPDATE frascos SET codigo = ?, qr_codigo = ? WHERE id = ?", [novoCodigo, qrFinal, ins.insertId]);
        await pool.execute(
            "INSERT INTO frasco_movimentacoes (frasco_id, status, local, responsavel, obs) VALUES (?, ?, ?, ?, ?)",
            [
                ins.insertId,
                status,
                txt(endereco, 180) || "Base Bio Óleo",
                quem,
                `Frasco cadastrado (${tipoLimpo} · ${cap} L · QR: ${qrFinal})`,
            ]
        );
        res.status(201).json({
            sucesso: true,
            id: novoCodigo,
            qrCodigo: qrFinal,
            tipo: tipoLimpo,
            capacidadeLitros: cap,
            status,
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ mensagem: "Este código QR já está cadastrado em outro frasco." });
        }
        throw err;
    }
});

r.post("/admin/frascos/:id/etapa", exigirAdmin, async (req, res) => {
    const raw = String(req.params.id || "").trim().toUpperCase();
    const { status, local, obs } = req.body || {};
    if (!["AGENDADA", "ENTREGUE", "EM_ROTA", "COLETADO", "CANCELADA"].includes(status)) {
        return res.status(400).json({ mensagem: "Status inválido." });
    }
    const cad = await carregarFrascoCadastrado(raw);
    if (!cad) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    const quem = txt(req.get("x-responsavel"), 80) || "Equipe Bio Óleo";
    await pool.execute(
        "INSERT INTO frasco_movimentacoes (frasco_id, status, local, responsavel, obs) VALUES (?, ?, ?, ?, ?)",
        [cad.f.id, status, txt(local, 180) || cad.f.endereco || "Base Bio Óleo", quem, txt(obs, 255) || null]
    );
    res.status(201).json({ sucesso: true });
});

r.post("/frascos/:id/movimentacoes", exigirAdmin, async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const id = parseInt(m[1], 10);
    const { status, litrosColetados, obs } = req.body || {};
    if (!["ENTREGUE", "EM_ROTA", "COLETADO", "CANCELADA"].includes(status)) return res.status(400).json({ mensagem: "Status inválido." });
    const d = await carregar(id);
    if (!d) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    const atual = d.movs.length ? d.movs[d.movs.length - 1].status : null;
    if (atual === "COLETADO" || atual === "CANCELADA") return res.status(409).json({ mensagem: "Este frasco já foi encerrado." });
    if (status === "EM_ROTA" && atual === "EM_ROTA") return res.json({ sucesso: true, jaEmRota: true });
    if (status === "ENTREGUE" && atual !== "AGENDADA") return res.status(409).json({ mensagem: "A entrega só pode ser registrada logo após o agendamento." });
    if (status === "COLETADO") {
        const l = Number(litrosColetados);
        if (!(l > 0 && l <= 100000)) return res.status(400).json({ mensagem: "Informe os litros coletados (maior que zero)." });
        await pool.execute("UPDATE agendamentos SET litros_coletados = ? WHERE id = ?", [l, id]);
    }
    const local = status === "CANCELADA" ? null : d.a.endereco || `${d.a.rua}, ${d.a.casa} - ${d.a.bairro}`;
    await pool.execute("INSERT INTO movimentacoes (agendamento_id, status, local, responsavel, obs) VALUES (?, ?, ?, ?, ?)", [
        id, status, local, txt(req.get("x-responsavel"), 80) || "Equipe Bio Óleo", txt(obs, 255) || null,
    ]);
    res.status(201).json({ sucesso: true });
});

r.post("/frascos/:id/cancelar", async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const id = parseInt(m[1], 10);
    const d = await carregar(id);
    if (!d) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    if (!iguais(req.body?.token, d.a.token)) return res.status(403).json({ mensagem: "Comprovante inválido." });
    const atual = d.movs.length ? d.movs[d.movs.length - 1].status : null;
    if (atual === "CANCELADA") return res.json({ sucesso: true, jaCancelada: true });
    if (atual !== "AGENDADA") return res.status(409).json({ mensagem: "Esta coleta já está em andamento. Fale com a empresa para cancelar." });
    await pool.execute("INSERT INTO movimentacoes (agendamento_id, status, responsavel, obs) VALUES (?, 'CANCELADA', 'Cliente', 'Cancelada pelo cliente no site')", [id]);
    res.status(201).json({ sucesso: true });
});

r.post("/frascos/:id/termo", exigirAdmin, async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const id = parseInt(m[1], 10);
    const tipo = String(req.body?.tipo || "").toUpperCase();
    const nome = txt(req.body?.nome, 120);
    const assinatura = String(req.body?.assinatura || "");
    if (!["ASSINATURA", "ACEITE"].includes(tipo)) return res.status(400).json({ mensagem: "Tipo de aceite inválido." });
    if (nome.length < 2) return res.status(400).json({ mensagem: "Informe o nome do responsável." });
    if (tipo === "ASSINATURA" && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(assinatura) || assinatura.length > 400000))
        return res.status(400).json({ mensagem: "Assinatura ausente ou inválida." });
    const d = await carregar(id);
    if (!d) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    const atual = d.movs.length ? d.movs[d.movs.length - 1].status : null;
    if (atual !== "AGENDADA") return res.status(409).json({ mensagem: "O termo só pode ser aceito logo após o agendamento (frasco ainda não entregue)." });
    const quem = txt(req.get("x-responsavel"), 80) || "Equipe Bio Óleo";
    await pool.execute("INSERT INTO termos (agendamento_id, tipo, nome_responsavel, assinatura, registrado_por) VALUES (?, ?, ?, ?, ?)",
        [id, tipo, nome, tipo === "ASSINATURA" ? assinatura : null, quem]);
    const local = d.a.endereco || `${d.a.rua}, ${d.a.casa} - ${d.a.bairro}`;
    await pool.execute("INSERT INTO movimentacoes (agendamento_id, status, local, responsavel, obs) VALUES (?, 'ENTREGUE', ?, ?, ?)",
        [id, local, quem, `Termo de responsabilidade aceito (${tipo === "ASSINATURA" ? "assinatura" : "aceite digital"}) por ${nome}`]);
    res.status(201).json({ sucesso: true, id: codigo(id) });
});

r.get("/admin/frascos/:id/termo", exigirAdmin, async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const [[t]] = await pool.query("SELECT tipo, nome_responsavel, assinatura, registrado_por, criado_em FROM termos WHERE agendamento_id = ?", [parseInt(m[1], 10)]);
    if (!t) return res.status(404).json({ mensagem: "Nenhum termo registrado para este frasco." });
    res.json({ tipo: t.tipo, nome: t.nome_responsavel, assinatura: t.assinatura, registradoPor: t.registrado_por, dataHora: iso(t.criado_em) });
});

r.post("/frascos/:id/localizacoes", exigirAdmin, async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const id = parseInt(m[1], 10);
    const { lat, lng, precisaoM } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
        return res.status(400).json({ mensagem: "Coordenadas inválidas." });
    const d = await carregar(id);
    if (!d) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    const ult = d.movs.length ? d.movs[d.movs.length - 1].status : null;
    if (ult === "COLETADO" || ult === "CANCELADA") return res.status(409).json({ mensagem: "Esta coleta já foi encerrada." });
    await pool.execute("INSERT INTO localizacoes (agendamento_id, lat, lng, precisao_m, responsavel) VALUES (?, ?, ?, ?, ?)", [
        id, lat, lng, Number.isFinite(precisaoM) ? Math.round(precisaoM) : null, txt(req.get("x-responsavel"), 80) || "Equipe Bio Óleo",
    ]);
    res.status(201).json({ persistido: true });
});

r.put("/frascos/:id/destino", exigirAdmin, async (req, res) => {
    const m = ID_RE.exec(String(req.params.id).toUpperCase());
    if (!m) return res.status(400).json({ mensagem: "ID inválido." });
    const { lat, lng } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
        return res.status(400).json({ mensagem: "Coordenadas inválidas." });
    const [r2] = await pool.execute("UPDATE agendamentos SET destino_lat = ?, destino_lng = ?, destino_aproximado = 0 WHERE id = ?", [lat, lng, parseInt(m[1], 10)]);
    if (!r2.affectedRows) return res.status(404).json({ mensagem: "Frasco não encontrado." });
    res.json({ sucesso: true });
});

export default r;
