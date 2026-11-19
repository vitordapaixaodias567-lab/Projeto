
(function () {
  var CHAVE_EQUIPE = "bioleo_admin_key";
  var ATIVO = (document.currentScript && document.currentScript.dataset.ativo) || "";

  var ITENS = [
    { id: "empresa", texto: "Agendamentos", href: "/", topo: "PAINEL" },
    { id: "frascos", texto: "Cadastrar frascos", href: "/frascos.html", topo: "FRASCOS" },
    { id: "avisos", texto: "Avisos", href: "/avisos.html", topo: "AVISOS" },
    { id: "rastreio", texto: "Rastreio", href: "/rastreio/rastreio.html", topo: "RASTREIO" },
    { id: "termo", texto: "Termo de entrega", href: "/termo.html", topo: "TERMO" },
    { id: "entregador", texto: "App do entregador", href: "/rastreio/entregador.html" }
  ];
  var LOGO = "/imgs/3d_green_gradient_recycle_sign-Photoroom.png";

  var topo = ITENS.filter(function (i) { return i.topo; }).map(function (i) {
    return '<a href="' + i.href + '">' + (ATIVO === i.id ? "<span>" + i.topo + "</span>" : i.topo) + "</a>";
  }).join("");
  var menu = ITENS.map(function (i) {
    return '<a href="' + i.href + '"' + (ATIVO === i.id ? ' aria-current="page"' : "") + ">" + i.texto + "</a>";
  }).join("");

  var html =
    '<header class="cab-barra">' +
      '<div class="cab-logo">' +
        '<button type="button" class="cab-burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="cab-gaveta"></button>' +
        '<img src="' + LOGO + '" alt=""><h1>BIO-ÓLEO</h1>' +
      "</div>" +
      '<nav class="cab-topo" aria-label="Atalhos">' + topo + "</nav>" +
      '<a class="cab-pill" href="/" data-sair>SAIR</a>' +
    "</header>" +
    '<div class="cab-overlay"></div>' +
    '<aside id="cab-gaveta" class="cab-gaveta" aria-label="Menu principal">' +
      '<header class="cab-gaveta-topo">' +
        '<div class="cab-marca"><img src="' + LOGO + '" alt=""><span>BIO-ÓLEO</span></div>' +
        '<button type="button" class="cab-fechar" aria-label="Fechar menu">&times;</button>' +
      "</header>" +
      "<nav>" + menu + '<a href="/" class="cab-sair" data-sair>Sair</a></nav>' +
    "</aside>";

  document.body.insertAdjacentHTML("afterbegin", html);

  var burger = document.querySelector(".cab-burger");
  var fechar = document.querySelector(".cab-fechar");
  var overlay = document.querySelector(".cab-overlay");
  var gaveta = document.getElementById("cab-gaveta");

  function abrir(sim) {
    gaveta.classList.toggle("cab-aberto", sim);
    overlay.classList.toggle("cab-aberto", sim);
    burger.setAttribute("aria-expanded", String(sim));
    document.body.style.overflow = sim ? "hidden" : "";
    (sim ? fechar : burger).focus();
  }

  burger.addEventListener("click", function () { abrir(true); });
  fechar.addEventListener("click", function () { abrir(false); });
  overlay.addEventListener("click", function () { abrir(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && gaveta.classList.contains("cab-aberto")) abrir(false); });

  Array.prototype.forEach.call(document.querySelectorAll("[data-sair]"), function (a) {
    a.addEventListener("click", function () { try { localStorage.removeItem(CHAVE_EQUIPE); } catch (e)  });
  });
})();
