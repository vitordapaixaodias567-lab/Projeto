
const mascaras = {
    cpf: (v) => v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
    telefone: (v) => v.replace(/\D/g, '').slice(0, 11)
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2'),
    cep: (v) => v.replace(/\D/g, '').slice(0, 8)
        .replace(/^(\d{5})(\d)/, '$1-$2'),
    cnpj: (v) => v.replace(/\D/g, '').slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
};

function aplicarMascaras() {
    Object.keys(mascaras).forEach((nome) => {
        const campo = document.getElementById(nome);
        if (campo) campo.value = mascaras[nome](campo.value);
    });
}

Object.keys(mascaras).forEach((nome) => {
    const campo = document.getElementById(nome);
    if (campo) campo.addEventListener('input', () => { campo.value = mascaras[nome](campo.value); });
});

const campoCep = document.getElementById('cep');
if (campoCep) {
    campoCep.addEventListener('input', async () => {
        const cep = campoCep.value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
            if (data.erro) return mostrarMensagem('CEP não encontrado', true);
            if (data.localidade) document.getElementById('cidade').value = data.localidade;
            if (data.logradouro) document.getElementById('rua').value = data.logradouro;
            if (data.bairro) document.getElementById('bairro').value = data.bairro;
        } catch (error) {
            console.error(error);
        }
    });
}
