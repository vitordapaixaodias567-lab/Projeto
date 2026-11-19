
function mostrarMensagem(texto, erro = false) {
    const div = document.createElement('div');
    div.textContent = texto;
    div.setAttribute('role', 'alert');
    div.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:100;max-width:90%;'
        + 'padding:0.8rem 1.4rem;border-radius:12px;color:#fff;font:500 0.9rem Montserrat,sans-serif;'
        + 'box-shadow:0 8px 24px rgba(0,0,0,0.4);background:' + (erro ? '#c0392b' : '#2FA84F');
    document.body.append(div);
    setTimeout(() => div.remove(), 3000);
}

function mensagemNaProximaPagina(texto) {
    sessionStorage.setItem('mensagem', texto);
}

const guardada = sessionStorage.getItem('mensagem');
if (guardada) {
    sessionStorage.removeItem('mensagem');
    mostrarMensagem(guardada);
}
