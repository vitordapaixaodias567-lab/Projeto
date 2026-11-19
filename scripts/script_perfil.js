const API = 'http://localhost:3001';
const id = localStorage.getItem('usuarioId');

async function carregarPerfil() {
    try {
        const { data: p } = await axios.get(`${API}/pessoas/${id}`);
        const naoInformado = 'Não informado';

        document.getElementById('boas-vindas').textContent = `Olá, ${p.nome.trim().split(' ')[0]}!`;
        document.getElementById('nome').textContent = p.nome.trim().split(' ')[0];
        document.getElementById('idade').textContent = `Idade: ${p.idade || naoInformado} Anos`;
        document.getElementById('telefone').textContent = `Telefone: ${p.telefone || naoInformado}`;
        document.getElementById('cidade').textContent = `Cidade: ${p.cidade || naoInformado}`;
        const cpf = (await Cripto.lerCpf(p.cpf)).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        document.getElementById('cpf').textContent = `CPF: ${cpf || naoInformado}`;
    } catch (error) {
        console.error(error);
    }
}

if (!id) {
    window.location.href = 'tela_login.html';
} else {
    carregarPerfil();
}
