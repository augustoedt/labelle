# Estado do projeto

> Snapshot após revisão de código e consulta **somente leitura** ao Railway/WAHA em 2026-10-17 17:19 UTC. Não houve deploy, pareamento ou mudança de infraestrutura. Para repetir a verificação, veja [operação Railway](../runbooks/deploy-railway.md) e [estado WAHA](../runbooks/verificar-waha.md).

## Onde estamos

- Monorepo com `labelle_back/` (Phoenix/Ash + PostgreSQL), `labelle_front/` (React/TanStack Start) e `labelle_proxy/` (Caddy). Desenvolvimento local: [README da raiz](../../README.md); fronteiras: [arquitetura](../architecture/componentes.md).
- Em `labelle`/`production`, Railway listou `Postgres`, `labelle_back`, `labelle_front` e `labelle_proxy` com instâncias `RUNNING`; **não há serviço WAHA Railway**. O backend aponta para WAHA externo em `waha.softmediabox.com`. Consulta autenticada a partir da release ativa retornou HTTP 200 e sessão `default` em **`SCAN_QR_CODE`**: o serviço está acessível do backend, mas aguarda pareamento; mensagens dependentes da sessão não estão prontas para envio. [Procedimento e evidência](../runbooks/verificar-waha.md). O [plano pré-migração](../archive/plano-migracao-waha-local.md) é histórico.
- Revisão do backend/Ash: [nove achados abertos](../reviews/revisao-backend-ash.md), sem correções implementadas. `cd labelle_back && mix test` passou com 43 testes, 0 falhas durante essa revisão; os cenários adversariais descritos não têm testes novos.

## Em andamento / pendências

- Prioridade técnica: tratar autorização de campos, autenticação de consultas de cliente e invariantes de agendamento/cobrança conforme a [revisão](../reviews/revisao-backend-ash.md). Antes de alterar código, confirmar regras de produto nos itens que exigem decisão e escrever testes de regressão.
- Regra de pontos/faixas da fidelidade aguarda resposta do responsável: [documento de decisão](../decisions/programa-de-fidelidade.md).
- [Issue 002](../issues/issue-002-configuracao-estudio.md): confirmar telefone/endereço reais com o responsável e preencher Configurações.
- [Issue 003](../issues/issue-003-profissionais-e-seguranca.md): revisar com o responsável os serviços de cada profissional e atualizar os vínculos.
- O serviço WAHA está fora do Railway e sua sessão exige pareamento pelo responsável; **não iniciar QR/logout/restart sem autorização**. O acesso direto deste computador ao host WAHA recebeu 403 da Cloudflare, mas o backend alcançou o serviço. A configuração detalhada do host/túnel e os gatilhos de autodeploy no painel ainda precisam de conferência antes de mudanças; seguir os [runbooks](../runbooks/deploy-railway.md).

## Próximo passo

1. Informar ao responsável que WAHA está em `SCAN_QR_CODE` e solicitar pareamento pelo aparelho autorizado; depois repetir a [verificação de status](../runbooks/verificar-waha.md) até `WORKING` e validar envio controlado. Antes de qualquer mudança de domínio/túnel, confirmar a configuração do host e os gatilhos no painel Railway.
2. Priorizar com o responsável os achados A1–A4 da [revisão](../reviews/revisao-backend-ash.md) e as decisões de fidelidade/identidade da cliente. Implementar correções em etapas com testes específicos e autorização para mudanças de infraestrutura.
3. Para cada mudança posterior: rodar `mix test` no backend; no frontend, `npm run build` e `npx tsc --noEmit`. Antes de deploy, cumprir o checklist pós-deploy do runbook.

## Armadilhas conhecidas

- Não aplicar comandos de provisionamento de WAHA no Railway do [plano arquivado](../archive/plano-migracao-waha-local.md) como se fossem o procedimento vigente.
- Backend e frontend são serviços separados; alterações no contrato exigem validação dos dois. O proxy publica o webhook, mas o controller não autentica sua origem ([A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log)).
- O checkpoint antigo continha uma URL de produção com credencial. Ela foi removida da documentação atual; o histórico Git ainda deve ser avaliado pelo responsável para decidir a rotação da credencial. Não registrar secrets em docs.
- Não fazer deploy nem alterar infraestrutura sem autorização explícita. Um push de docs pode disparar autodeploy: confirmar filtros no Railway conforme o runbook.

## Referências

- [Índice documental](../README.md) · [Arquitetura](../architecture/componentes.md) · [Revisão backend](../reviews/revisao-backend-ash.md) · [Operação Railway](../runbooks/deploy-railway.md) · [Verificar WAHA](../runbooks/verificar-waha.md)
