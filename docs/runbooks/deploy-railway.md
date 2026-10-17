# Operar e publicar os serviços Railway

**Verificado em:** 2026-10-17 17:19 UTC — leitura de `railway status --json`, variáveis do backend (somente nomes e host não secreto) e [estado WAHA via RPC](verificar-waha.md). **O procedimento de deploy e seu checklist pós-deploy não foram executados** nesta atualização; registrar data/contexto deles após um deploy real.

## Quando usar

Para confirmar a topologia, configurar o ambiente e publicar `labelle_back`, `labelle_front` ou `labelle_proxy`. O [plano antigo do WAHA](../archive/plano-migracao-waha-local.md) é histórico, não um passo a passo de deploy atual.

## Premissas e fontes de verdade

- No projeto Railway `labelle`, ambiente `production`, a consulta de 2026-10-17 encontrou **quatro serviços** com instâncias `RUNNING`: `Postgres`, `labelle_back`, `labelle_front` e `labelle_proxy`; não existe serviço WAHA na lista. O backend tem `WAHA_BASE_URL` apontando para o host externo `waha.softmediabox.com` e chave configurada. O WAHA respondeu do ponto de vista do backend com sessão `default` em `SCAN_QR_CODE`, aguardando pareamento; ver [verificar-waha.md](verificar-waha.md). Antes de operar, repetir a consulta de serviços e da sessão, pois esses estados mudam.
- A interface pública acessa o backend por funções de servidor do frontend: `LABELLE_API_URL` é a URL **privada** do backend. O navegador não deve receber token do WAHA nem chamar a API interna diretamente. Confira [`labelle_front/src/server/api.ts`](../../labelle_front/src/server/api.ts), [`labelle_back/config/runtime.exs`](../../labelle_back/config/runtime.exs) e [`labelle_proxy/Caddyfile`](../../labelle_proxy/Caddyfile).
- Use uma conta Railway com acesso ao projeto correto e confirme o ambiente selecionado com `railway status` antes de comandos que alteram serviços. O CLI deve estar instalado (`railway --version`). Não registrar valores de secrets em comandos compartilhados, logs ou documentos.
- Hosts, domínios, IDs, variáveis efetivas e saúde dos serviços são estado externo ao Git: consultar serviços, variáveis e deployments no painel Railway. Confirmar DNS/túnel e sessão WAHA no host/Cloudflare e no painel do produto. Não inferir o estado real a partir deste arquivo.
- Na leitura de `railway status --json`, os serviços de aplicação apareciam com `source.repo: null` e deployments anteriores por CLI; o push do commit de revisão `ce3a831` não mostrou um novo deployment ativo na consulta de 2026-10-17. Antes do próximo push operacional, conferir no painel a configuração atual de fonte/gatilhos de cada serviço. Se houver autodeploy seguindo `main`, configurar watch paths para ignorar `docs/**` e validar pelo histórico que commits só de docs não iniciam build.

## Preparação e validação local

1. Conferir a branch/commit a publicar, `git status -sb`, e o ambiente alvo com `railway status` dentro da pasta do serviço vinculada ao projeto. Não incluir alterações não commitadas por acidente.
2. Backend: em `labelle_back/`, executar `mix test`; o Dockerfile gera release e executa [`LabelleBack.Release.migrate/0`](../../labelle_back/lib/labelle_back/release.ex) antes do servidor iniciar.
3. Frontend: em `labelle_front/`, executar `npm run build` e `npx tsc --noEmit` (com dependências instaladas).
4. Proxy: conferir as rotas e o destino privado em [`labelle_proxy/Caddyfile`](../../labelle_proxy/Caddyfile); não expor `/api/json/*` por engano.

**Última evidência local:** na revisão de backend registrada em [revisao-backend-ash.md](../reviews/revisao-backend-ash.md), `mix test` passou (43 testes). Isso não verifica o frontend nem um deploy.

## Variáveis e roteamento

- **Backend:** `DATABASE_URL`, `SECRET_KEY_BASE`, `TOKEN_SIGNING_SECRET`, `PHX_HOST` e `PORT` são lidos por [`runtime.exs`](../../labelle_back/config/runtime.exs). Antes de configurar `LABELLE_API_URL`, consultar a variável `PORT` e o domínio privado efetivos no serviço backend do Railway; não copiar a porta local 4000 nem inferir o DNS do nome do serviço.
- **Frontend:** `LABELLE_API_URL` aponta para o backend na rede privada, com a porta real; `SESSION_SECRET` protege a sessão. Ver [`src/server/api.ts`](../../labelle_front/src/server/api.ts) e [`src/utils/session.ts`](../../labelle_front/src/utils/session.ts).
- **Proxy:** encaminha AshAdmin, login, assets, LiveView e a rota pública `POST /api/webhooks/waha` ao backend; recusa as demais rotas. Conferir [`Caddyfile`](../../labelle_proxy/Caddyfile) e o domínio público configurado no Railway.
- **WAHA:** no backend consultado, `WAHA_BASE_URL` e `WAHA_API_KEY` estão definidas, `WAHA_SESSION` é `default` e `WAHA_WEBHOOK_PUBLIC_URL` não está definida; portanto a release usa o default do [`runtime.exs`](../../labelle_back/config/runtime.exs). Antes de trocar domínio do proxy, definir `WAHA_WEBHOOK_PUBLIC_URL` para o novo endpoint público e conferir o webhook da sessão. A chave em texto plano pertence somente ao backend; proteger dashboard e túnel com os controles do provedor. Não publicar a chave no frontend.
- O webhook está **publicamente encaminhado no código**, mas [o controller](../../labelle_back/lib/labelle_back_web/controllers/api/waha_webhook_controller.ex) não autentica a origem e registra payload: é um achado aberto da [revisão A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log). Não tratar esse endpoint como rede privada.

## Publicar (apenas com autorização)

Rodar o comando da pasta de **cada serviço alterado**; `--path-as-root .` garante que o contexto de build tenha seu Dockerfile ou `package.json`. Confirmar o projeto/ambiente antes de iniciar. Serviços independentes podem ser publicados separadamente quando suas alterações não exigirem ordem por contrato.

```bash
cd labelle_back
railway up --service labelle_back --ci --path-as-root .

cd ../labelle_front
railway up --service labelle_front --ci --path-as-root .

cd ../labelle_proxy
railway up --service labelle_proxy --ci --path-as-root .
```

Não executar os três comandos por rotina se só um serviço mudou. Não usar `railway run` como se estivesse dentro da rede privada: ele executa localmente. Migrações normais são executadas pela release do backend; antes de qualquer seed em produção, conferir variáveis obrigatórias e credenciais de contas no script [`priv/repo/seeds.exs`](../../labelle_back/priv/repo/seeds.exs) para evitar senhas de fallback.

## Verificação pós-deploy e rollback

1. No Railway, confirmar que o deployment do serviço alterado terminou em sucesso e verificar logs/health. Se a CLI de logs ficar em streaming indefinidamente, usar a tela do deployment no painel.
2. Abrir o domínio público do frontend e verificar login/logout com conta de teste autorizada; verificar uma leitura administrativa e a disponibilidade do portal de agendamento. Para uma reserva real de teste, usar apenas cliente/horário autorizados e desfazer os dados de teste depois.
3. Se backend, frontend ou proxy mudou, confirmar que a comunicação privada frontend → backend e a rota `/admin` no proxy funcionam. Se WAHA/webhook mudou, verificar status da sessão e um envio **controlado** de mensagem ao número de teste, e conferir a entrega — resposta HTTP de envio não prova recebimento.
4. Confirmar que `/api/json/*` não ficou acessível pelo domínio do proxy. Registrar a data e resultado desta verificação no cabeçalho ao executá-la de verdade.
5. Se o deploy falhar, interromper alterações adicionais e restaurar o último deployment saudável do serviço afetado no Railway; se houver mudança de variáveis ou DNS, restaurar os valores anteriores a partir da fonte segura do ambiente. Não desligar nem remover a instância WAHA anterior sem confirmar o destino ativo e a capacidade de rollback.

## Armadilhas preservadas

- Na rede privada o DNS pode sanitizar o nome do serviço (`labelle_back` não implica host com underscore); obter o domínio no Railway. Frontend e proxy precisam usar a porta em que o backend realmente escuta.
- O backend exclui o host privado de `force_ssl`; o proxy reescreve o header `Host` para evitar loop de redirect. A origem do LiveView via proxy é configurada no endpoint.
- A ordem textual de diretivas Caddy não substitui os blocos `handle`: mudanças nas rotas exigem validar o match real, sobretudo `/admin` e o webhook.
- O backend não configura provedor de e-mail transacional em produção: o mailer usa adapter de teste. Não interpretar cadastro/recuperação por e-mail como entrega real sem configurar o provedor.
- A migração/provisionamento antigo do WAHA no Railway está no [plano histórico](../archive/plano-migracao-waha-local.md) e no histórico Git; não reutilizar comandos de criação de serviço/volume sem um novo plano e confirmação da topologia.
