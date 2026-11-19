import path from 'path';
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { db, ensureSchema, limparLocalizacoes } from "./db.js";
import { agendarGeocodificacao } from "./geocodificar.js";
import rastreio, { exigirAdmin, registrarAgendamentoCriado, codigo } from "./rastreio.js";
import avisos from "./avisos.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "600kb" }));
app.use(cors());
app.use("/api", rastreio);
app.use("/api", avisos);

app.post("/salvar-agendamento", async (req, res) => {
    const {
        nome,
        telefone,
        dia,
        hora,
        rua,
        casa,
        bairro,
        complemento,
        quantidade_litros,
        observacoes,
    } = req.body;

    if (!nome || !telefone || !dia || !hora || !rua || !casa || !bairro || !quantidade_litros) {
        return res
            .status(400)
            .json({ sucesso: false, mensagem: "Preencha todos os campos." });
    }

    const connection = db;

    try {
        const token = crypto.randomBytes(16).toString("hex");

        const insertQuery = `
            INSERT INTO agendamentos (nome, telefone, dia, hora, rua, casa, bairro, complemento, quantidade_litros, observacoes, token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(insertQuery, [
            nome,
            telefone,
            dia,
            hora,
            rua,
            casa,
            bairro,
            complemento || null,
            quantidade_litros,
            observacoes || null,
            token,
        ]);
        await registrarAgendamentoCriado(connection, result.insertId, dia, hora);
        agendarGeocodificacao(db, result.insertId, { rua, casa, bairro });

        const mensagem = `Olá ${nome}, aguardamos você no dia ${dia} às ${hora} horas.`;

        res.status(200).json({
            sucesso: true,
            id: result.insertId,
            codigo: codigo(result.insertId),
            token,
            mensagem,
        });
    } catch (err) {
        console.error("Erro ao processar o agendamento:", err);
        res
            .status(500)
            .json({ sucesso: false, mensagem: "Erro ao salvar o agendamento" });
    }
});

app.get("/listar-agendamento", exigirAdmin, async (_req, res) => {
    const connection = db;

    try {
        
        const [rows] = await connection.execute(
            "SELECT id, nome, telefone, dia, hora, rua, casa, bairro, complemento, quantidade_litros, observacoes FROM agendamentos"
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error("Erro ao listar o agendamento:", err);
        res
            .status(500)
            .json({ mensagem: "Erro interno ao buscar o agendamento" });
    }
});

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ mensagem: "Erro interno do servidor." });
});

try {
    await ensureSchema();
} catch (err) {
    console.error("Não foi possível preparar o banco de dados:", err.message);
    process.exit(1);
}
limparLocalizacoes().catch((e) => console.warn("Limpeza de posições antigas falhou:", e.message));
setInterval(() => limparLocalizacoes().catch(() => {}), 24 * 3600 * 1000).unref();


// --- Adicionado para o Render ---
// 1. Servir a Tela do Cliente (arquivos estaticos na raiz do repositorio)
app.use(express.static(path.join(__dirname, '../')));

// 2. Servir a Tela da Empresa (Build do React/Vite)
app.use('/empresa', require('express').static(path.join(__dirname, '../area-da-empresa/frontend/dist')));

// 3. Redirecionar rotas nao encontradas na '/empresa' para o React (SPA fallback)
app.get('/empresa/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../area-da-empresa/frontend/dist/index.html'));
});
// --------------------------------

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
