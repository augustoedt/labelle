# Verificar a sessão WAHA sem alterar serviços

**Verificado em:** 2026-10-17 17:19 UTC, projeto Railway `labelle`, ambiente `production`. O backend respondeu ao `GET /api/sessions/default` com HTTP 200 e status **`SCAN_QR_CODE`**. Nenhuma sessão foi criada, pareada ou reiniciada nesta verificação.

## Quando

Para saber se o backend alcança o WAHA externo e se a sessão está pronta para mensagens. `WORKING` indica sessão conectada; `SCAN_QR_CODE` indica QR aguardando pareamento. Uma resposta HTTP 200 **não** significa que o WhatsApp esteja conectado.

## Premissas

- CLI Railway autenticado e projeto/ambiente conferidos com `railway status --json` (neste projeto: `labelle` / `production`). Acesso SSH à instância do serviço `labelle_back`.
- Backend implantado com `WAHA_BASE_URL` e `WAHA_API_KEY`. Consultar presença dessas variáveis no Railway **sem imprimir seus valores**. A URL efetiva apontava para o host externo `waha.softmediabox.com` na verificação acima; confirmar a variável no Railway antes de reutilizar a informação.
- O WAHA está fora da lista de serviços Railway. Sua operação e seu túnel pertencem ao host externo/Cloudflare; este comando só verifica o que o backend enxerga.

## Passos (somente leitura)

Na raiz do checkout vinculado ao projeto:

```bash
railway status --json
railway ssh --service labelle_back -- /app/bin/labelle_back rpc 'url = System.fetch_env!("WAHA_BASE_URL") <> "/api/sessions/" <> System.get_env("WAHA_SESSION", "default"); case Req.get(url, headers: [{"x-api-key", System.fetch_env!("WAHA_API_KEY")}], receive_timeout: 8000) do {:ok, %{status: 200, body: body}} -> IO.inspect(%{http_status: 200, session_status: Map.get(body, "status")}); {:ok, %{status: code}} -> IO.inspect(%{http_status: code}); {:error, _} -> IO.inspect(%{error: :request_failed}) end'
```

O comando usa o processo da release **já em execução** (`rpc`), que tem o cliente HTTP inicializado. `bin/labelle_back eval` abriu um processo isolado sem `Req.Finch` nesta verificação e falhou; não é o comando adequado para esta consulta. A chave é lida da variável remota e não aparece no comando nem na saída. Não registrar payload da sessão, QR code, número pareado ou secrets.

## Verificação e interpretação

- `http_status: 200, session_status: "WORKING"`: conexão WAHA estabelecida do ponto de vista do backend; fazer envio controlado e verificar entrega antes de declarar o fluxo de mensagens operacional.
- `http_status: 200, session_status: "SCAN_QR_CODE"`: backend alcança o serviço, mas WhatsApp precisa ser pareado pelo responsável no painel da aplicação. Não disparar pareamento sem combinar com quem controla o aparelho.
- HTTP diferente de 200 ou `request_failed`: consultar URL/chave no Railway e status do túnel/host com o responsável; não concluir que o serviço Railway está indisponível.
- A chamada direta deste computador ao host externo retornou HTTP 403 emitido pela Cloudflare. Isso não mede a conectividade backend → WAHA; o RPC acima retornou 200. Não desabilitar proteção da Cloudflare para contornar a consulta local.

## Não fazer

Não imprimir `WAHA_API_KEY`, QR, telefone ou corpo completo da API; não criar/iniciar/deslogar a sessão, mudar variável Railway ou reiniciar containers só para obter status. Para topologia e publicação, consultar [deploy-railway.md](deploy-railway.md); para riscos de webhook, ver [revisão A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log).
