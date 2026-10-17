# Issue 002 — Configuração do estúdio (telefone, endereço e mensagens de WhatsApp)

**Data:** 05/07/2026
**Pedido do cliente:** o sistema não tinha nenhum lugar para configurar dados do salão (telefone, endereço) nem as mensagens de WhatsApp.
**Encontrado durante a auditoria:** a mensagem de WhatsApp do agendamento pelo app é enviada para a própria cliente em vez de para o estúdio.

---

## Diagnóstico técnico

### O bug

Quando a cliente agenda pelo próprio app (`ClientBooking.jsx`), o sistema abre um link `wa.me` para notificar alguém do novo horário marcado. O problema: esse link estava sendo montado com o **telefone que a própria cliente digitou** no formulário — ou seja, ao confirmar o agendamento, o WhatsApp abria endereçado a ela mesma, e **o estúdio nunca ficava sabendo** do novo agendamento por essa via.

A causa raiz é que **não existia, em lugar nenhum do sistema (nem no back, nem no front, nem no app original em base44), um telefone cadastrado do próprio estúdio** — só telefones de clientes e profissionais. Não tinha como o código "escolher certo" porque a informação simplesmente não existia.

### O que foi construído

Criamos um resource de **Configurações do Estúdio** — uma "central" única de dados do negócio, editável pela tela `/configuracoes` (menu Mais → Configurações), com:

- **Telefone/WhatsApp do estúdio** — sempre salvo normalizado (só números), independente de como for digitado.
- **Endereço estruturado** — CEP, rua, bairro, cidade e estado, cada um seu campo.
- **5 templates de mensagem de WhatsApp**, cada um com uma lista de "placeholders" (marcadores como `{{cliente}}`, `{{servico}}`, `{{data}}`) que o sistema substitui automaticamente pelo valor real na hora de enviar:
  1. Confirmação de agendamento (estúdio → cliente)
  2. Lembrete manual (estúdio → cliente, botão "Lembrete" na agenda)
  3. Agradecimento 20 dias após o atendimento (automático)
  4. Reativação a cada 45 dias sem retorno (automático)
  5. **Notificação de novo agendamento (cliente → estúdio)** — nova, é o template que corrige o bug

### A correção do bug

Quando a cliente termina de agendar pelo app dela, o WhatsApp agora abre endereçado ao **telefone do estúdio** (cadastrado em Configurações), com uma mensagem pronta do tipo "Acabei de agendar [serviço] com [profissional] em [data] às [hora]. Meu nome: X, meu telefone: Y" — a cliente só confirma o envio, e a mensagem chega no WhatsApp do estúdio como uma notificação de novo agendamento.

### Implementação (para referência futura)

- **Backend**: novo resource `LabelleBack.Studio.Settings` — é um "singleton" (existe sempre exatamente 1 linha no banco, nunca mais), então tanto a leitura quanto a edição são feitas sem precisar de um ID na URL (`GET`/`PATCH /api/json/settings`). Os 5 templates de mensagem moram nesse resource; o job automático de lembretes (`GenerateDue`) e o endpoint público do app da cliente (`POST /api/client/settings`) leem de lá.
- **Permissões**: staff (admin) lê e edita; profissionais só leem (precisam disso pra montar as mensagens na própria agenda); o app da cliente (sem login) usa uma rota pública que devolve só os campos necessários (nome, telefone, endereço formatado, template de notificação).
- **Frontend**: `src/lib/whatsapp.js` deixou de ter texto fixo — agora recebe o template configurado e faz a substituição dos placeholders. `ClientBooking.jsx`, `Agenda.jsx` e `MinhaAgenda.jsx` foram atualizados para buscar as Configurações antes de montar qualquer mensagem.
- **Escopo desta etapa** (combinado durante o planejamento): ficaram de fora, por ora, horário padrão de funcionamento, prazo dos lembretes (20/45 dias) e faixas de pontos da fidelidade — esses também estão fixos no código hoje, mas não foram mexidos nesta entrega a pedido do cliente, que priorizou telefone/endereço/mensagens.

### Verificação

- 12 testes automatizados passando (incluindo o fluxo de atendimento já existente, ajustado para o novo Settings).
- Testado via API real: leitura/edição das configurações como staff; profissional consegue ler mas não editar (bloqueado corretamente); endpoint público devolve telefone/endereço formatado; job de lembretes gera a mensagem certa com os placeholders substituídos; telefone salvo sempre normalizado mesmo digitado com parênteses/traço.
- Build de produção do front OK, sem novos erros de tipo.

### Pendências / próximos passos possíveis

- Preencher o telefone e endereço reais do estúdio na tela de Configurações (hoje está com um número de exemplo).
- Se quiserem, numa próxima etapa: horário de funcionamento, prazos de lembrete e faixas de fidelidade também configuráveis (hoje fixos no código).
- Commit + deploy no Railway (a migração do banco roda automaticamente no release).

---

## Resumo para o cliente

Foram encontrados e corrigidos os seguintes erros, e aproveitamos para criar um lugar central de configurações do estúdio.

**Erro encontrado** — quando a cliente agendava pelo próprio celular, o WhatsApp abria uma mensagem endereçada **para ela mesma**, em vez de avisar o estúdio. Isso acontecia porque o sistema nunca teve, em lugar nenhum, o telefone do estúdio cadastrado — então ele não tinha como saber para quem mandar. **Já corrigido**: agora, quando a cliente termina de agendar, o WhatsApp dela abre endereçado ao **número do estúdio**, com uma mensagem pronta avisando o serviço, o profissional, o dia e o horário marcados — ela só aperta enviar, e a notificação chega certinha para vocês.

**O que mais foi criado** — uma tela nova, chamada **Configurações** (fica no menu "Mais"), onde agora dá para cadastrar:
- O **telefone/WhatsApp do estúdio** (é justamente esse número que resolve o problema acima).
- O **endereço completo** do estúdio (CEP, rua, bairro, cidade e estado).
- O **texto de cada mensagem** que o sistema manda pelo WhatsApp — a de confirmação de agendamento, a de lembrete, as duas automáticas de "sentimos sua falta" (20 e 45 dias) e a nova mensagem que a cliente manda avisando que agendou. Cada mensagem tem uma legenda mostrando quais informações (nome da cliente, serviço, data, etc.) podem ser incluídas automaticamente no texto — vocês escrevem a mensagem do jeito que preferirem, com a "cara" do estúdio, sem precisar pedir pra gente mexer no código toda vez que quiserem mudar uma palavra.

**O que ainda não entra nessa etapa** — o horário padrão de funcionamento, o prazo dos lembretes automáticos (hoje é 20 e 45 dias, fixo) e as faixas de pontos da fidelidade continuam como estão por enquanto, porque vocês pediram para focar primeiro em telefone, endereço e mensagens. Se quiserem tornar isso configurável também depois, é só avisar.

**O que falta fazer antes de ir para o ar** — só preencher, na tela de Configurações, o telefone e o endereço reais do estúdio (hoje está com um número de exemplo) e o restante já está pronto para uso.
