// Rode na RAIZ do projeto:  node corrigir-chaves-vazias.mjs
// Devolve as chaves vazias "{}" que sumiram de alguns scripts (catch, opcoes = {}, etc.).
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join("area-da-empresa", "frontend");
if (!fs.existsSync(RAIZ)) { console.error("Rode na raiz do projeto (onde está a pasta area-da-empresa)."); process.exit(1); }

const arquivos = [];
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (["node_modules", "dist", "lib"].includes(e.name)) continue; varrer(p); }
    else if (/\.(js|jsx)$/.test(e.name) && !e.name.endsWith(".min.js")) arquivos.push(p);
  }
})(RAIZ);

const regras = [
  [/(catch(?:[ \t]*\([^)]*\))?)[ \t]+(?=[};]|[A-Za-z_$])/g, "$1 {} "],
  [/(catch(?:[ \t]*\([^)]*\))?)[ \t]*(?=\r?\n)/g, "$1 {}"],
  [/(\w+ = )\)/g, "$1{})"],
  [/\|\| \)/g, "|| {})"],
  [/Object\.assign\(, /g, "Object.assign({}, "],
  [/function \(\) \)/g, "function () {})"],
  [/=> \(\)/g, "=> ({})"],
  [/(=>)[ \t]*(?=\r?\n[ \t]*\))/g, "$1 {}"],
];

let alterados = 0;
for (const f of arquivos) {
  const antes = fs.readFileSync(f, "utf8");
  let depois = antes;
  for (const [re, rep] of regras) depois = depois.replace(re, rep);
  if (depois !== antes) { fs.writeFileSync(f, depois); alterados++; console.log("corrigido:", f); }
}
console.log(`\nPronto: ${alterados} arquivo(s) corrigido(s).`);