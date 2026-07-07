# Issue 003 — Profissional por serviço, correção de segurança e logout

**Data:** 06/07/2026

---

## Diagnóstico técnico

### 1. Filtro de profissional por serviço

Existia no banco uma tabela (`professional_services`) ligando profissional ↔ serviço, mas nada no sistema a usava — nenhuma tela pra cadastrar o vínculo, e as duas telas de agendamento (staff e app da cliente) sempre listavam todas as profissionais ativas, independente do serviço escolhido.

Implementado:
- Nova seção "Serviços que realiza" no formulário de edição de profissional (`Professionals.jsx`), com checklist dos serviços cadastrados.
- Policy de leitura de `ProfessionalService` liberada publicamente (só liga IDs, nada sensível) para o app da cliente conseguir filtrar sem login; escrita continua admin-only.
- `AppointmentForm.jsx` (staff) e `ClientBooking.jsx` (app da cliente) passam a filtrar a lista de profissionais pelo serviço escolhido.

### 2. Correção: bloquear em vez de liberar geral

Na primeira versão, um serviço sem nenhum vínculo configurado mostrava **todas** as profissionais (pra não travar agendamento no dia do deploy). O cliente identificou o problema: isso permitia agendar uma profissional que não sabe fazer aquele serviço — e como a comissão é calculada em cima de quem está registrada no agendamento, isso geraria uma comissão incorreta (ela receberia por um trabalho que não fez, ou outra pessoa faria o atendimento sem ser creditada).

Corrigido: agora um serviço sem nenhum vínculo configurado **não mostra nenhuma profissional** — bloqueia o agendamento até o vínculo ser cadastrado, em vez de arriscar uma atribuição errada. Mudança em 2 arquivos do front, sem alteração de backend.

**Consequência operacional**: todo serviço atualmente em uso precisa ter pelo menos uma profissional vinculada em Profissionais, senão fica impossível agendá-lo.

### 3. Botão Sair + correção do redirecionamento de logout

A tela `/mais` (staff) não tinha botão de sair — só o profissional tinha, na própria agenda. Além disso, o logout (em ambos os casos) redirecionava para `/` em vez de `/login`; como `/` mostra o app público de agendamento quando não há sessão, quem saía do sistema caía nessa tela pública em vez da tela de login.

Corrigido: botão "Sair" adicionado em `/mais`, e `/logout` agora redireciona corretamente para `/login` nos dois perfis.

### Verificação
- `tsc --noEmit` e `npm run build` limpos em cada mudança (sem novos erros).
- Smoke test via API confirmando: leitura pública funciona, criação/remoção de vínculo restrita a admin, filtro refletindo corretamente.
- Deploy validado em produção após cada mudança (curl nas rotas + confirmação de redirecionamento real).

---

## Resumo para o cliente

Fizemos três ajustes no sistema:

**1. Cada profissional agora só aparece para os serviços que ela realmente sabe fazer.** Na tela **Profissionais**, ao editar o cadastro de alguém, tem uma nova seção "Serviços que realiza" com uma lista para marcar quais serviços aquela pessoa faz. A partir disso, tanto na agenda do staff quanto no agendamento pelo app da cliente, só aparecem como opção as profissionais que sabem fazer o serviço escolhido.

**Atenção**: até você marcar os serviços de cada profissional, **aquele serviço fica temporariamente impossível de agendar** — o sistema prefere bloquear a deixar escalar por engano alguém que não faz aquele serviço (isso evitaria, por exemplo, uma comissão ser calculada errado). Então assim que possível, é importante entrar em Profissionais e marcar, para cada uma, todos os serviços que ela realiza — assim que isso for feito, o agendamento volta a funcionar normalmente para aquele serviço.

**2. Botão para sair da conta.** Antes não existia um botão de "Sair" na área do staff (menu "Mais"). Agora tem, no final da lista.

**3. Corrigido o "sair" que não levava para o login.** Ao clicar em Sair (tanto no staff quanto no profissional), o sistema estava levando para a tela pública de agendamento em vez da tela de login. Agora, ao sair, você cai corretamente na tela de login.
