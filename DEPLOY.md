# Deploy no Railway

Este monorepo (`labelle_back` + `labelle_front` + `labelle_proxy`) está
hospedado num único projeto Railway chamado **labelle**, com 4 serviços:

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

## Variáveis de ambiente

**labelle_back**:
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `SECRET_KEY_BASE`, `TOKEN_SIGNING_SECRET` — gerados com `mix phx.gen.secret`
- `PHX_HOST` = `labelleback.railway.internal`
- `PORT` — injetado automaticamente pelo Railway (8080)

**labelle_front**:
- `LABELLE_API_URL` = `http://${{labelle_back.RAILWAY_PRIVATE_DOMAIN}}:8080`
- `SESSION_SECRET` — gerado com `openssl rand -base64 32`

**labelle_proxy**: nenhuma variável própria — o hostname interno do backend
está hardcoded no `Caddyfile` (`labelleback.railway.internal:8080`).

## Redeployar depois de uma mudança de código

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
