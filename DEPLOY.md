# Deploy no Railway

Este monorepo (`labelle_back` + `labelle_front` + `labelle_proxy`) está
hospedado num único projeto Railway chamado **labelle**, com 5 serviços:

- **Postgres** — banco gerenciado do Railway (produção; separado do Postgres
  local em Docker usado em dev)
- **labelle_back** — API Elixir/Phoenix/Ash. Sem domínio público — só
  acessível via rede privada do Railway
- **labelle_front** — app TanStack Start (React). Domínio público principal,
  já que todo o tráfego do navegador passa por ele (padrão BFF: o navegador
  nunca fala direto com `labelle_back`)
- **labelle_proxy** — Caddy, domínio público próprio, só encaminha
  `/admin` (AshAdmin) pra rede interna do `labelle_back`. Existe pra dar
  acesso externo ao painel admin sem expor o resto da API publicamente
- **labelle_waha** — [WAHA](https://github.com/devlikeapro/waha) (WhatsApp
  HTTP API, self-hosted), conectado ao número de WhatsApp da empresa via QR
  code. Sem domínio público — só o `labelle_back` fala com ele, pela rede
  privada. Diferente dos outros serviços, **não tem código nosso**: roda
  direto da imagem Docker `devlikeapro/waha:latest`, sem repo/build (igual o
  Postgres).

Domínio público do app: `https://labellefront-production.up.railway.app`
Domínio público do admin: `https://labelleproxy-production.up.railway.app/admin`

## Por que a rede privada

Todo o código do frontend que fala com a API roda em `createServerFn`/
`createServerOnlyFn` do TanStack Start — ou seja, só no servidor Node, nunca
no navegador do usuário. Isso permite usar a URL **interna**
(`*.railway.internal`) do `labelle_back` no `LABELLE_API_URL`, sem precisar
expor a API publicamente nem configurar CORS.

## Pegadinhas descobertas (importante se for redeployar do zero)

1. **Nome do serviço no domínio interno é sanitizado**: o serviço
   `labelle_back` (com underscore) tem domínio interno
   `labelleback.railway.internal` (sem underscore) — o Railway remove
   caracteres especiais do nome pro DNS. Sempre confirme o valor real via
   `${{labelle_back.RAILWAY_PRIVATE_DOMAIN}}`, não assuma o nome do serviço.
2. **Railway injeta `PORT` automaticamente (8080 por padrão)** pra todo
   serviço. Como `config/runtime.exs` do backend lê `PORT` do ambiente
   (`System.get_env("PORT", "4000")`), o Bandit acaba escutando em **8080**,
   não 4000. O `LABELLE_API_URL` do frontend precisa apontar pra
   `:8080`, não pra porta "óbvia" do config local.
3. **DATABASE_URL da rede privada do Postgres não é alcançável do seu
   notebook** (`railway run` roda localmente, não dentro da rede do
   Railway). Pra rodar `mix run priv/repo/seeds.exs` contra produção,
   aponte temporariamente `DATABASE_URL` pra
   `${{Postgres.DATABASE_PUBLIC_URL}}` (proxy TCP público), rode o
   comando, e depois **reverta pra `${{Postgres.DATABASE_URL}}`** (interno)
   e reimplante.
4. **`mix run` precisa de `MIX_ENV=prod` explícito** — sem isso, mesmo com
   `DATABASE_URL` injetado pelo Railway, o app usa `config/dev.exs` (que
   tem credenciais fixas de localhost) e ignora a variável de ambiente.
5. **Mailer**: `config/prod.exs` desabilita o `Swoosh.Adapters.Local`
   (`config :swoosh, local: false`), mas sem um provedor real configurado o
   adapter continuava `Local`, e o envio do email de confirmação (disparado
   automaticamente por `register_with_password`) derrubava a transação
   inteira. Como não há provedor de email configurado neste projeto,
   `config/prod.exs` força `LabelleBack.Mailer` pro adapter `Test` (no-op).
6. **`force_ssl`**: por padrão só excluía `localhost`/`127.0.0.1`. Como o
   tráfego interno entre os serviços é HTTP simples (sem TLS), foi
   necessário adicionar `labelleback.railway.internal` à lista de exclusão
   em `config/prod.exs`, senão toda chamada do frontend pro backend levava
   redirect 301 pra HTTPS.
7. **CLI do Railway precisa de pseudo-terminal** pra alguns comandos
   interativos (`railway add`) neste ambiente sem TTY real — usar
   `script -q /dev/null <comando>`.
8. **`railway up` sobe a partir da raiz do projeto linkado**, não do
   diretório atual — use sempre `--path-as-root .` rodando de dentro da
   pasta do serviço (`labelle_back/`, `labelle_front/` ou `labelle_proxy/`),
   senão o Railpack não encontra o Dockerfile/package.json certo.
9. **Caddy não executa diretivas na ordem escrita no Caddyfile** — ele
   reordena por tipo de diretiva. Um `reverse_proxy /admin*` seguido de um
   `respond` incondicional pode acabar com o `respond` disparando primeiro
   mesmo pra `/admin`. Use blocos `handle { }` (avaliados em ordem, primeiro
   que casar vence) pra roteamento por path exclusivo.
10. **`labelle_proxy` reescreve o header `Host`** (`header_up Host
    labelleback.railway.internal`) ao encaminhar pro backend — sem isso, o
    `force_ssl` do `labelle_back` não reconhece a exceção configurada (que é
    por host) e cria um loop de redirect pra uma URL interna inalcançável
    pelo navegador.
11. **`check_origin` do socket LiveView** (`lib/labelle_back_web/endpoint.ex`)
    precisa incluir explicitamente a URL do `labelle_proxy` — por padrão só
    aceita a origem que bate com `PHX_HOST`, e o navegador conecta a partir
    do domínio do proxy, não do domínio interno.
12. **`/admin` (AshAdmin) tem sua própria flag `admin_routes`**, separada de
    `dev_routes` — precisa existir em produção (ao contrário de
    `/dev/dashboard`/`/oban`, que continuam só em dev).
13. **AshAuthentication sempre redireciona pra `/` depois do login**, sem
    opção de configurar esse destino. `PageController.home` (em
    `lib/labelle_back_web/controllers/page_controller.ex`) bounce admins
    logados direto pra `/admin`; o Caddyfile também precisa liberar a raiz
    exata (`handle /`, sem wildcard) pra esse redirect nem sequer chegar no
    backend.
14. **`railway volume add --service X --mount-path Y` dá panic** nessa
    versão do CLI (`Option::unwrap() on a None value`). Criar o volume do
    `labelle_waha` via GraphQL (`volumeCreate`) em vez da CLI — ver seção
    "WhatsApp (WAHA)" abaixo.
15. **Porta real do WAHA é 8080, não a que a doc dele sugere (3000)** —
    confirmado lendo o log de boot (`WhatsApp HTTP API is running on:
    http://[::1]:8080`). Mesma regra de sempre: não assumir porta, checar o
    log.
16. **Sessão do WAHA não existe/nasce parada.** Buscar o QR code antes de
    criar a sessão (`POST /api/sessions`) dá 422 `"does not exist"`; criar
    sem `start: true` deixa em `STOPPED` e o QR endpoint dá outro 422
    (`"expected": ["SCAN_QR_CODE"]`). É preciso criar com `start: true` e
    **esperar** (polling) o status virar `SCAN_QR_CODE` antes de buscar o QR
    — o engine WEBJS sobe um Chromium headless por trás, não é instantâneo.
    Implementado em `LabelleBack.Messaging.WhatsApp.Waha.qr_code/0`
    (`lib/labelle_back/messaging/whats_app/waha.ex`).
17. **Streaming de log da CLI não é confiável**: `railway up` costuma falhar
    com "Failed to retrieve build log" (poll o status via GraphQL
    `deployment(id) { status }` em vez de esperar o stream), e `railway
    logs --service X` abre um stream que não fecha sozinho (rodar em
    background e ler o log capturado, ou usar `deploymentLogs` via GraphQL
    direto, que é o que a seção "WhatsApp (WAHA) → Depurar" usa).

## Arquivos de deploy

- `labelle_back/Dockerfile` — build multi-stage (Elixir 1.17.2 / OTP 27.0.1),
  gera `mix release`. Roda migrations (`LabelleBack.Release.migrate/0`,
  em `lib/labelle_back/release.ex`) antes de iniciar o servidor.
- `labelle_back/.dockerignore`
- `labelle_front/package.json` — script `start`:
  `srvx serve --prod --static ../client --entry ./dist/server/server.js`
  (o caminho do `--static` é relativo à pasta do arquivo de entrada, não do
  diretório atual — por isso `../client`, não `./dist/client`)
- `labelle_proxy/Caddyfile` + `Dockerfile` (`FROM caddy:2-alpine`) — só
  encaminha `/admin*`, `/live*`, `/sign-in*`, `/auth*`, `/assets*` e a raiz
  exata (`/`) pro `labelle_back` interno; qualquer outro path dá 404
- `labelle_waha` não tem arquivo de deploy próprio neste repo — é só a
  imagem `devlikeapro/waha:latest` configurada direto no Railway (variáveis
  de ambiente + volume), sem Dockerfile nem pasta de código.

## Variáveis de ambiente

**labelle_back**:
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `SECRET_KEY_BASE`, `TOKEN_SIGNING_SECRET` — gerados com `mix phx.gen.secret`
- `PHX_HOST` = `labelleback.railway.internal`
- `PORT` — injetado automaticamente pelo Railway (8080)
- `WAHA_BASE_URL` = `http://labellewaha.railway.internal:8080`
- `WAHA_API_KEY` — a mesma chave (texto plano) usada pra gerar o hash em
  `labelle_waha` (ver abaixo)
- `WAHA_SESSION` = `default`
- Se `WAHA_BASE_URL` não estiver setada, o adapter de WhatsApp cai em
  `NotConfigured` (`config/config.exs`) — nada quebra, só não envia mensagem
  de verdade (ver `lib/labelle_back/messaging/whats_app.ex`).

**labelle_front**:
- `LABELLE_API_URL` = `http://${{labelle_back.RAILWAY_PRIVATE_DOMAIN}}:8080`
- `SESSION_SECRET` — gerado com `openssl rand -base64 32`

**labelle_proxy**: nenhuma variável própria — o hostname interno do backend
está hardcoded no `Caddyfile` (`labelleback.railway.internal:8080`).

**labelle_waha**:
- `WAHA_API_KEY` = `sha512:<hash>` (nunca a chave em texto plano aqui — só o
  hash; a chave em texto plano vai pro `labelle_back`)
- `WHATSAPP_DEFAULT_ENGINE` = `WEBJS`
- `WHATSAPP_RESTART_ALL_SESSIONS` = `true` (retoma sozinho a sessão pareada
  se o container reiniciar, contanto que o volume esteja intacto)
- Volume persistente montado em `/app/.sessions` — sem isso a sessão pareada
  (QR code escaneado) some a cada redeploy/restart.

## WhatsApp (WAHA)

### Provisionar o serviço (uma vez só)

```bash
script -q /dev/null railway add --service labelle_waha \
  --image devlikeapro/waha:latest \
  --variables "WHATSAPP_DEFAULT_ENGINE=WEBJS" \
  --variables "WHATSAPP_RESTART_ALL_SESSIONS=true"

KEY=$(openssl rand -hex 32)
HASH=$(printf '%s' "$KEY" | openssl dgst -sha512 -hex | sed 's/^.* //')
railway variables --service labelle_waha --set "WAHA_API_KEY=sha512:${HASH}" --skip-deploys
railway variables --service labelle_back --set "WAHA_BASE_URL=http://labellewaha.railway.internal:8080" --skip-deploys
railway variables --service labelle_back --set "WAHA_API_KEY=${KEY}" --skip-deploys
railway variables --service labelle_back --set "WAHA_SESSION=default" --skip-deploys
```

O volume em `/app/.sessions` precisa ser criado via GraphQL (`railway volume
add` dá panic nessa versão do CLI — ver pegadinha 14):

```bash
TOKEN=$(cat ~/.railway/config.json | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['token'])")
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query": "mutation($input: VolumeCreateInput!) { volumeCreate(input: $input) { id name } }", "variables": {"input": {"projectId": "<project-id>", "environmentId": "<env-id>", "serviceId": "<labelle_waha-service-id>", "mountPath": "/app/.sessions"}}}'
```

Redeploy o `labelle_waha` depois de criar o volume/variáveis, e o
`labelle_back` depois de apontar `WAHA_BASE_URL`/`WAHA_API_KEY`:

```bash
railway redeploy --service labelle_waha --yes
railway redeploy --service labelle_back --yes
```

### Parear/reparear o número

Não é feito por CLI — é pela própria tela **Configurações** do app
(painel "Conexão WhatsApp da empresa"), logado como admin:
1. Botão **Gerar QR code** → escaneia com o WhatsApp do celular da empresa
   (Aparelhos conectados → Conectar um aparelho).
2. Pra trocar de número: botão **Desparear** primeiro, depois gerar um QR
   code novo.

O painel consulta o status sob demanda (sem polling automático) — não há
webhook de "caiu a conexão" no WAHA; se a sessão desconectar sozinha, só se
percebe voltando nessa tela.

### Depurar

Logs do WAHA via GraphQL (ver pegadinha 17 sobre streaming de log da CLI):

```bash
TOKEN=$(cat ~/.railway/config.json | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['token'])")
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query": "query { deploymentLogs(deploymentId: \"<deployment-id>\", limit: 500) { message timestamp } }"}'
```

## Redeployar depois de uma mudança de código

`labelle_waha` não entra nesse fluxo — não tem código nosso pra mudar. Só se
redeploya ele quando muda variável/volume (`railway redeploy --service
labelle_waha --yes`, ver seção "WhatsApp (WAHA)" acima).

```bash
# backend
cd labelle_back
docker build -t labelle_back_test .   # valida localmente antes (mais rápido que esperar o Railway)
railway up --service labelle_back --ci --path-as-root .

# frontend
cd ../labelle_front
npm run build                         # valida localmente antes
railway up --service labelle_front --ci --path-as-root .

# proxy do admin (só mexe se mudar o Caddyfile)
cd ../labelle_proxy
railway up --service labelle_proxy --ci --path-as-root .
```

## Rodar seed/migração manual contra produção

```bash
cd labelle_back
railway variables --service labelle_back --set 'DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}' --skip-deploys
MIX_ENV=prod railway run --service labelle_back mix run priv/repo/seeds.exs
railway variables --service labelle_back --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --skip-deploys
railway redeploy --service labelle_back --yes
```

(Migrations rodam automaticamente a cada deploy via o CMD do Dockerfile —
não precisa rodar `mix ash.migrate` manualmente.)
