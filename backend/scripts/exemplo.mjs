
const API = process.env.API || "http://localhost:3000";
const exemplos = [
    { nome: "Cliente Exemplo 1", telefone: "44 99999-0001", dia: "2026-12-01", hora: "09:00", rua: "Rua Exemplo", casa: "10", bairro: "Centro", quantidade_litros: "10" },
    { nome: "Cliente Exemplo 2", telefone: "44 99999-0002", dia: "2026-12-02", hora: "14:30", rua: "Avenida Exemplo", casa: "250", bairro: "Jardim Alvorada", quantidade_litros: "25" },
    { nome: "Cliente Exemplo 3", telefone: "44 99999-0003", dia: "2026-12-03", hora: "08:00", rua: "Rua Teste", casa: "75", bairro: "Vila Nova", quantidade_litros: "15" },
];
for (const e of exemplos) {
    try {
        const r = await fetch(`${API}/salvar-agendamento`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) });
        const j = await r.json();
        console.log(r.ok ? `ok - ${j.codigo} (${e.nome})` : `erro - ${j.mensagem}`);
    } catch {
        console.error(`Não consegui falar com ${API}. O backend está rodando? (npm run dev)`);
        process.exit(1);
    }
}
