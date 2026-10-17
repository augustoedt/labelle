# Plano histórico — migração do WAHA para Ubuntu local

> **Arquivo histórico, não é um runbook.** A proposta foi escrita quando o WAHA ainda era descrito como serviço Railway. O commit `c29d95b` alterou o código para suportar webhook público via proxy. Na consulta de 2026-10-17, Railway não listou WAHA e o backend alcançou o serviço externo, mas a sessão estava em `SCAN_QR_CODE`. A configuração do host e do túnel não foi inspecionada; antes de operar, siga os [runbooks atuais](../runbooks/deploy-railway.md) e [verificar-waha.md](../runbooks/verificar-waha.md).

## Objetivo e decisão proposta

Mover o WAHA do Railway para um computador Ubuntu 24 com Docker, mantendo frontend, backend e banco no Railway. O domínio permanece registrado na Hostinger; a proposta usa DNS Cloudflare e Cloudflare Tunnel gratuito para oferecer ao backend uma URL HTTPS estável para o WAHA local. Isso evita IP fixo e abertura de portas no roteador. A sessão anterior não seria preservada: o número precisaria ser pareado novamente por QR code.

Fluxo previsto: `backend Railway → HTTPS → Cloudflare Tunnel → cloudflared/WAHA no Ubuntu`. O WAHA teria volume persistente para a sessão, chave de API e autenticação do dashboard; o túnel e os secrets ficariam fora do Git. O backend guardaria a chave em texto plano, enquanto o WAHA validaria seu hash. Nenhuma porta WAHA seria publicada diretamente na internet.

## Dependências e ordem planejadas

1. Transferir somente a autoridade DNS para Cloudflare; manter o registro do domínio na Hostinger.
2. Criar hostname e túnel permanente, instalar Docker/Compose no Ubuntu e manter dados da sessão em volume persistente.
3. Validar conexão, autenticação da API, QR, pareamento, status `WORKING` e envio controlado **antes** de alterar o backend.
4. Configurar `WAHA_BASE_URL` do backend para a URL HTTPS do túnel e manter `WAHA_API_KEY`/`WAHA_SESSION` coerentes. O código anterior montava webhook para domínio privado Railway, inacessível do Ubuntu; a implementação posterior passou a aceitar URL pública configurável e encaminhá-la pelo proxy.
5. Validar agendamento, confirmação, lembrete, reconexão e persistência após reinício. Só então considerar desligar/remover serviço e volume antigos no Railway, com período de observação e rollback definido.

## Rollback e limites

O plano previa restaurar a URL do WAHA Railway e redeployar o backend **somente se aquele serviço ainda existisse e estivesse utilizável**; pareamento por QR poderia ser necessário novamente. Essa condição precisa ser confirmada na infraestrutura atual antes de qualquer rollback. Túnel não resolve queda de energia, internet residencial, Docker ou desconexão do WhatsApp: nesses casos, a aplicação segue disponível no Railway, mas os recursos de mensagens ficam indisponíveis.

## O que o código posterior comprova — e não comprova

[`labelle_back/config/runtime.exs`](../../labelle_back/config/runtime.exs) lê `WAHA_BASE_URL` e `WAHA_WEBHOOK_PUBLIC_URL` (com default de domínio do proxy). [`labelle_proxy/Caddyfile`](../../labelle_proxy/Caddyfile) encaminha o webhook público ao backend. A consulta de 2026-10-17 confirmou o host externo como destino do backend e a sessão `SCAN_QR_CODE` via RPC, mas não identificou o equipamento físico nem verificou a configuração Cloudflare. O endpoint público ainda não autentica a origem e registra payload; ver [revisão do backend, A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log).
