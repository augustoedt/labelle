# Operar e publicar os serviços Railway

**Verificado em:** 2026-10-17 — fonte GitHub `main` ligada a backend/frontend; deployments do commit `5f8fc2e` em `SUCCESS` e instâncias `RUNNING` (`back` `2f41d344-e3fa-4aa3-9161-a50e549d255d`, `front` `5b63a7bc-9e91-4bf0-b6b0-c2784197cad0`). Verificações técnicas descritas abaixo foram executadas; login autenticado e envio WhatsApp não foram testados neste deploy e exigem conta/número de teste autorizados no próximo ciclo.

## Quando usar

Para confirmar a topologia, configurar o ambiente e publicar `labelle_back`, `labelle_front` ou `labelle_proxy`. O [plano antigo do WAHA](../archive/plano-migracao-waha-local.md) é histórico, não um passo a passo de deploy atual.

## Premissas e fontes de verdade

- No projeto Railway `labelle`, ambiente `production`, a consulta de 2026-10-17 encontrou **quatro serviços** com instâncias `RUNNING`: `Postgres`, `labelle_back`, `labelle_front` e `labelle_proxy`; não existe serviço WAHA na lista. O backend tem `WAHA_BASE_URL` apontando para o host externo `waha.softmediabox.com` e chave configurada. O WAHA respondeu do ponto de vista do backend com sessão `default` em `SCAN_QR_CODE`, aguardando pareamento; ver [verificar-waha.md](verificar-waha.md). Antes de operar, repetir a consulta de serviços e da sessão, pois esses estados mudam.
- A interface pública acessa o backend por funções de servidor do frontend: `LABELLE_API_URL` é a URL **privada** do backend. O navegador não deve receber token do WAHA nem chamar a API interna diretamente. Confira [`labelle_front/src/server/api.ts`](../../labelle_front/src/server/api.ts), [`labelle_back/config/runtime.exs`](../../labelle_back/config/runtime.exs) e [`labelle_proxy/Caddyfile`](../../labelle_proxy/Caddyfile).
- Use uma conta Railway com acesso ao projeto correto e confirme o ambiente selecionado com `railway status` antes de comandos que alteram serviços. O CLI deve estar instalado (`railway --version`). Não registrar valores de secrets em comandos compartilhados, logs ou documentos.
- Hosts, domínios, IDs, variáveis efetivas e saúde dos serviços são estado externo ao Git: consultar serviços, variáveis e deployments no painel Railway. Confirmar DNS/túnel e sessão WAHA no host/Cloudflare e no painel do produto. Não inferir o estado real a partir deste arquivo.
- `labelle_back` e `labelle_front` foram ligados ao repositório GitHub `augustoedt/labelle`, branch `main`. São subprojetos isolados: root directory `/labelle_back` e `/labelle_front`, respectivamente. Watch paths `/labelle_back/**` e `/labelle_front/**` impedem que mudanças somente em `docs/**` iniciem builds desses dois serviços. O backend usa Dockerfile em `/labelle_back/Dockerfile`; o frontend usa Railpack. A fonte e os caminhos foram lidos de volta em `railway environment config --json` após a alteração. `labelle_proxy` não foi vinculado nesta etapa e permanece com deploy via CLI.

## Preparação e validação local

1. Conferir a branch/commit a publicar, `git status -sb`, e o ambiente alvo com `railway status` dentro da pasta do serviço vinculada ao projeto. Não incluir alterações não commitadas por acidente.
2. Backend: em `labelle_back/`, executar `mix test`; o Dockerfile gera release e executa [`LabelleBack.Release.migrate/0`](../../labelle_back/lib/labelle_back/release.ex) antes do servidor iniciar.
3. Frontend: em `labelle_front/`, executar `npm run build` e `npx tsc --noEmit` (com dependências instaladas).
4. Proxy: conferir as rotas e o destino privado em [`labelle_proxy/Caddyfile`](../../labelle_proxy/Caddyfile); não expor `/api/json/*` por engano.

**Última evidência local:** `mix test` no backend passou com 43 testes na [revisão](../reviews/revisao-backend-ash.md); `npm run build && npx tsc --noEmit` no frontend passou antes do vínculo GitHub. Isso não substitui a verificação dos deployments.

## Variáveis e roteamento

- **Backend:** `DATABASE_URL`, `SECRET_KEY_BASE`, `TOKEN_SIGNING_SECRET`, `PHX_HOST` e `PORT` são lidos por [`runtime.exs`](../../labelle_back/config/runtime.exs). Antes de configurar `LABELLE_API_URL`, consultar a variável `PORT` e o domínio privado efetivos no serviço backend do Railway; não copiar a porta local 4000 nem inferir o DNS do nome do serviço.
- **Frontend:** `LABELLE_API_URL` aponta para o backend na rede privada, com a porta real; `SESSION_SECRET` protege a sessão. Ver [`src/server/api.ts`](../../labelle_front/src/server/api.ts) e [`src/utils/session.ts`](../../labelle_front/src/utils/session.ts).
- **Proxy:** encaminha AshAdmin, login, assets, LiveView e a rota pública `POST /api/webhooks/waha` ao backend; recusa as demais rotas. Conferir [`Caddyfile`](../../labelle_proxy/Caddyfile) e o domínio público configurado no Railway.
- **WAHA:** no backend consultado, `WAHA_BASE_URL` e `WAHA_API_KEY` estão definidas, `WAHA_SESSION` é `default` e `WAHA_WEBHOOK_PUBLIC_URL` não está definida; portanto a release usa o default do [`runtime.exs`](../../labelle_back/config/runtime.exs). Antes de trocar domínio do proxy, definir `WAHA_WEBHOOK_PUBLIC_URL` para o novo endpoint público e conferir o webhook da sessão. A chave em texto plano pertence somente ao backend; proteger dashboard e túnel com os controles do provedor. Não publicar a chave no frontend.
- O webhook está **publicamente encaminhado no código**, mas [o controller](../../labelle_back/lib/labelle_back_web/controllers/api/waha_webhook_controller.ex) não autentica a origem e registra payload: é um achado aberto da [revisão A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log). Não tratar esse endpoint como rede privada.

## Publicar (apenas com autorização)

Para backend e frontend, o fluxo principal é fazer commit e push para `main`: Railway observa **apenas** a pasta correspondente de cada serviço. Antes do push, confirmar `git status -sb`, o diff e a branch. Após o push, acompanhar pelo ID do deployment de **cada serviço alterado** até `SUCCESS`; upload/build iniciado não equivale a deploy concluído. Mudanças fora das pastas monitoradas, inclusive `docs/**`, não iniciam builds desses dois serviços.

Como alternativa para um deploy manual de código local, `railway up` continua disponível; confirme se deseja publicar o checkout local em vez do commit de `main`:

```bash
cd labelle_back
railway up --service labelle_back --ci --path-as-root .

cd ../labelle_front
railway up --service labelle_front --ci --path-as-root .

cd ../labelle_proxy
railway up --service labelle_proxy --ci --path-as-root .
```

`labelle_proxy` permanece sem fonte GitHub e requer publicação manual da pasta `labelle_proxy/` quando seu código mudar. Não executar comandos dos três serviços por rotina se só um mudou. Não usar `railway run` como se estivesse dentro da rede privada: ele executa localmente. Migrações normais são executadas pela release do backend; antes de qualquer seed em produção, conferir variáveis obrigatórias e credenciais de contas no script [`priv/repo/seeds.exs`](../../labelle_back/priv/repo/seeds.exs) para evitar senhas de fallback.

## Verificação pós-deploy e rollback

**Execução de 2026-10-17:** ambos os deployments GitHub chegaram a `SUCCESS` e `RUNNING`; `GET /agendar` e `GET /login` no frontend responderam 200; `GET /admin` no proxy respondeu 302 (redirecionamento de autenticação); `GET /api/json/` pelo proxy respondeu 404. Via SSH/RPC, o backend executou `SELECT 1` no PostgreSQL; do container frontend, `POST /api/client/settings` na API privada respondeu 200. Essas verificações comprovam roteamento e conectividade, não um atendimento completo. **Na próxima publicação funcional autorizada**, executar também login/logout com conta de teste e, quando WAHA estiver `WORKING`, envio controlado ao número de teste.

1. No Railway, confirmar que o deployment do serviço alterado terminou em sucesso e verificar logs/health. Se a CLI de logs ficar em streaming indefinidamente, usar a tela do deployment no painel.
2. Abrir o domínio público do frontend e verificar login/logout com conta de teste autorizada; verificar uma leitura administrativa e a disponibilidade do portal de agendamento. Para uma reserva real de teste, usar apenas cliente/horário autorizados e desfazer os dados de teste depois.
3. Se backend, frontend ou proxy mudou, confirmar que a comunicação privada frontend → backend e a rota `/admin` no proxy funcionam. Se WAHA/webhook mudou, verificar status da sessão e um envio **controlado** de mensagem ao número de teste, e conferir a entrega — resposta HTTP de envio não prova recebimento.
4. Confirmar que `/api/json/*` não ficou acessível pelo domínio do proxy. Registrar a data e resultado desta verificação no cabeçalho ao executá-la de verdade.
5. Se o deploy falhar, interromper alterações adicionais e restaurar o último deployment saudável do serviço afetado no Railway; se houver mudança de variáveis ou DNS, restaurar os valores anteriores a partir da fonte segura do ambiente. Não desligar nem remover a instância WAHA anterior sem confirmar o destino ativo e a capacidade de rollback.

## Armadilhas preservadas

- Ao conectar um monorepo GitHub, o caminho configurado do Dockerfile é relativo à raiz do repositório, mesmo com `rootDirectory: /labelle_back`: usar `/labelle_back/Dockerfile`. O primeiro build automático falhou com `failed to read Dockerfile at 'Dockerfile'` quando foi usado `/Dockerfile`; a correção foi aplicada antes do redeploy a partir da fonte.
- Na rede privada o DNS pode sanitizar o nome do serviço (`labelle_back` não implica host com underscore); obter o domínio no Railway. Frontend e proxy precisam usar a porta em que o backend realmente escuta.
- O backend exclui o host privado de `force_ssl`; o proxy reescreve o header `Host` para evitar loop de redirect. A origem do LiveView via proxy é configurada no endpoint.
- A ordem textual de diretivas Caddy não substitui os blocos `handle`: mudanças nas rotas exigem validar o match real, sobretudo `/admin` e o webhook.
- O backend não configura provedor de e-mail transacional em produção: o mailer usa adapter de teste. Não interpretar cadastro/recuperação por e-mail como entrega real sem configurar o provedor.
- A migração/provisionamento antigo do WAHA no Railway está no [plano histórico](../archive/plano-migracao-waha-local.md) e no histórico Git; não reutilizar comandos de criação de serviço/volume sem um novo plano e confirmação da topologia.
