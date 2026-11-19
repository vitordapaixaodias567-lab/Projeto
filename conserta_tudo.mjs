// Rode na RAIZ do projeto:  node consertar-tudo.mjs
// 1) Baixa de novo as bibliotecas do rastreio (leaflet, qrcode, leitor de QR)
// 2) Devolve as chaves vazias "{}" que sumiram dos scripts da empresa
// 3) Ajusta os caminhos da tela da empresa para /empresa/...
// Pode rodar mais de uma vez sem estragar nada.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const RAIZ = path.join("area-da-empresa", "frontend");
if (!fs.existsSync(RAIZ)) { console.error("Rode na raiz do projeto (onde está a pasta area-da-empresa)."); process.exit(1); }

// ---------- 1) bibliotecas ----------
const LIB = path.join(RAIZ, "public", "rastreio", "lib");
const CDN = "https://cdn.jsdelivr.net/npm/";
const BAIXAR = [
  [CDN + "html5-qrcode@2.3.8/html5-qrcode.min.js", "html5-qrcode.min.js"],
  [CDN + "qrcode-generator@1.4.4/qrcode.js", "qrcode.js"],
  [CDN + "leaflet@1.9.4/dist/leaflet.js", "leaflet/leaflet.js"],
  [CDN + "leaflet@1.9.4/dist/leaflet.css", "leaflet/leaflet.css"],
  ...["layers.png", "layers-2x.png", "marker-icon.png", "marker-icon-2x.png", "marker-shadow.png"]
    .map((n) => [CDN + "leaflet@1.9.4/dist/images/" + n, "leaflet/images/" + n]),
];
if (!process.env.SEM_DOWNLOAD) {
  for (const [url, destino] of BAIXAR) {
    const alvo = path.join(LIB, destino);
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (destino.endsWith(".js")) new vm.Script(buf.toString("utf8"), { filename: destino }); // confere a sintaxe
      fs.writeFileSync(alvo, buf);
      console.log("baixado:", destino);
    } catch (e) {
      console.error("FALHOU:", destino, "-", e.message);
      process.exitCode = 1;
    }
  }
} else console.log("(download pulado)");

// ---------- 2 e 3) correções nos arquivos da empresa ----------
const arquivos = [];
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (["node_modules", "dist", "lib"].includes(e.name)) continue; varrer(p); }
    else if (/\.(html|js|jsx|css)$/.test(e.name) && !e.name.endsWith(".min.js")) arquivos.push(p);
  }
})(RAIZ);

const ALVOS = "imgs/|rastreio/|empresa\\.css|termo\\.css|avisos\\.css|cabecalho\\.js|frascos\\.js|avisos\\.js|termo\\.js|frascos\\.html|avisos\\.html|termo\\.html";
const regras = [
  // chaves vazias que sumiram
  [/(catch(?:[ \t]*\([^)]*\))?)[ \t]+(?=[};]|[A-Za-z_$])/g, "$1 {} "],
  [/(catch(?:[ \t]*\([^)]*\))?)[ \t]*(?=\r?\n)/g, "$1 {}"],
  [/(\w+ = )\)/g, "$1{})"],
  [/\|\| \)/g, "|| {})"],
  [/Object\.assign\(, /g, "Object.assign({}, "],
  [/function \(\) \)/g, "function () {})"],
  [/=> \(\)/g, "=> ({})"],
  [/(=>)[ \t]*(?=\r?\n[ \t]*\))/g, "$1 {}"],
  // caminhos da tela da empresa
  [new RegExp("([\"'`(])/(" + ALVOS + ")", "g"), "$1/empresa/$2"],
  [/`http:\/\/\$\{location\.hostname\}:3000`/g, "`https://projeto-7u2t.onrender.com`"],
  [/\(location\.protocol \+ '\/\/' \+ location\.hostname \+ ':3000'\)/g, "'https://projeto-7u2t.onrender.com'"],
  [/href: "\/", topo: "PAINEL"/g, 'href: "/empresa/", topo: "PAINEL"'],
  [/href="\/" data-sair/g, 'href="/empresa/" data-sair'],
  [/href="\/" class="cab-sair"/g, 'href="/empresa/" class="cab-sair"'],
  [/href="\/" onClick/g, 'href="/empresa/" onClick'],
  [/href="\/" className="cab-sair"/g, 'href="/empresa/" className="cab-sair"'],
];

let alterados = 0;
for (const f of arquivos) {
  const antes = fs.readFileSync(f, "utf8");
  let depois = antes;
  const ehJs = /\.(js|jsx)$/.test(f);
  for (const [re, rep] of regras) {
    // as regras de chaves só valem em arquivos JS
    if (!ehJs && regras.indexOf([re, rep]) < 0 && String(re).includes("catch")) continue;
    depois = depois.replace(re, rep);
  }
  if (depois !== antes) { fs.writeFileSync(f, depois); alterados++; console.log("ajustado:", f); }
}
console.log(`\nPronto: ${alterados} arquivo(s) ajustado(s).`);