

(function (raiz, fabrica) {
    const api = fabrica(raiz.crypto || require('node:crypto').webcrypto);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else raiz.Cripto = api;
})(typeof self !== 'undefined' ? self : globalThis, function (cripto) {
    const SEGREDO = 'bio-oleo::cpf::troque-esta-frase-antes-de-publicar';
    const ITERACOES = 600000;

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const paraB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const deB64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
    const soDigitos = (cpf) => String(cpf || '').replace(/\D/g, '');

    const iguais = (a, b) => {
        if (a.length !== b.length) return false;
        let dif = 0;
        for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return dif === 0;
    };

    function exigirWebCrypto() {
        if (!cripto || !cripto.subtle) {
            throw new Error('Criptografia indisponível: abra o site por localhost ou por https.');
        }
    }

    async function derivar(texto, sal, iteracoes, bits) {
        exigirWebCrypto();
        const base = await cripto.subtle.importKey('raw', enc.encode(texto), 'PBKDF2', false, ['deriveBits']);
        return cripto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, base, bits);
    }

    const eHashSenha = (valor) => typeof valor === 'string' && valor.startsWith('pbkdf2$');

    async function hashSenha(senha) {
        const sal = cripto.getRandomValues(new Uint8Array(16));
        return `pbkdf2$${ITERACOES}$${paraB64(sal)}$${paraB64(await derivar(senha, sal, ITERACOES, 256))}`;
    }

    async function conferirSenha(senha, guardado) {
        if (!guardado) return false;
        if (!eHashSenha(guardado)) return iguais(String(guardado), String(senha));
        const [, voltas, sal, hash] = guardado.split('$');
        const n = Number(voltas);
        if (!Number.isInteger(n) || n < 1 || n > 5000000 || !sal || !hash) return false;
        return iguais(paraB64(await derivar(senha, deB64(sal), n, 256)), hash);
    }

    let chaves = null;
    function obterChaves() {
        if (!chaves) {
            chaves = (async () => {
                const bits = new Uint8Array(await derivar(SEGREDO, enc.encode('bio-oleo-cpf-v1'), 100000, 512));
                return {
                    aes: await cripto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']),
                    hmac: await cripto.subtle.importKey('raw', bits.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
                };
            })();
        }
        return chaves;
    }

    const eCpfCriptografado = (valor) => typeof valor === 'string' && valor.startsWith('v1.');

    async function criptografarCpf(cpf) {
        const { aes } = await obterChaves();
        const iv = cripto.getRandomValues(new Uint8Array(12));
        const cifrado = await cripto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, enc.encode(soDigitos(cpf)));
        return `v1.${paraB64(iv)}.${paraB64(cifrado)}`;
    }

    async function lerCpf(guardado) {
        if (!guardado) return '';
        if (!eCpfCriptografado(guardado)) return soDigitos(guardado);
        try {
            const [, iv, cifrado] = guardado.split('.');
            const { aes } = await obterChaves();
            return dec.decode(await cripto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, aes, deB64(cifrado)));
        } catch {
            return '';
        }
    }

    async function hashCpf(cpf) {
        const { hmac } = await obterChaves();
        return paraB64(await cripto.subtle.sign('HMAC', hmac, enc.encode(soDigitos(cpf))));
    }

    async function protegerCpf(cpf) {
        const digitos = soDigitos(cpf);
        if (!digitos) return { cpf: '', cpfHash: '' };
        return { cpf: await criptografarCpf(digitos), cpfHash: await hashCpf(digitos) };
    }

    async function cpfEmUso(cpf, idAtual, urlPessoas) {
        const digitos = soDigitos(cpf);
        if (!digitos) return false;
        const resposta = await fetch(`${urlPessoas}?cpfHash=${encodeURIComponent(await hashCpf(digitos))}`);
        if (!resposta.ok) throw new Error('Não foi possível conferir o CPF.');
        return (await resposta.json()).some((p) => p.id !== idAtual);
    }

    async function atualizarPessoa(pessoa) {
        const mudar = {};
        if (pessoa.senha && !eHashSenha(pessoa.senha)) mudar.senha = await hashSenha(String(pessoa.senha));
        if (pessoa.cpf && !eCpfCriptografado(pessoa.cpf)) Object.assign(mudar, await protegerCpf(pessoa.cpf));
        else if (eCpfCriptografado(pessoa.cpf) && !pessoa.cpfHash) mudar.cpfHash = await hashCpf(await lerCpf(pessoa.cpf));
        return mudar;
    }

    return { hashSenha, conferirSenha, protegerCpf, lerCpf, cpfEmUso, atualizarPessoa, eHashSenha, eCpfCriptografado };
});
