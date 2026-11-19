# Bio-Óleo

Coleta de óleo de cozinha usado. Duas partes ligadas entre si:

| Parte | O que é | Porta | Onde |
|---|---|---|---|
| **Painel do cliente** | Telas HTML: cadastro, agendamento, solicitações, avisos, perfil | Live Server (5500) | `telas/` + `scripts/` |
| **Banco do cliente** | json-server com contas e agendamentos | 3001 | `db.json` |
| **API da empresa** | Express + SQLite: agendamentos, rastreio, entregador, termo, avisos | 3000 | `backend/` |
| **Área da empresa** | Painel, avisos, rastreio e app do entregador | 5173 | `area-da-empresa/frontend/` |

## Como rodar (4 terminais, a partir desta pasta)

```
npm install && npm run server            banco do cliente (3001)
cd backend && npm install && npm run dev  API da empresa (3000)   [precisa do Node 22.13+]
cd area-da-empresa/frontend && npm install && npm run dev   área da empresa (5173)
```
E abra `telas/tela_abertura.html` com o Live Server do VS Code. Chave da equipe (painel da empresa): `bioleo-admin`
(troque em `backend/.env`, veja `backend/.env.example`).

## Como as partes conversam

O cliente agenda → o agendamento vai para a API da empresa (que devolve código e comprovante) e fica guardado no
`db.json`. A empresa atualiza o status no painel dela → o cliente vê em "Minhas Solicitações" e em "Rastrear". O cliente
pode cancelar enquanto a coleta só está agendada. Os avisos que a empresa publica aparecem na tela "Avisos" do cliente.

Os endereços da empresa que o painel do cliente usa ficam em `scripts/config_empresa.js`.

## Senha e CPF

O cadastro não guarda a senha: o `db.json` recebe só o hash (PBKDF2-SHA256 com sal). O CPF vai criptografado (AES-256-GCM)
e o perfil o mostra de volta; o `cpfHash` impede o mesmo CPF em duas contas. Tudo isso está em `scripts/criptografia.js`.

- Cadastros antigos (senha e CPF em texto puro) são convertidos no primeiro login, ou de uma vez com `npm run criptografar`
  (pare o json-server antes).
- **Limite:** a frase `SEGREDO` fica nesse arquivo, então quem tem o código do site consegue abrir os CPFs. Isso protege o
  `db.json`, não substitui criptografar no servidor. Troque a frase antes de haver dados, e não troque depois.
- A criptografia do navegador só funciona em `localhost` ou `https`.

Mais sobre a área da empresa em `area-da-empresa/README.md`.
