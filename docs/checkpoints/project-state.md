# Estado do projeto

## Vínculo manual e visitas — 2026-10-21

Implementado e verificado **localmente; commit ainda sem push ou deploy na data deste registro**: o agendamento manual permite selecionar cadastro por busca parcial de nome/telefone ou informar telefone nacional completo de 10/11 dígitos para busca exata, criação do cliente desconhecido ao salvar e vínculo. Agendamento sem telefone continua permitido e sem vínculo. `visit_count` é calculado dos agendamentos `concluido` vinculados, independentemente do pagamento e inclusive após vínculo posterior; o antigo contador persistido não é mais fonte de leitura (coluna mantida). Consultas públicas de histórico e fidelidade por telefone permanecem abertas por decisão do responsável. `mix precommit` (86 testes backend), 30 testes Node, build e TypeScript passaram localmente. Prévia de produção encontrou 5 agendamentos sem vínculo (4 concluídos e 1 cancelado). Com autorização do responsável, 3 concluídos com nome e telefone completo receberam novos cadastros/vínculos em uma transação auditada. A verificação posterior confirmou 3 vínculos e 3 auditorias; permanecem sem vínculo 1 concluído sem telefone e 1 cancelado. Cobranças e pagamentos não foram modificados. Ver [conciliação](../issues/reconciliar-agendamentos-sem-cliente.md).

A marcação de clientes com dados inválidos e mesclagem auditada foi adiada: [pendência](../issues/clientes-dados-invalidos-mesclagem.md). Agendamentos antigos sem vínculo exigem [conciliação separada](../issues/reconciliar-agendamentos-sem-cliente.md); não associar por nome.

## Celular e agendamento rápido — 2026-10-18

[Entrega](../changes/pendencias-celular-agendamento.md): pendências somente nas áreas logadas, preenchimento posterior autorizado por atendimento, clique em horário livre e busca de clientes/serviços. Sem bloqueio de agendamento manual sem celular e sem backfill automático por nome.

## Agenda — 2026-10-18

Grade diária por profissional e visão de quatro semanas: [detalhes](../changes/agenda-profissionais.md). Navegação por data e preservação das ações de atendimento. Sem alterações de dados.

## Atualização de produto — 2026-10-17

Website responsivo, painel e catálogo P/M/G implementados: [registro](../changes/website-responsivo.md). Todos os valores do JSON aprovados pelo responsável e importados com backup. Publicação no GitHub/main autorizada. O snapshot operacional abaixo é histórico.

> Snapshot após revisão de código e consulta **somente leitura** ao Railway/WAHA em 2026-10-17 17:19 UTC. Não houve deploy, pareamento ou mudança de infraestrutura. Para repetir a verificação, veja [operação Railway](../runbooks/deploy-railway.md) e [estado WAHA](../runbooks/verificar-waha.md).

## Onde estamos

- Monorepo com `labelle_back/` (Phoenix/Ash + PostgreSQL), `labelle_front/` (React/TanStack Start) e `labelle_proxy/` (Caddy). Desenvolvimento local: [README da raiz](../../README.md); fronteiras: [arquitetura](../architecture/componentes.md).
- Em `labelle`/`production`, Railway listou `Postgres`, `labelle_back`, `labelle_front` e `labelle_proxy` com instâncias `RUNNING`; **não há serviço WAHA Railway**. O backend aponta para WAHA externo em `waha.softmediabox.com`. Consulta autenticada a partir da release ativa retornou HTTP 200 e sessão `default` em **`SCAN_QR_CODE`**: o serviço está acessível do backend, mas aguarda pareamento; mensagens dependentes da sessão não estão prontas para envio. [Procedimento e evidência](../runbooks/verificar-waha.md). O [plano pré-migração](../archive/plano-migracao-waha-local.md) é histórico.
- `labelle_back` e `labelle_front` estão ligados ao GitHub `augustoedt/labelle`, branch `main`, com raízes `/labelle_back` e `/labelle_front` e watch paths por pasta. Os deployments do commit `5f8fc2e` terminaram em `SUCCESS`, com instâncias `RUNNING` (`back`: `2f41d344-e3fa-4aa3-9161-a50e549d255d`; `front`: `5b63a7bc-9e91-4bf0-b6b0-c2784197cad0`). Foram verificados `/agendar` e `/login` (200), `/admin` (302), `/api/json/` pelo proxy (404), banco pelo backend (`SELECT 1`) e frontend → backend privado (`POST /api/client/settings`: 200). Não foi feito teste de login autenticado nem envio WhatsApp; ver [runbook](../runbooks/deploy-railway.md).
- [Revisão do backend/Ash](../reviews/revisao-backend-ash.md) é histórica: A1/A3 foram corrigidos e publicados em `627429f`; A4 (consulta pública por telefone) permanece por decisão de produto. Os demais achados exigem reavaliação contra o código atual. Não atribuir testes antigos à verificação presente.

## Em andamento / pendências

- Prioridade técnica: conferir invariantes ainda relevantes da [revisão histórica](../reviews/revisao-backend-ash.md) contra o código atual. Não bloquear as consultas públicas por telefone (A4) sem nova decisão de produto; validar regras com testes antes de alterar fluxos.
- Regra de pontos/faixas da fidelidade aguarda resposta do responsável: [documento de decisão](../decisions/programa-de-fidelidade.md).
- [Issue 002](../issues/issue-002-configuracao-estudio.md): confirmar telefone/endereço reais com o responsável e preencher Configurações.
- [Issue 003](../issues/issue-003-profissionais-e-seguranca.md): revisar com o responsável os serviços de cada profissional e atualizar os vínculos.
- O serviço WAHA está fora do Railway e sua sessão exige pareamento pelo responsável; **não iniciar QR/logout/restart sem autorização**. O acesso direto deste computador ao host WAHA recebeu 403 da Cloudflare, mas o backend alcançou o serviço. A configuração detalhada do host/túnel e os gatilhos de autodeploy no painel ainda precisam de conferência antes de mudanças; seguir os [runbooks](../runbooks/deploy-railway.md).

## Próximo passo

1. Informar ao responsável que WAHA está em `SCAN_QR_CODE` e solicitar pareamento pelo aparelho autorizado; depois repetir a [verificação de status](../runbooks/verificar-waha.md) até `WORKING` e validar envio controlado. Antes de qualquer mudança de domínio/túnel, confirmar a configuração do host.
2. A equipe deve obter o telefone correto e confirmar a identidade do único atendimento concluído ainda sem vínculo, conforme a [conciliação](../issues/reconciliar-agendamentos-sem-cliente.md); não inferir pelo nome. O push à `main` aciona deploy automático: verificar backend/frontend e a contagem de visitas após a publicação. Reavaliar os demais achados da [revisão](../reviews/revisao-backend-ash.md) quando solicitado.
3. No próximo deploy com mudanças funcionais, usar conta de teste autorizada para cobrir login/logout e um fluxo completo pertinente, além das verificações técnicas do [runbook](../runbooks/deploy-railway.md).

## Armadilhas conhecidas

- Não aplicar comandos de provisionamento de WAHA no Railway do [plano arquivado](../archive/plano-migracao-waha-local.md) como se fossem o procedimento vigente.
- Backend e frontend são serviços separados; alterações no contrato exigem validação dos dois. O proxy publica o webhook, mas o controller não autentica sua origem ([A8](../reviews/revisao-backend-ash.md#a8--média--webhook-exposto-sem-autenticação-e-com-payload-em-log)).
- O checkpoint antigo continha uma URL de produção com credencial. Ela foi removida da documentação atual; o histórico Git ainda deve ser avaliado pelo responsável para decidir a rotação da credencial. Não registrar secrets em docs.
- Não fazer deploy nem alterar infraestrutura sem autorização explícita. Backend e frontend observam só suas pastas; `docs/**` não corresponde aos watch paths configurados. Verificar a configuração no Railway antes de mudar esses filtros.

## Referências

- [Índice documental](../README.md) · [Arquitetura](../architecture/componentes.md) · [Revisão backend](../reviews/revisao-backend-ash.md) · [Operação Railway](../runbooks/deploy-railway.md) · [Verificar WAHA](../runbooks/verificar-waha.md)
