
const $ = (id) => document.getElementById(id);
const API = (window.BIOOLEO_API_URL || `http://${location.hostname}:3000`).replace(/\/$/, "");
const CHAVE = "bioleo_admin_key";

const chave = () => { try { return localStorage.getItem(CHAVE) || ""; } catch { return ""; } };
const guardarChave = (k) => { try { localStorage.setItem(CHAVE, k); } catch  };
const apagarChave = () => { try { localStorage.removeItem(CHAVE); } catch  };

async function chamar(rota, opcoes = ) {
    const r = await fetch(API + rota, { ...opcoes, headers: { "Content-Type": "application/json", "x-admin-key": chave(), ...(opcoes.headers || ) } });
    const j = await r.json().catch(() => ());
    return { ok: r.ok, status: r.status, j };
}

function mensagem(texto, tipo) {
    $("msg").textContent = texto || "";
    if (tipo) $("msg").dataset.tipo = tipo; else delete $("msg").dataset.tipo;
}

function pedirChave() {
    $("acesso").hidden = false;
    $("conteudo").hidden = true;
}

const dataBR = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

function cardAviso(a) {
    const card = document.createElement("article");
    card.className = "card aviso-card" + (a.importante ? " importante" : "");

    const topo = document.createElement("div");
    topo.className = "aviso-topo";
    const titulo = document.createElement("h3");
    titulo.textContent = a.titulo;
    topo.append(titulo);
    if (a.importante) {
        const selo = document.createElement("span");
        selo.className = "selo-importante";
        selo.textContent = "IMPORTANTE";
        topo.append(selo);
    }

    const data = document.createElement("p");
    data.className = "aviso-data";
    data.textContent = "Enviado em " + dataBR(a.criadoEm);

    const texto = document.createElement("p");
    texto.className = "aviso-texto";
    texto.textContent = a.mensagem;

    const apagar = document.createElement("button");
    apagar.type = "button";
    apagar.className = "btn btn-perigo";
    apagar.textContent = "Excluir aviso";
    apagar.addEventListener("click", () => excluir(a));

    card.append(topo, data, texto, apagar);
    return card;
}

async function carregar() {
    let r;
    try { r = await chamar("/api/admin/avisos"); } catch { mensagem("Não foi possível falar com o servidor. O backend está rodando?", "erro"); return pedirChave(); }
    if (r.status === 401) {
        const tinha = !!chave();
        apagarChave();
        mensagem(tinha ? "Chave da equipe incorreta." : "", tinha ? "erro" : "");
        return pedirChave();
    }
    if (!r.ok) return mensagem("Não foi possível carregar os avisos.", "erro");

    $("acesso").hidden = true;
    $("conteudo").hidden = false;
    $("lista").replaceChildren(...r.j.map(cardAviso));
    $("vazio").hidden = r.j.length > 0;
}

async function excluir(a) {
    if (!confirm(`Excluir o aviso "${a.titulo}"? Ele deixa de aparecer para os clientes.`)) return;
    try {
        const r = await chamar(`/api/admin/avisos/${a.id}`, { method: "DELETE" });
        if (!r.ok) return mensagem(r.j.mensagem || "Não foi possível excluir o aviso.", "erro");
        mensagem("Aviso excluído.", "ok");
        carregar();
    } catch { mensagem("Não foi possível falar com o servidor.", "erro"); }
}

$("form-acesso").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarChave($("chave").value.trim());
    mensagem("");
    carregar();
});

$("mensagem").addEventListener("input", () => { $("contador").textContent = `${$("mensagem").value.length} / 1000`; });

$("form-aviso").addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = e.submitter;
    botao.disabled = true;
    try {
        const r = await chamar("/api/admin/avisos", {
            method: "POST",
            body: JSON.stringify({ titulo: $("titulo").value, mensagem: $("mensagem").value, importante: $("importante").checked }),
        });
        if (r.status === 401) { apagarChave(); mensagem("Chave da equipe incorreta.", "erro"); return pedirChave(); }
        if (!r.ok) return mensagem(r.j.mensagem || "Não foi possível enviar o aviso.", "erro");
        $("form-aviso").reset();
        $("contador").textContent = "0 / 1000";
        mensagem("Aviso enviado! Os clientes já podem vê-lo.", "ok");
        carregar();
    } catch { mensagem("Não foi possível falar com o servidor.", "erro"); } finally { botao.disabled = false; }
});

if (chave()) carregar(); else pedirChave();
