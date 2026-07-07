# Issue 004 — Confirmação e lembrete da profissional saem do WhatsApp da empresa

**Data:** 07/07/2026

---

## Diagnóstico técnico

### Problema

Na tela `/minha-agenda`, ao confirmar um agendamento ou tocar em "Lembrete", o app
só montava um link `wa.me` e abria o WhatsApp **pessoal** de quem estava logado
(`sendWhatsApp` em `whatsapp.js`). A mensagem saía do número da profissional e
ficava registrada no WhatsApp dela, não no da empresa.

### Solução

Integrado o **WAHA** (WhatsApp HTTP API, self-hosted, github.com/devlikeapro/waha)
— conecta ao número real da empresa via QR code e expõe uma API REST — no ponto
de extensão que já existia no código (`LabelleBack.Messaging.WhatsApp`, antes só
com o stub `NotConfigured`).

Implementado:
- **Adapter WAHA** (`messaging/whats_app/waha.ex`): envia mensagens via
  `POST /api/sendText`, além de expor status da sessão, QR code e logout.
- **Duas novas actions no `Appointment`**: `:confirm` (muda status para
  `confirmado` **e** envia a confirmação) e `:send_reminder` (só envia o
  lembrete, sem mudar status). Ambas rodam no backend — falha no envio do
  WhatsApp não impede a confirmação do agendamento, só fica registrada em log.
- **`MinhaAgenda.jsx`**: os botões "Confirmar" e "Lembrete" agora chamam essas
  actions em vez de abrir o WhatsApp pessoal. O mesmo vale para quando a
  profissional cria um agendamento novo direto pela própria agenda — o
  agendamento já nasce `confirmado` (reaproveitando a action `:confirm`) em
  vez de disparar o `wa.me` client-side como antes.
- **Painel "Conexão WhatsApp da empresa"** em Configurações: mostra se está
  conectado, permite gerar um QR code novo (pra parear um número, inclusive
  trocar de número) e desparear o atual.
- Config via variáveis de ambiente (`WAHA_BASE_URL`, `WAHA_API_KEY`,
  `WAHA_SESSION`), sem quebrar ambientes onde o WAHA ainda não está configurado.
- Testes automatizados cobrindo confirmar, lembrete, falha do adapter e
  permissão (uma profissional não confirma agendamento de outra).

### Pendências / próximos passos (fora do código, dependem de infraestrutura)

1. **Subir o serviço WAHA no Railway** (imagem `devlikeapro/waha`, rede privada,
   volume persistente em `/app/.sessions`) e configurar as variáveis de
   ambiente no `labelle_back`. Não fiz esse deploy — é uma ação de
   infraestrutura que passa pelo painel do Railway.
2. **Parear o número da empresa** pela primeira vez (escanear o QR code no
   painel de Configurações com o celular/WhatsApp da empresa).
3. O formato exato do QR code retornado pelo WAHA (nomes dos campos JSON) não
   pôde ser 100% confirmado pela documentação disponível — o front tenta os
   dois formatos mais prováveis, mas vale conferir assim que o WAHA estiver no
   ar; se a imagem não aparecer, é só ajustar esse pequeno trecho.
4. **Efeito colateral, provavelmente bem-vindo**: assim que o WAHA estiver
   configurado, os lembretes automáticos de 20/45 dias (tela `/lembretes`)
   passam a ser enviados de verdade, em vez de ficarem pendentes para envio
   manual — vale confirmar se isso é desejado.
5. Por decisão explícita, a agenda do staff/admin (`Agenda.jsx`) **não foi
   alterada** — continua abrindo o WhatsApp pessoal de quem está logado.

---

## Resumo para o cliente

Confirmar um agendamento ou mandar um lembrete pela tela da profissional agora
vai sair do **WhatsApp da empresa**, não mais do celular pessoal dela.

O que muda na prática:
- Botão **Confirmar** e botão **Lembrete**: continuam existindo do mesmo jeito,
  mas agora enviam a mensagem por trás dos panos, pelo número da empresa — a
  profissional não precisa mais abrir o WhatsApp dela nem tocar em enviar.
- **Criar um agendamento novo direto pela agenda da profissional**: mesma
  correção — a mensagem de confirmação também passa a sair pelo WhatsApp da
  empresa, não mais pelo celular pessoal.
- Nova tela em **Configurações**: um painel mostrando se o WhatsApp da empresa
  está conectado, com botão para gerar um QR code (pra conectar ou trocar de
  número) e um botão para desconectar.

**O que ainda falta, e depende de vocês/mim configurarmos juntos antes de
funcionar de verdade em produção:**
- Subir o serviço que conecta ao WhatsApp da empresa (WAHA) no Railway.
- Escanear o QR code uma vez com o celular da empresa pra parear o número.

Até isso ser feito, os botões continuam funcionando (o agendamento é
confirmado normalmente), só que a mensagem não sai — fica só registrada em
log. Nenhuma mensagem vai mais sair do WhatsApp pessoal de ninguém a partir
dessa tela.
