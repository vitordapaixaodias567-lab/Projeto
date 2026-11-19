# Área da Empresa — Bio Óleo

Painel interno da equipe para acompanhar as coletas de óleo, junto com o rastreio, o app do entregador e o termo de responsabilidade.

## O que tem aqui

| Parte | O que faz | Onde |
|---|---|---|
| **Painel da empresa** | Lista os agendamentos, filtra por status, registra a entrega do frasco, marca como coletado (com litros) e cancela | `frontend/src/PainelEmpresa.jsx` → `http://localhost:5173/` |
| **Avisos** | A equipe escreve avisos para os clientes (com marca de "importante"), vê os enviados e exclui | `frontend/public/avisos.html` → `http://localhost:5173/avisos.html` |
| **Rastreio** | Status, linha do tempo, QR Code, mapa e posição da equipe ao vivo | `frontend/public/rastreio/rastreio.html` |
| **App do entregador** | Lista as entregas, compartilha o GPS, abre a navegação e conclui a coleta (pensado para o celular) | `frontend/public/rastreio/entregador.html` |
| **Termo de responsabilidade** | Aceite por assinatura na tela ou aceite digital; já marca o frasco como "entregue" | `frontend/public/termo.html` |
| **API** | Express + SQLite (um arquivo local, nada para instalar) | `../backend/` (na raiz do projeto) |

## Estrutura

```
Versao-final/
├── telas/ scripts/ img/ db.json   painel do cliente (HTML) e o banco dele (json-server, porta 3001)
├── backend/                       API da empresa (Node, porta 3000)
│   ├── app.js          servidor e rota de agendamento
│   ├── rastreio.js     rotas do painel, rastreio, entregador, termo e cancelamento pelo cliente
│   ├── avisos.js       rotas dos avisos da empresa para os clientes
│   ├── db.js           banco SQLite (cria as tabelas sozinho)
│   ├── google.js       rotas e geocodificação do Google (opcional)
│   ├── geocodificar.js endereço -> coordenadas
│   ├── scripts/        exemplo.mjs (cria agendamentos de teste)
│   ├── tests/          testes automáticos
│   └── .env.example    modelo de configuração
└── area-da-empresa/
    ├── frontend/       Painel (React + Vite, porta 5173) e páginas estáticas
    │   ├── src/        painel da empresa
    │   └── public/     avisos, rastreio, entregador, termo, imagens
    │                   empresa.css + cabecalho.js = visual e menu compartilhados
    └── docs/
        ├── RASTREIO.md     como a equipe usa e lista da API
        └── GOOGLE_MAPS.md  configuração do Google Maps (opcional)
```

## Como rodar

Precisa do **Node.js 22.13 ou mais novo** (o SQLite já vem dentro dele).

**1. Backend** (terminal 1, a partir da raiz do projeto)
```
cd backend
npm install
copy .env.example .env      (Linux/Mac: cp .env.example .env)
npm run dev
```
Abra o `.env` e troque o `ADMIN_KEY` por uma chave sua: é a senha de entrada do painel. Sem o arquivo `.env`, vale a chave de desenvolvimento `bioleo-admin`.

**2. Frontend** (terminal 2, a partir da raiz do projeto)
```
cd area-da-empresa/frontend
npm install
npm run dev
```

**3. Abrir** `http://localhost:5173/`, digitar a chave da equipe e entrar.

O painel começa vazio. Para ver como fica, crie 3 agendamentos fictícios (com o backend rodando):
```
cd backend
npm run exemplo
```

## De onde vêm os agendamentos

Do **painel do cliente** (`telas/tela_inicial.html`). Ao agendar, ele envia o pedido para:

`POST http://localhost:3000/salvar-agendamento` com JSON:
`nome, telefone, dia (AAAA-MM-DD), hora (HH:MM), rua, casa, bairro, quantidade_litros` (opcionais: `complemento`, `observacoes`).

A resposta traz o código do frasco (ex.: `BO-00001`) e o `token` do cliente. O painel do cliente guarda os dois no `db.json` e usa:

- `GET /api/frascos/:codigo?t=TOKEN` em "Minhas Solicitações", para mostrar o status que a equipe registrou;
- `POST /api/frascos/:codigo/cancelar` com `{ token }`, para o cliente cancelar, só enquanto a coleta está **agendada**;
- o botão "Rastrear", que abre `/rastreio/rastreio.html?id=...&t=...` neste site.

O `npm run exemplo` continua criando agendamentos de teste direto na API.

## Avisos para os clientes

A equipe escreve em `/avisos.html`. O painel do cliente lê a lista, sem chave, em:

`GET http://localhost:3000/api/avisos` → `[{ id, titulo, mensagem, importante, criadoEm }]` (mais novo primeiro, até 50).

Mostre `titulo` e `mensagem` como **texto** (`textContent`), nunca como HTML.

## Visual compartilhado

`frontend/public/empresa.css` (fundo, cores, botões e cards) e `frontend/public/cabecalho.js` (barra de menu) valem para avisos, rastreio, entregador e termo. O painel React usa o mesmo CSS e a mesma barra em `src/Cabecalho.jsx`. Se mudar os itens do menu, mude nos dois (`cabecalho.js` e `Cabecalho.jsx`).

## Testes

```
cd backend                   && npm test     (com o backend rodando, em outro terminal)
cd area-da-empresa/frontend  && npm test
```

## Antes de publicar

- Defina `ADMIN_KEY` no servidor (em produção o backend se recusa a iniciar sem ela).
- Use HTTPS: câmera (QR Code) e GPS não funcionam sem ele.
- Aponte o site para a API: `VITE_API_URL=https://api.seudominio.com.br npm run build` (na pasta `frontend`).
- O `cors()` aceita qualquer origem; restrinja ao seu domínio.
- Detalhes em `docs/RASTREIO.md` e `docs/GOOGLE_MAPS.md`.

## O que ficou de fora de propósito

Páginas do cliente (início, sobre, agendar, minhas coletas), login e cadastro de usuários, e a pasta do Google Maps antiga. Nada disso é necessário para o painel, o rastreio e o termo funcionarem.
