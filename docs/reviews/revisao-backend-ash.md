# Revisão do backend — Ash, autorização e integridade

**Status:** revisão concluída; os achados abaixo estão abertos e não foram corrigidos nesta etapa.
**Escopo:** `labelle_back/` (o frontend e o proxy foram consultados apenas para confirmar a exposição das rotas).
**Método:** leitura de resources, actions, policies, mudanças, controllers e testes; comparação com as regras Ash em `labelle_back/.claude/skills/ash-framework/`.
**Verificação:** `cd labelle_back && mix test` — 43 testes, 0 falhas na revisão. Os cenários adversariais abaixo não foram reproduzidos por testes novos; são conclusões da análise do código. Nenhum deploy foi realizado.

O backend segue a estrutura geral do Ash: resources com `Ash.Policy.Authorizer`, actions para fluxos de domínio e hooks posicionados conforme a intenção transacional. As lacunas estão na granularidade das permissões, validação dos inputs e preservação dos invariantes de negócio. Os testes existentes não cobrem estes casos adversariais.

## Achados

### A1 — Alta — Campos internos de profissionais na leitura pública

A policy de leitura permite `is_active == true` sem actor, enquanto telefone, e-mail, comissão e aluguel são atributos públicos do mesmo resource. A listagem usada no portal público devolve o objeto completo ao navegador.

- **Evidência:** [policy e atributos](../../labelle_back/lib/labelle_back/studio/professional.ex#L59-L92), [chamada do portal](../../labelle_front/src/pages/ClientPortal.jsx#L32-L35) e [server function](../../labelle_front/src/server/api.ts#L191-L193).
- **Impacto:** dados pessoais e condições financeiras internas acessíveis a visitantes anônimos e a profissionais sem necessidade de acesso a esses campos.
- **Correção proposta:** criar leitura pública com campos mínimos ou aplicar field policies para dados sensíveis; testar resposta anônima e resposta por perfil.

### A2 — Alta — Agendamento online sem garantia de disponibilidade

`book_online` aceita data/hora/profissional sem checar conflito, expediente ou horário passado. `available_slots` calcula opções para a interface, mas não valida a escrita nem impede duas reservas simultâneas.

- **Evidência:** [action pública](../../labelle_back/lib/labelle_back/studio/appointment.ex#L84-L99), [cálculo separado dos horários](../../labelle_back/lib/labelle_back/studio/actions/compute_available_slots.ex#L17-L63).
- **Impacto:** agendamentos duplicados ou fora do expediente; quando o WAHA está configurado, requisições anônimas repetidas também podem disparar notificações a números escolhidos pelo solicitante.
- **Correção proposta:** validar disponibilidade e horário na action de criação e atualização; definir estratégia transacional/constraint para evitar corrida; adicionar proteção contra abuso e testes de duas reservas concorrentes.

### A3 — Alta — Update de profissional aceita preço e reatribuição

A action `update` aceita `price` e `professional_id`. A policy autoriza pela titularidade do agendamento já existente; a cobrança de `finalize` usa o preço armazenado. A mesma classe de risco se aplica ao preço aceito em `AppointmentService.update`.

- **Evidência:** [accept e policy de Appointment](../../labelle_back/lib/labelle_back/studio/appointment.ex#L101-L195), [valor cobrado](../../labelle_back/lib/labelle_back/studio/changes/register_charge_on_finalize.ex#L24-L36), [accept e policy de itens](../../labelle_back/lib/labelle_back/studio/appointment_service.ex#L43-L63).
- **Impacto:** profissional com acesso ao atendimento pode modificar valores que entram no financeiro; a reatribuição também não é validada contra o novo profissional na action.
- **Correção proposta:** separar actions por papel e por intenção, restringir campos financeiros/reatribuição e testar alterações indevidas antes de finalizar.

### A4 — Alta, exige decisão de produto — Telefone como única prova de identidade

Os endpoints públicos consultam histórico de agendamentos e fidelidade somente pelo número informado. Não há comprovação de posse do telefone nem limitação de tentativas nessas rotas.

- **Evidência:** [endpoints e retorno](../../labelle_back/lib/labelle_back_web/controllers/api/client_controller.ex#L37-L64), [rotas públicas](../../labelle_back/lib/labelle_back_web/router.ex#L64-L73).
- **Impacto:** conhecimento de um número permite consultar dados de atendimento e consumo da cliente.
- **Correção proposta:** decidir mecanismo de autenticação/verificação do número antes de retornar dados pessoais; testar tentativas anônimas e limitar abuso.

### A5 — Média — Agendamento do portal sem vínculo com Client

O portal envia nome e telefone, mas não `client_id`; `book_online` aceita um `client_id` opcional sem associá-lo com segurança pelo telefone. A geração de lembretes busca por `client_id` e a cobrança copia esse vínculo do agendamento.

- **Evidência:** [payload do portal](../../labelle_front/src/pages/ClientPortal.jsx#L82-L91), [action e relacionamento opcional](../../labelle_back/lib/labelle_back/studio/appointment.ex#L84-L93), [busca dos lembretes](../../labelle_back/lib/labelle_back/studio/reminders/generate_due.ex#L39-L45), [atributos da cobrança](../../labelle_back/lib/labelle_back/studio/changes/register_charge_on_finalize.ex#L39-L50).
- **Impacto:** visitas reservadas pelo portal não alimentam corretamente lembretes e vínculo financeiro da cliente. Aceitar ID arbitrário também permitiria associar uma reserva a outra pessoa.
- **Correção proposta:** resolver/criar a cliente no backend, dentro do fluxo de reserva, verificando consistência de telefone e ID; testar portal → finalização → lembrete.

### A6 — Média — Troca de serviço mantém preço e duração do anterior

O snapshot atualiza `service_name`, mas `put_default/3` não substitui `price` nem `duration_minutes` já presentes no registro durante um update; o mesmo padrão existe para itens adicionais.

- **Evidência:** [snapshot do agendamento](../../labelle_back/lib/labelle_back/studio/changes/snapshot_appointment_fields.ex#L36-L52) e [snapshot do item](../../labelle_back/lib/labelle_back/studio/changes/snapshot_service_item_fields.ex#L11-L30).
- **Impacto:** nome do novo serviço com preço/duração do serviço antigo, inclusive na cobrança.
- **Correção proposta:** definir se preço negociado deve ser preservado; ao trocar `service_id`, recalcular os campos conforme essa regra e testar os dois cenários.

### A7 — Média — Falha transitória de WhatsApp paralisa lembrete

O job envia apenas lembretes `:pendente`; quando há erro de envio, marca `:falhou`. A geração trata essa falha como contato para contar o intervalo seguinte.

- **Evidência:** [seleção e marcação de falha](../../labelle_back/lib/labelle_back/studio/reminders/deliver_pending.ex#L29-L55), [intervalo após falha](../../labelle_back/lib/labelle_back/studio/reminders/generate_due.ex#L88-L100).
- **Impacto:** uma indisponibilidade temporária pode deixar o aviso sem nova tentativa pelo ciclo seguinte.
- **Correção proposta:** política de retry limitada e idempotente, distinguindo falha de contato realizado; teste com erro temporário do adapter.

### A8 — Média — Webhook exposto sem autenticação e com payload em log

O proxy encaminha publicamente o path do webhook; o controller aceita qualquer payload e o registra integralmente. O comentário que afirma isolamento pela rede privada não descreve a rota atual do proxy.

- **Evidência:** [proxy](../../labelle_proxy/Caddyfile#L58-L67), [controller](../../labelle_back/lib/labelle_back_web/controllers/api/waha_webhook_controller.ex#L1-L26).
- **Impacto:** eventos falsos, crescimento de logs e persistência de telefones/conteúdo de mensagens nos logs.
- **Correção proposta:** autenticar a origem antes de processar, limitar payload e registrar somente identificadores/metadados necessários; testar requisições sem credencial.

### A9 — Baixa — Entradas malformadas em available_slots geram erro 500

`work_start`/`work_end` são aceitos como strings; o parser chama `String.to_integer/1` e faz pattern matching sem validar o formato. O controller usa a interface raising (`!`) sem tratar erros de argumentos.

- **Evidência:** [action](../../labelle_back/lib/labelle_back/studio/appointment.ex#L166-L178), [parser](../../labelle_back/lib/labelle_back/studio/actions/compute_available_slots.ex#L67-L73), [controller](../../labelle_back/lib/labelle_back_web/controllers/api/client_controller.ex#L14-L33).
- **Impacto:** entrada pública inválida gera resposta 500 em vez de 4xx; duração zero também compromete a lista calculada.
- **Correção proposta:** validar horários, duração positiva e UUID na action/controller; testar respostas 4xx para entradas inválidas.

## Ordem de tratamento sugerida

1. Fechar exposição de campos e definir autenticação do histórico da cliente (A1, A4).
2. Proteger criação e edição de agendamentos, inclusive concorrência e valores (A2, A3).
3. Corrigir vínculo com cliente e snapshots de preço/duração (A5, A6).
4. Tratar confiabilidade de lembretes, webhook e validação de entrada (A7–A9).

Esta revisão não altera código. Antes de cada correção, transformar o cenário afetado em teste e confirmar as regras de produto que dependem do responsável.
