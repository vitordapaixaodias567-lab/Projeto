const API = 'http://localhost:3001';
const id = localStorage.getItem('usuarioId');

const cardDados = document.getElementById('card-dados');
const cardAgendamento = document.getElementById('card-agendamento');
const campos = ['cidade', 'cep', 'rua', 'bairro'];

const blocoEmpresa = document.getElementById('bloco-empresa');
const empresa = document.getElementById('empresa');
const ehEmpresa = () => empresa.checked;

let pessoa = {};

function proximaColeta() {
    const hoje = new Date();
    const mes = hoje.getDate() <= 28 ? hoje.getMonth() : hoje.getMonth() + 1;
    return new Date(hoje.getFullYear(), mes, 28, 12).toLocaleDateString('sv-SE');
}

empresa.addEventListener('change', () => {
    blocoEmpresa.style.display = ehEmpresa() ? 'block' : 'none';
    document.getElementById('cnpj').required = ehEmpresa();
});

function mostrarCard() {
    const primeiro = !pessoa.cpf;
    cardDados.style.display = primeiro ? 'flex' : 'none';
    cardAgendamento.style.display = primeiro ? 'none' : 'flex';
    campos.forEach(c => document.getElementById(c).value = pessoa[c] || '');
    document.getElementById('numero-residencia').value = pessoa.numeroresidencia || '';
    aplicarMascaras();
}

document.getElementById('form-dados').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {

        const cpf = document.getElementById('cpf').value;
        if (await Cripto.cpfEmUso(cpf, id, `${API}/pessoas`)) {
            return mostrarMensagem('Este CPF já está cadastrado em outra conta', true);
        }

        const { data } = await axios.patch(`${API}/pessoas/${id}`, {
            ...(await Cripto.protegerCpf(cpf)),
            telefone: document.getElementById('telefone').value
        });
        pessoa = data;
        mostrarCard();
    } catch (error) {
        console.error(error);
        mostrarMensagem('Erro ao salvar seus dados', true);
    }
});

document.getElementById('form-agendamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const endereco = {};
        campos.forEach(c => endereco[c] = document.getElementById(c).value);
        endereco.numeroresidencia = document.getElementById('numero-residencia').value;

        const cnpj = ehEmpresa() ? document.getElementById('cnpj').value : '';
        const reservatorio = ehEmpresa() && document.getElementById('reservatorio').checked;
        const complemento = document.getElementById('complemento').value;
        const quantidade = Number(document.getElementById('quantidade').value);
        const observacao = document.getElementById('observacao').value;

        const detalhes = [ehEmpresa() && `Empresa, CNPJ ${cnpj}${reservatorio ? ', solicita reservatório' : ''}`, observacao];
        const { data: empresa } = await axios.post(`${EMPRESA_API}/salvar-agendamento`, {
            nome: pessoa.nome,
            telefone: pessoa.telefone,
            dia: proximaColeta(),
            hora: '08:00',
            rua: endereco.rua,
            casa: endereco.numeroresidencia,
            bairro: endereco.bairro,
            complemento,
            quantidade_litros: quantidade,
            observacoes: detalhes.filter(Boolean).join(' | ')
        });

        await axios.post(`${API}/agendamentos`, {
            usuarioId: id,
            telefone: pessoa.telefone,
            ...endereco,
            tipo: ehEmpresa() ? 'empresa' : 'residencial',
            cnpj,
            reservatorio,
            complemento,
            quantidade,
            observacao,
            codigo: empresa.codigo,
            token: empresa.token,
            status: 'pendente',
            criadoEm: new Date().toISOString()
        });

        await axios.patch(`${API}/pessoas/${id}`, endereco);

        mensagemNaProximaPagina('Agendamento enviado com sucesso!');
        window.location.href = 'tela_solicitacoes.html';
    } catch (error) {
        console.error(error);
        mostrarMensagem(error.response?.data?.mensagem || 'Erro ao enviar o forms', true);
    }
});

async function carregarDados() {
    if (!id) {
        window.location.href = 'tela_login.html';
        return;
    }
    try {
        const { data } = await axios.get(`${API}/pessoas/${id}`);
        pessoa = data;
        document.getElementById('boas-vindas').textContent = `Olá, ${data.nome.trim().split(' ')[0]}!`;
        mostrarCard();
    } catch (error) {
        console.error(error);
    }
}

carregarDados();
