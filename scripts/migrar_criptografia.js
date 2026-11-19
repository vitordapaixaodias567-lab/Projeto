

const fs = require('node:fs');
const path = require('node:path');
const Cripto = require('./criptografia');

const arquivo = path.join(__dirname, '..', 'db.json');

(async () => {
    const db = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    let alteradas = 0;

    for (const pessoa of db.pessoas || []) {
        const mudar = await Cripto.atualizarPessoa(pessoa);
        if (Object.keys(mudar).length) {
            Object.assign(pessoa, mudar);
            alteradas++;
        }
    }

    if (alteradas) {

        fs.writeFileSync(arquivo + '.tmp', JSON.stringify(db, null, 2));
        fs.renameSync(arquivo + '.tmp', arquivo);
    }
    console.log(alteradas ? `${alteradas} cadastro(s) criptografado(s) no db.json.` : 'Nada a fazer: o db.json já está protegido.');
})().catch((erro) => {
    console.error('Não foi possível criptografar o db.json:', erro.message);
    process.exit(1);
});
