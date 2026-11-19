const API = 'http://localhost:3001';
const id = localStorage.getItem('usuarioId');
const lista = document.getElementById('lista-avisos');

const formatarData = (texto) => new Date(texto.length === 10 ? texto + 'T12:00' : texto).toLocaleDateString('pt-BR');

function mensagem(texto) {
    const li = document.createElement('li');
    li.className = 'aviso-vazio';
    li.textContent = texto;
    lista.replaceChildren(li);
}

function montarAviso(a) {
    const li = document.createElement('li');
    li.className = a.importante ? 'aviso-item aviso-importante' : 'aviso-item';

    const titulo = document.createElement('h3');
    titulo.textContent = a.titulo;
    li.append(titulo);

    if (a.criadoEm) {
        const data = document.createElement('time');
        data.dateTime = a.criadoEm;
        data.textContent = formatarData(a.criadoEm);
        li.append(data);
    }

    const texto = document.createElement('p');
    texto.textContent = a.mensagem;
    li.append(texto);

    return li;
}

async function carregarNome() {
    try {
        const { data: p } = await axios.get(`${API}/pessoas/${id}`);
        document.getElementById('boas-vindas').textContent = `Olá, ${p.nome.trim().split(' ')[0]}!`;
    } catch (error) {
        console.error(error);
    }
}

async function carregarAvisos() {
    try {

        const { data } = await axios.get(`${EMPRESA_API}/api/avisos`);
        if (!data.length) return mensagem('Nenhum aviso no momento.');
        lista.replaceChildren(...data.map(montarAviso));
    } catch (error) {
        console.error(error);
        mensagem('Não foi possível carregar os avisos.');
    }
}

if (!id) {
    window.location.href = 'tela_login.html';
} else {
    carregarNome();
    carregarAvisos();
}
