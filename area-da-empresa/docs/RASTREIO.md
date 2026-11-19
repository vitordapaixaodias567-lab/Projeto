# Rastreio e Monitoramento — Bio Óleo / Brasil

Como rodar: veja o `README.md` da raiz.

## Como a equipe usa

1. **Painel da empresa** (`/`): digite a chave da equipe. Lista os agendamentos; botões para registrar a entrega do frasco, **marcar como coletado** (pede os litros) e cancelar.
2. **Rastreio, mapa e posição ao vivo** (botão de cada coleta): *Marcar local da coleta* (clique no mapa; use quando o endereço não for localizado sozinho) e *Compartilhar posição ao vivo* (pede o GPS, muda o status para "Equipe a caminho" e envia a posição a cada ~10 s até a coleta terminar).
3. **App do entregador** (`/rastreio/entregador.html`): lista as entregas, compartilha o GPS, abre a navegação e conclui a coleta, tudo no celular.
4. **Termo** (`/termo.html`): o responsável assina na tela ou aceita digitalmente; o frasco passa para "Entregue".
5. **Avisos** (`/avisos.html`): a equipe escreve um aviso (pode marcar como importante), vê os enviados e exclui. O painel do cliente lê em `GET /api/avisos`.

Qualquer pessoa pode abrir `rastreio.html?id=BO-00001` (ou ler o QR Code): sem o comprovante do cliente (`&t=...`) ou a chave da equipe, vê **só o ID e o status**.

## Etapas de um frasco

`AGENDADA` → `ENTREGUE` → `EM_ROTA` → `COLETADO` (ou `CANCELADA`). Depois de `COLETADO` ou `CANCELADA` nada mais é aceito e a posição da equipe deixa de ser exposta.

## Configurações externas (precisam ser feitas por vocês)

| O quê | Detalhe |
|---|---|
| Arquivo `.env` | Copie `backend/.env.example` para `backend/.env` e preencha (não vai para o GitHub). |
| Chave da equipe | `ADMIN_KEY` no `.env`. Sem isso vale a chave de DESENVOLVIMENTO `bioleo-admin` (o terminal avisa). **Troque antes de publicar.** |
| Google Maps (opcional, recomendado) | Projeto + faturamento + 3 APIs + 2 chaves. Sem chaves: OpenStreetMap + distância em linha reta. Passo a passo em `GOOGLE_MAPS.md`. |
| HTTPS | Câmera (ler QR) e GPS só funcionam em HTTPS ou localhost. |
| Ponto de partida | `BASE_LAT`/`BASE_LNG` (ou `BASE_ENDERECO`) para a rota planejada. |
| QR Code no celular | Em `frontend/public/rastreio/config.js`, defina `BIOOLEO_SITE_URL` com o endereço do site (ex.: `http://192.168.0.10:5173` na mesma rede Wi-Fi). |
| Limite do navegador | A posição ao vivo só é enviada com a página do entregador aberta e a tela ligada. Para rastrear em segundo plano, use um app de rastreio ou rastreador GPS que envie a posição para a API. |
| LGPD | A posição da equipe só aparece para o cliente da coleta e some quando ela termina. Posições antigas são apagadas (padrão 30 dias, `RETENCAO_DIAS`). Definam a política final. |

## API (`backend/rastreio.js`, prefixo `/api`)

Públicas
- `GET /api/frascos/:id[?t=comprovante]` — sem comprovante: ID e status; com comprovante ou chave: tudo (inclui `destino`, `origem`, `rota`).
- `GET /api/config/mapa` — qual mapa usar e a chave pública do navegador.
- `POST /api/frascos/:id/cancelar` `{token}` — o cliente cancela a própria coleta (painel do cliente). Só vale com o comprovante certo e enquanto o status é AGENDADA; depois disso, 409.

Exigem o cabeçalho `x-admin-key`
- `GET /api/admin/frascos` — lista do painel.
- `POST /api/frascos/:id/movimentacoes` `{status: ENTREGUE|EM_ROTA|COLETADO|CANCELADA, litrosColetados?}`
- `POST /api/frascos/:id/localizacoes` `{lat, lng, precisaoM}`
- `PUT /api/frascos/:id/destino` `{lat, lng}`
- `POST /api/frascos/:id/termo` `{tipo: ASSINATURA|ACEITE, nome, assinatura?}` e `GET /api/admin/frascos/:id/termo`
- `GET /listar-agendamento` — dados completos dos agendamentos.

Avisos da empresa (`backend/avisos.js`)
- `GET /api/avisos` — pública: o painel do cliente lê a lista (mais novo primeiro).
- `GET /api/admin/avisos` — a mesma lista, exige a chave.
- `POST /api/admin/avisos` `{titulo, mensagem, importante?}` — exige a chave.
- `DELETE /api/admin/avisos/:id` — exige a chave.

Pública, para o formulário de agendamento
- `POST /salvar-agendamento`

O ID do frasco é `BO-` + número do agendamento com 5 dígitos.

## Modo demonstração

`rastreio.html?demo=1` usa dados de mentira (IDs `BO-00003`, `BO-00005`, `BO-00007`), sem precisar do backend.
