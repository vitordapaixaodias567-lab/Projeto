import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join("area-da-empresa", "frontend");
if (!fs.existsSync(RAIZ)) { console.error("Rode na raiz do projeto (onde está a pasta area-da-empresa)."); process.exit(1); }

const EXT = new Set([".html", ".js", ".jsx", ".css"]);
const arquivos = [];
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (["node_modules", "dist", "lib"].includes(e.name)) continue; varrer(p); }
    else if (EXT.has(path.extname(e.name)) && !e.name.endsWith(".min.js")) arquivos.push(p);
  }
})(RAIZ);

const ALVOS = "imgs/|rastreio/|empresa\\.css|termo\\.css|avisos\\.css|cabecalho\\.js|frascos\\.js|avisos\\.js|termo\\.js|frascos\\.html|avisos\\.html|termo\\.html";
const regras = [
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
  for (const [re, rep] of regras) depois = depois.replace(re, rep);
  if (depois !== antes) { fs.writeFileSync(f, depois); alterados++; console.log("ajustado:", f); }
}
console.log(`\nPronto: ${alterados} arquivo(s) ajustado(s).`);