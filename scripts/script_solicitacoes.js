const API = 'http://localhost:3001';
const id = localStorage.getItem('usuarioId');
const lista = document.getElementById('lista-agendamentos');

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatarData = (texto) => texto ? new Date(texto.length === 10 ? texto + 'T12:00' : texto).toLocaleDateString('pt-BR') : null;

const ROTULOS = { AGENDADA: 'Coleta agendada', ENTREGUE: 'Frasco entregue', EM_ROTA: 'Equipe a caminho', COLETADO: 'Coletado', CANCELADA: 'Cancelado' };

async function buscarSituacao(a) {
    if (!a.codigo) return null;
    try {
        const { data } = await axios.get(`${EMPRESA_API}/api/frascos/${a.codigo}`, { params: { t: a.token } });
        return data.movimentacoes && data.cliente ? data : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function montarCard(a, empresa) {
    const atual = empresa ? empresa.movimentacoes.at(-1)?.status : null;
    const local = a.status ?? 'pendente';
    const cancelada = atual === 'CANCELADA' || (!atual && local === 'cancelado');
    const concluida = atual ? atual === 'COLETADO' : !['pendente', 'cancelado'].includes(local);
    const classe = cancelada ? 'ag-card--cancelado' : concluida ? 'ag-card--confirmado' : '';
    const rotulo = atual ? ROTULOS[atual] || atual : local === 'pendente' ? 'Aguardando confirmação' : local.charAt(0).toUpperCase() + local.slice(1);
    const dia = empresa ? empresa.dataPrevista.slice(0, 10) : a.data;
    const podeCancelar = atual ? atual === 'AGENDADA' : !a.codigo && local === 'pendente';
    return `<li class="ag-card ${classe}">
        <div class="ag-topo">
            <h3>Coleta: ${formatarData(dia) || 'data a definir'}</h3>
            <span class="ag-status">${esc(rotulo)}</span>
        </div>
        <p>${a.tipo === 'empresa' ? 'Empresa' : 'Coleta domiciliar'}${a.quantidade ? ' - ' + esc(a.quantidade) + ' litros' : ''}${empresa?.litrosColetados != null ? ' - ' + esc(empresa.litrosColetados) + ' L coletados' : ''}</p>
        <p>${esc([a.rua, a.numeroresidencia].filter(Boolean).join(', '))} - ${esc([a.bairro, a.cidade].filter(Boolean).join(', '))}</p>
        <p>CEP: ${esc(a.cep)}</p>
        ${a.codigo ? `<p>Código: ${esc(a.codigo)}</p>` : ''}
        ${a.reservatorio ? `<p>Reservatório solicitado${a.devolucao ? ' - devolução solicitada em ' + formatarData(a.devolucao.em) : ''}</p>` : ''}
        ${a.criadoEm ? `<p class="ag-feito">Agendado em ${formatarData(a.criadoEm)}</p>` : ''}
        <div class="ag-acoes">
            ${a.codigo ? `<a class="btn-rastrear" href="${EMPRESA_SITE}/rastreio/rastreio.html?id=${encodeURIComponent(a.codigo)}&t=${encodeURIComponent(a.token)}" target="_blank" rel="noopener">Rastrear</a>` : ''}
            ${podeCancelar ? `<button class="btn-cancelar" data-id="${esc(a.id)}" data-codigo="${esc(a.codigo || '')}" data-token="${esc(a.token || '')}">Cancelar</button>` : ''}
        </div>
    </li>`;
}

async function carregarAgendamentos() {
    try {
        const { data } = await axios.get(`${API}/agendamentos`, { params: { usuarioId: id } });
        const situacoes = await Promise.all(data.map(buscarSituacao));
        lista.innerHTML = data.length
            ? data.map((a, i) => montarCard(a, situacoes[i])).join('')
            : '<li class="ag-vazio">Nenhum agendamento ainda. <a href="tela_inicial.html">Agendar coleta</a></li>';
    } catch (error) {
        console.error(error);
        lista.innerHTML = '<li class="ag-vazio">Não foi possível carregar seus agendamentos.</li>';
    }
}

lista.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-cancelar');
    if (!btn || !confirm('Deseja cancelar este agendamento?')) return;
    try {

        if (btn.dataset.codigo) {
            await axios.post(`${EMPRESA_API}/api/frascos/${btn.dataset.codigo}/cancelar`, { token: btn.dataset.token });
        }
        await axios.patch(`${API}/agendamentos/${btn.dataset.id}`, { status: 'cancelado' });
        mostrarMensagem('Agendamento cancelado');
        carregarAgendamentos();
    } catch (error) {
        console.error(error);
        mostrarMensagem(error.response?.data?.mensagem || 'Erro ao cancelar o agendamento', true);
    }
});

async function carregarNome() {
    try {
        const { data: p } = await axios.get(`${API}/pessoas/${id}`);
        document.getElementById('boas-vindas').textContent = `Olá, ${p.nome.trim().split(' ')[0]}!`;
    } catch (error) {
        console.error(error);
    }
}

if (!id) {
    window.location.href = 'tela_login.html';
} else {
    carregarNome();
    carregarAgendamentos();
}
