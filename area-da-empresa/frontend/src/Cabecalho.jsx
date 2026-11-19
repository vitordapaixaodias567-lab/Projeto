import { useEffect, useRef, useState } from "react";

const CHAVE_EQUIPE = "bioleo_admin_key";

const ITENS = [
  { id: "empresa", texto: "Agendamentos", href: "/", topo: "PAINEL" },
  { id: "frascos", texto: "Cadastrar frascos", href: "/frascos.html", topo: "FRASCOS" },
  { id: "avisos", texto: "Avisos", href: "/avisos.html", topo: "AVISOS" },
  { id: "rastreio", texto: "Rastreio", href: "/rastreio/rastreio.html", topo: "RASTREIO" },
  { id: "termo", texto: "Termo de entrega", href: "/termo.html", topo: "TERMO" },
  { id: "entregador", texto: "App do entregador", href: "/rastreio/entregador.html" },
];

export default function Cabecalho({ ativo }) {
  const [aberto, setAberto] = useState(false);
  const abrirRef = useRef(null);
  const fecharRef = useRef(null);
  const jaAbriu = useRef(false);
  const atual = ativo || ITENS.find((i) => i.href === location.pathname)?.id;

  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    if (aberto) {
      jaAbriu.current = true;
      fecharRef.current?.focus();
    } else if (jaAbriu.current) {
      abrirRef.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  const sair = () => {
    try { localStorage.removeItem(CHAVE_EQUIPE); } catch 
  };

  const classe = (base) => `${base}${aberto ? " cab-aberto" : ""}`;

  return (
    <>
      <header className="cab-barra">
        <div className="cab-logo">
          <button
            ref={abrirRef}
            type="button"
            className="cab-burger"
            aria-label="Abrir menu"
            aria-expanded={aberto}
            aria-controls="cab-gaveta"
            onClick={() => setAberto(true)}
          />
          <img src="/imgs/3d_green_gradient_recycle_sign-Photoroom.png" alt="" />
          <h1>BIO-ÓLEO</h1>
        </div>

        <nav className="cab-topo" aria-label="Atalhos">
          {ITENS.filter((i) => i.topo).map((i) => (
            <a key={i.id} href={i.href}>{atual === i.id ? <span>{i.topo}</span> : i.topo}</a>
          ))}
        </nav>

        <a className="cab-pill" href="/" onClick={sair}>SAIR</a>
      </header>

      <div className={classe("cab-overlay")} onClick={() => setAberto(false)} />

      <aside id="cab-gaveta" className={classe("cab-gaveta")} aria-label="Menu principal">
        <header className="cab-gaveta-topo">
          <div className="cab-marca">
            <img src="/imgs/3d_green_gradient_recycle_sign-Photoroom.png" alt="" />
            <span>BIO-ÓLEO</span>
          </div>
          <button ref={fecharRef} type="button" className="cab-fechar" aria-label="Fechar menu" onClick={() => setAberto(false)}>&times;</button>
        </header>

        <nav>
          {ITENS.map((i) => (
            <a key={i.id} href={i.href} aria-current={atual === i.id ? "page" : undefined} onClick={() => setAberto(false)}>{i.texto}</a>
          ))}
          <a href="/" className="cab-sair" onClick={sair}>Sair</a>
        </nav>
      </aside>
    </>
  );
}
