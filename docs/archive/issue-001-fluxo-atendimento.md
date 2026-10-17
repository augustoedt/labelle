# Issue 001 — Fluxo de atendimento incompleto + esteira de lembretes

**Data:** 05/07/2026
**Relato do cliente:** erro no fluxo de atendimento; lógicas incompletas em relação ao fluxo desejado (agendar → confirmar → iniciar → alterar/incluir serviços → finalizar com cobrança → lembretes de 20/45 dias).

---

## Resumo técnico

### Causa raiz do "erro no fluxo"

Eram duas coisas somadas:

1. **Front (TanStack Start)**: server functions exigem a chamada `fn({ data: payload })`, mas as páginas portadas do base44 chamavam `Api.update({ id, attributes })` e `Api.list({ filter, sort })` com o payload direto — o servidor recebia `data: undefined`. Resultado: **todo update dava 500** (Confirmar / Iniciar / Concluir nunca funcionaram) e as listas ignoravam filtros/sort silenciosamente. Corrigido com wrappers centralizados (`wrapList`/`wrapInput`) nos objetos `*Api` em `src/server/api.ts` — nenhuma página precisou mudar.
2. **Backend (policies)**: a policy de `Transaction` era admin-only, então o profissional não tinha permissão para criar o lançamento financeiro ao concluir o atendimento (o front tentava criar via API e era negado). Agora a cobrança é criada pelo próprio backend dentro da action `finalize`, com `authorize?: false`.

### O que foi construído

**Backend (Elixir/Ash):**
- Resource `LabelleBack.Studio.AppointmentService` (tabela `appointment_services`): serviços adicionais realizados no atendimento, além do principal, com flag `unplanned` ("não previsto"), snapshot de nome/preço/duração e policies (admin ou profissional dono do atendimento).
- Action `update :finalize` no `Appointment`: exige `payment_method`, valida que o atendimento não está concluído/cancelado, muda status para `concluido` e (via change `RegisterChargeOnFinalize`) soma serviço principal + itens e **cria ou atualiza** a `Transaction` do agendamento como `:pago`, com descrição "Serviço A + Serviço B – Cliente".
- Policies ajustadas: profissional lê a base de clientes (para agendar), lê as próprias transações (`professional.user_id == actor.id`); escrita de clientes/transações continua admin-only.
- Esteira de lembretes: resource `ClientReminder` + 2 scheduled actions AshOban diárias (fila `reminders`):
  - `GenerateDue` (12:00 UTC / 09:00 BRT): lembrete `:agradecimento` 20 dias após o último atendimento concluído; `:reengajamento` a cada 45 dias sem novo serviço; cancela pendentes se o cliente reagendar; não duplica enquanto houver pendente.
  - `DeliverPending` (12:30 UTC): envia via behaviour `LabelleBack.Messaging.WhatsApp`. O adapter atual é `NotConfigured` — lembretes ficam `:pendente` para envio manual. **Para integrar um provedor** (Meta Cloud API, Twilio, Evolution...): implementar o behaviour e trocar `config :labelle_back, :whatsapp_adapter` — o envio passa a ser automático sem mais mudanças.
- Rotas JSON:API novas: `/appointment_services` (CRUD), `/client_reminders` (index/get + `PATCH :id/mark_sent` + `PATCH :id/cancel`), `PATCH /appointments/:id/finalize`.
- Migração `add_appointment_services_and_client_reminders` (aplicada em dev; em produção roda no release).

**Front (TanStack Start/React):**
- `api.ts`: wrappers `wrapList`/`wrapInput` (correção do bug acima) + `AppointmentServicesApi`, `RemindersApi` e `AppointmentsApi.finalize`.
- `FinalizeSheet` (componente compartilhado Agenda/Minha Agenda): gerencia serviços realizados durante o atendimento (incluir/remover/ajustar preço, badge "Não previsto"), mostra o total e finaliza com forma de pagamento (Pix/dinheiro/débito/crédito). Substituiu o botão "Concluir" (que criava pré-lançamento no front).
- Minha Agenda: profissional agora **cria agendamentos** (botão Novo, profissional travado nela mesma), com confirmação por WhatsApp igual à da recepção.
- Nova tela **Lembretes** (`/lembretes`, item no menu Mais): filtros pendentes/enviados/todos, envio manual via wa.me com a mensagem gravada no lembrete, "marcar enviado" e "cancelar".
- Minhas Comissões: faturamento e comissão agora incluem os serviços extras do atendimento (comissão por serviço, usando o `commission_percent` de cada um).

### Verificação

- 12 testes backend passando (`test/labelle_back/studio/attendance_flow_test.exs` cobre finalize com itens, validações, não-duplicação de transação, geração 20d/45d, cancelamento ao reagendar).
- Fluxo completo exercitado via API HTTP real como profissional: criar agendamento → iniciar → adicionar serviço não previsto → finalizar Pix → transação de R$ 230 (150 + 80) correta, paga e visível ao profissional; lembrete gerado para cliente com atendimento de 25 dias atrás, marcado como enviado, segunda rodada sem duplicar.
- Build de produção do front OK.

### Pendências

- Commit + deploy no Railway (migração roda automaticamente no release).
- Contratar/integrar provedor de WhatsApp para envio automático dos lembretes (sistema já preparado).

---

## Resumo para o cliente

Oi! Atualizei o sistema com o fluxo completo que você me passou. Como ficou:

**Agendamento** — O agendamento pode ser feito pela cliente (pelo app dela), pela recepção ou agora **também pela própria profissional**, direto na tela "Minha Agenda" dela. A recepção enxerga todos os agendamentos; cada profissional enxerga só os dela.

**Confirmação** — Ao agendar ou ao apertar "Confirmar", o sistema já monta a mensagem de confirmação no WhatsApp da cliente, prontinha para enviar.

**Atendimento** — Encontramos e corrigimos o defeito que travava os botões de Confirmar, Iniciar e Concluir — era isso que estava impedindo o fluxo de andar. Agora: aperta **Iniciar** quando a cliente chega e, durante o atendimento, dá para **incluir ou tirar serviços a qualquer momento** — inclusive aqueles que não estavam previstos (eles ficam marcados como "não previsto" e podem ter o valor ajustado na hora).

**Finalização e cobrança** — Ao apertar **Finalizar**, aparece a conta do atendimento: o serviço agendado + tudo que foi feito a mais, com o total já somado. Aí é só escolher a forma de pagamento (Pix, dinheiro, débito ou crédito) e confirmar a cobrança.

**Como fica o financeiro (exatamente)** — No momento em que o atendimento é finalizado, o sistema lança a venda no caixa **automaticamente, já como paga**, com o valor total e a forma de pagamento escolhida — tanto faz se quem finalizou foi a recepção ou a profissional. Esse lançamento aparece na tela Financeiro (entradas, saídas, filtros por período) e entra nos Relatórios. A comissão da profissional é calculada sobre **tudo** que ela fez no atendimento, incluindo os serviços extras, e ela acompanha na tela "Minhas Comissões". Ou seja: fechou o atendimento, o dinheiro e a comissão já estão registrados — ninguém precisa lançar nada à mão depois.

**Lembretes de retorno** — O sistema agora trabalha sozinho nisso: **20 dias** depois do atendimento, ele prepara uma mensagem agradecendo a preferência e sugerindo um novo horário; se a cliente não voltar, prepara uma nova mensagem **a cada 45 dias**. Se a cliente já tiver reagendado, o sistema percebe e não manda nada. Essas mensagens ficam na nova tela **Lembretes**: por enquanto a equipe abre lá, toca em "Enviar WhatsApp" (a mensagem já vai pronta) e marca como enviado. Quando contratarmos o serviço de disparo automático de WhatsApp, essas mesmas mensagens passam a ser enviadas sozinhas, sem ninguém precisar tocar em nada — o sistema já está preparado para isso.
