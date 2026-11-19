
const $ = (id) => document.getElementById(id);
const API = (window.BIOOLEO_API_URL || `http://${location.hostname}:3000`).replace(/\/$/, "");
const CHAVE = "bioleo_admin_key";

const ROTULOS = {
  AGENDADA: "Disponível / Agendado",
  ENTREGUE: "Entregue ao cliente",
  EM_ROTA: "Em rota",
  COLETADO: "Coletado",
  CANCELADA: "Cancelado"
};

let listaFrascos = [];
let frascoSelecionado = null;
let leitor = null;

const chave = () => { try { return localStorage.getItem(CHAVE) || ""; } catch { return ""; } };
const guardarChave = (k) => { try { localStorage.setItem(CHAVE, k); } catch  };
const apagarChave = () => { try { localStorage.removeItem(CHAVE); } catch  };

function mensagem(texto, tipo) {
  const el = $("msg");
  el.textContent = texto || "";
  if (tipo) el.dataset.tipo = tipo; else delete el.dataset.tipo;
}

function pedirChave() {
  $("acesso").hidden = false;
  $("conteudo").hidden = true;
}

async function chamar(rota, opcoes = ) {
  const r = await fetch(API + rota, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": chave(),
      ...(opcoes.headers || )
    }
  });
  const j = await r.json().catch(() => ());
  return { ok: r.ok, status: r.status, j };
}

function urlRastreio(codigo) {
  const base = window.BIOOLEO_SITE_URL
    ? new URL("/rastreio/rastreio.html", window.BIOOLEO_SITE_URL)
    : new URL("/rastreio/rastreio.html", location.origin);
  base.searchParams.set("id", codigo);
  return base.href;
}

function gerarQrSvg(codigo, opts) {
  const q = qrcode(0, "M");
  q.addData(urlRastreio(codigo));
  q.make();
  return q.createSvgTag(opts);
}

function exibirQr(frasco) {
  frascoSelecionado = frasco;
  const codigo = frasco.qrCodigo || frasco.id;
  $("qr-vazio").hidden = true;
  $("qr-preview-wrap").hidden = false;
  $("qr-preview").innerHTML = gerarQrSvg(codigo, { cellSize: 4, margin: 0, scalable: true });
  $("qr-preview-id").textContent = `${frasco.id}${frasco.qrCodigo && frasco.qrCodigo !== frasco.id ? ` (QR: ${frasco.qrCodigo})` : ""}`;
  $("btn-qr-rastrear").href = `/rastreio/rastreio.html?id=${encodeURIComponent(codigo)}`;
}

$("btn-qr-ampliar").addEventListener("click", () => {
  if (!frascoSelecionado) return;
  const codigo = frascoSelecionado.qrCodigo || frascoSelecionado.id;
  $("qr-grande").innerHTML = gerarQrSvg(codigo, { cellSize: 4, margin: 0, scalable: true });
  $("qr-grande-id").textContent = codigo;
  $("dlg-qr").showModal();
});

$("btn-qr-baixar").addEventListener("click", () => {
  if (!frascoSelecionado) return;
  const codigo = frascoSelecionado.qrCodigo || frascoSelecionado.id;
  const svg = gerarQrSvg(codigo, { cellSize: 10, margin: 4 });
  const a = document.createElement("a");
  a.download = `qrcode-${codigo}.svg`;
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.click();
  URL.revokeObjectURL(a.href);
});

$("btn-qr-imprimir").addEventListener("click", () => {
  if (!frascoSelecionado) return;
  const codigo = frascoSelecionado.qrCodigo || frascoSelecionado.id;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<title>${codigo}</title><body style="font-family:sans-serif;text-align:center;padding:24px">` +
    gerarQrSvg(codigo, { cellSize: 8, margin: 4 }) +
    `<h1>${codigo}</h1><p>${frascoSelecionado.tipo || "Frasco"} · ${frascoSelecionado.capacidadeLitros} L</p></body>`
  );
  w.document.close();
  w.focus();
  w.print();
});

function extrairCodigoLido(texto) {
  const t = String(texto || "").trim();
  try {
    const idParam = new URL(t).searchParams.get("id");
    if (idParam) return idParam.trim().toUpperCase();
  } catch 
  return t.toUpperCase();
}

async function abrirLeitor() {
  const dlg = $("dlg-leitor");
  dlg.showModal();
  $("leitor-msg").textContent = "Abrindo a câmera...";
  if (!window.Html5Qrcode) {
    $("leitor-msg").textContent = "Biblioteca de leitura indisponível.";
    return;
  }
  try {
    leitor = new Html5Qrcode("leitor-qr");
    await leitor.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 240 },
      (textoLido) => {
        $("qrCodigo").value = extrairCodigoLido(textoLido);
        fecharLeitor();
        mensagem("QR Code lido e preenchido no formulário!");
      },
      () => 
    );
    $("leitor-msg").textContent = "Aponte a câmera para a etiqueta QR Code do frasco.";
  } catch {
    $("leitor-msg").textContent = "Não foi possível abrir a câmera (verifique permissão ou HTTPS/localhost).";
  }
}

async function fecharLeitor() {
  const l = leitor;
  leitor = null;
  try { if (l) { await l.stop(); l.clear(); } } catch 
  if ($("dlg-leitor").open) $("dlg-leitor").close();
}

$("btn-ler-qr").addEventListener("click", abrirLeitor);
$("dlg-leitor").addEventListener("cancel", fecharLeitor);
document.querySelectorAll("[data-fechar]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const d = btn.closest("dialog");
    if (d.id === "dlg-leitor") fecharLeitor(); else d.close();
  });
});

async function atualizarEtapa(codigoFrasco, novoStatus) {
  mensagem("");
  try {
    const r = await chamar(`/api/admin/frascos/${encodeURIComponent(codigoFrasco)}/etapa`, {
      method: "POST",
      body: JSON.stringify({ status: novoStatus })
    });
    if (!r.ok) return mensagem(r.j.mensagem || "Não foi possível atualizar a etapa.", "erro");
    mensagem(`Status do frasco ${codigoFrasco} atualizado para ${ROTULOS[novoStatus] || novoStatus}!`);
    await carregar();
  } catch {
    mensagem("Erro de conexão com o servidor.", "erro");
  }
}

function renderizarLista() {
  const termo = $("filtro-busca").value.trim().toUpperCase();
  const filtrados = listaFrascos.filter((f) =>
    !termo ||
    f.id.includes(termo) ||
    (f.qrCodigo || "").includes(termo) ||
    (f.clienteNome || "").toUpperCase().includes(termo) ||
    (f.tipo || "").toUpperCase().includes(termo)
  );

  $("lista-vazia").hidden = filtrados.length > 0;
  const box = $("lista-frascos");
  box.replaceChildren();

  filtrados.forEach((f) => {
    const card = document.createElement("article");
    card.className = "card frasco-item";

    const topo = document.createElement("div");
    topo.className = "frasco-topo";
    const h3 = document.createElement("h3");
    h3.textContent = f.id;
    const selo = document.createElement("span");
    selo.className = `selo-st ${f.status}`;
    selo.textContent = ROTULOS[f.status] || f.status;
    topo.append(h3, selo);

    const info = document.createElement("p");
    info.className = "meta";
    info.textContent = [
      `${f.tipo} · ${f.capacidadeLitros} L`,
      `QR Code: ${f.qrCodigo}`,
      f.clienteNome ? `Cliente: ${f.clienteNome}` : null,
      f.endereco ? `Local: ${f.endereco}` : null,
      f.agendamentoId ? `Agendamento: ${f.agendamentoId}` : null
    ].filter(Boolean).join(" | ");

    const etapaBar = document.createElement("div");
    etapaBar.className = "etapa-bar";
    const sel = document.createElement("select");
    sel.className = "campo";
    sel.setAttribute("aria-label", `Novo status para ${f.id}`);
    Object.entries(ROTULOS).forEach(([k, v]) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = v;
      if (k === f.status) opt.selected = true;
      sel.appendChild(opt);
    });
    const btnEtapa = document.createElement("button");
    btnEtapa.type = "button";
    btnEtapa.className = "btn";
    btnEtapa.textContent = "Atualizar status";
    btnEtapa.addEventListener("click", () => atualizarEtapa(f.id, sel.value));
    etapaBar.append(sel, btnEtapa);

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    acoes.style.justifyContent = "flex-start";

    const btnQr = document.createElement("button");
    btnQr.type = "button";
    btnQr.className = "btn";
    btnQr.textContent = "Ver QR Code";
    btnQr.addEventListener("click", () => {
      exibirQr(f);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const linkRastrear = document.createElement("a");
    linkRastrear.className = "btn btn-ouro";
    linkRastrear.href = `/rastreio/rastreio.html?id=${encodeURIComponent(f.qrCodigo || f.id)}`;
    linkRastrear.textContent = "Rastrear";

    acoes.append(btnQr, linkRastrear);
    card.append(topo, info, etapaBar, acoes);
    box.appendChild(card);
  });
}

async function carregar() {
  let r;
  try {
    r = await chamar("/api/admin/frascos-cadastrados");
  } catch {
    mensagem("Não foi possível falar com o servidor. O backend está rodando?", "erro");
    return pedirChave();
  }
  if (r.status === 401) {
    const tinha = !!chave();
    apagarChave();
    mensagem(tinha ? "Chave da equipe incorreta." : "", tinha ? "erro" : "");
    return pedirChave();
  }
  if (!r.ok) return mensagem("Não foi possível carregar os frascos.", "erro");

  $("acesso").hidden = true;
  $("conteudo").hidden = false;
  listaFrascos = r.j;
  renderizarLista();
  if (!frascoSelecionado && listaFrascos.length) exibirQr(listaFrascos[0]);
}

$("form-acesso").addEventListener("submit", (e) => {
  e.preventDefault();
  guardarChave($("chave").value.trim());
  mensagem("");
  carregar();
});

$("filtro-busca").addEventListener("input", renderizarLista);

$("form-frasco").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  mensagem("");
  try {
    const corpo = {
      tipo: $("tipo").value,
      capacidadeLitros: Number($("capacidade").value),
      qrCodigo: $("qrCodigo").value.trim(),
      statusInicial: $("statusInicial").value,
      agendamentoCodigo: $("agendamentoCodigo").value.trim(),
      clienteNome: $("clienteNome").value.trim(),
      bairro: $("bairro").value.trim(),
      endereco: $("endereco").value.trim(),
      observacoes: $("observacoes").value.trim()
    };
    const r = await chamar("/api/admin/frascos", { method: "POST", body: JSON.stringify(corpo) });
    if (r.status === 401) {
      apagarChave();
      mensagem("Chave da equipe incorreta.", "erro");
      return pedirChave();
    }
    if (!r.ok) return mensagem(r.j.mensagem || "Erro ao cadastrar o frasco.", "erro");

    $("form-frasco").reset();
    $("capacidade").value = "20";
    mensagem(`Frasco ${r.j.id} cadastrado com QR Code ${r.j.qrCodigo}! Pronto para rastrear.`);
    exibirQr(r.j);
    await carregar();
  } catch {
    mensagem("Erro de conexão com o servidor.", "erro");
  } finally {
    btn.disabled = false;
  }
});

if (chave()) carregar(); else pedirChave();
