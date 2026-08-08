# Checkpoint técnico — LaBelle (redesign front + seeds dev)

> Estado em 2026-08-08. Ler isto antes de continuar após /compact ou troca de modelo.
> Tudo abaixo já está **commitado em `main`** (local; push/deploy pendentes de decisão do usuário).

## Contexto

Monorepo: `labelle_back` (Elixir/Ash + Phoenix, Postgres em Docker `labelle_back_db`) e
`labelle_front` (TanStack Start + React 19 + Tailwind v3.4 + shadcn, mobile-first).
App de gestão de salão de beleza (agenda, clientes, financeiro, fidelidade, portal público
de agendamento `/agendar`, app da cliente `/app`).

Trabalho atual: redesign do front guiado pelas skills `redesign-existing-projects` e
`design-taste-frontend` (copiadas para `~/.pi/agent/skills/`, vindas de
`~/.kimi-code/skills/`, origem github.com/leonxlnx/taste-skill; `kimi-webbridge` também
copiada). Auditoria completa aplicada; fase "taste" (nova direção visual) ainda não começou.

## Feito nesta sessão (commits em ordem)

Fixes mobile críticos:
- `a3d869c` safe-area-bottom definida + `viewport-fit=cover` (bottom nav não cobre home indicator)
- `3ec05dd` `min-h-dvh` nos 4 shells (AppLayout, ProfissionalLayout, ClientApp, ClientPortal)
- `cdd5740` login sem `fixed inset-0` (rola quando teclado abre)
- `37c0da8` textos 10–11px → `text-xs` (45 ocorrências, 21 arquivos)
- `a93fc2d` PWA: manifest, favicon, ícones 192/512, apple-touch-icon, logo local em `public/logo.png`
- `2a1e068` pressed states `active:scale` + focus ring nos elementos custom (21 arquivos)
- `53e3288` shells unificados em `max-w-lg`; portal ganhou container
- `bdc34c5` skeletons de loading em todas as páginas (fim do flash de "R$ 0"/vazio; empty states gated por `!isLoading`)
- `9e2f2c6` **sheet z-[60] acima da bottom nav** + safe-area + max-w-lg (bug: botão de ação escondido atrás do menu)
- `f594ddf` Outfit substitui Inter; fonts via `<link>` preconnect; tabular-nums nos stats
- `4a706cb` cores consolidadas: `src/lib/appointmentStatus.js` e `src/lib/loyaltyTiers.js`; gradiente via classe `.app-header`
- `467e31a` cards: sem `shadow-sm` quando têm borda (14 arquivos)
- `c73a133` `src/lib/format.js` → `formatBRL()` (Intl pt-BR) em 24 arquivos + tabular-nums
- `33b6366` 404 real pt-BR (`src/lib/NotFound.jsx` + `defaultNotFoundComponent`); mortos removidos (`PageNotFound.jsx`, `upsertClientByPhone`)
- `06858ac` logo.png com fundo transparente (era quadrado preto opaco no app da cliente)

Backend/dev:
- `cc363f3` `priv/repo/dev_seeds.exs` — usuários, 6 clientes, 22 agendamentos (12 finalizados → 12 transações)
- `6e95bff` catálogo real de serviços (42, espelho da produção) + vínculos professional_services por especialidade
- `5cb5918` **fix importante**: `ensureInternalNetworking` em `src/server/api.ts` só força IPv6 quando
  `LABELLE_API_URL` tem `.railway.internal` — antes quebrava TODO o dev local (undici ia para ::1,
  Phoenix escuta 127.0.0.1). Sintoma: catálogo vazio, `fetch failed` nos server fns.

## Ambiente dev (como rodar)

- Back: `cd labelle_back && mix phx.server` (porta 4000). DB: container Docker `labelle_back_db`.
  - **Se API responder 503 PendingMigrationError**: `mix ecto.migrate`.
  - Seed base: `mix run priv/repo/seeds.exs`; seed dev (dados fake): `mix run priv/repo/dev_seeds.exs` (idempotente).
- Front: `cd labelle_front && npm run dev` (porta 3001). Atualmente rodando em background
  (log `/tmp/labelle_front_dev.log`) — o processo foi reiniciado por mim para limpar o dispatcher IPv6.
- Acessos dev — admin `admin@labelle.studio` / `changeme123456`; profissionais
  `joana@labelle.studio`, `camila@labelle.studio` (`changeme123456`), `beatriz@labelle.studio` (`labelle123456`);
  usuário comum `maria@exemplo.com` (`labelle123456`). App da cliente usa sessão por telefone (localStorage), não senha.
- Build check do front: `cd labelle_front && npm run build` **e** `npx tsc --noEmit` (limpo desde `b18fcf0`).

## WebBridge (browser automation)

Daemon `http://127.0.0.1:10086`, skill em `~/.kimi-code/skills/kimi-webbridge/SKILL.md`.
Uso: `curl -X POST .../command -d '{"action":"navigate|snapshot|click|fill|evaluate|screenshot|network","args":{...},"session":"labelle-design"}'`.
- `evaluate` usa arg `code` (não `expression`). Screenshots retornam `path` → abrir com ReadMediaFile.
- Sessão atual: `labelle-design`, abas agrupadas como "LaBelle Design Review" (logada como admin; **não fechar sem perguntar**).

## Produção (Railway)

- Deploy: `railway up --service labelle_back|labelle_front --ci --path-as-root .` de cada pasta (ver `DEPLOY.md`).
- DB produção: `docker exec -i labelle_back_db psql "postgresql://postgres:oGKcdUIQdNFjLaRYIUFaauBYnuTDRsXj@hayabusa.proxy.rlwy.net:23632/railway"`.
- Front prod: `https://labellefront-production.up.railway.app`.

## Pendências (ordem sugerida)

Decisões de produto pendentes com o usuário:
1. **Limites de tier divergem**: admin `Loyalty.jsx` (0/100/300/600) vs app cliente `ClientLoyalty.jsx`
   (0/500/1000/2000). Backend não calcula tier (campos `clients.loyalty_points`/`loyalty_tier` só
   armazenam; nada os popula). **Documento de decisão para o cliente criado em
   `DECISAO_PROGRAMA_FIDELIDADE.md`** (não técnico): aguardando resposta sobre regra de pontuação,
   faixa correta e cálculo automático vs manual.
2. Acentos escuros `bg-foreground` no app da cliente (decisão visual da fase taste — não mexi).
3. Dark mode morto (vars `.dark` + next-themes, zero uso): remover ou implementar?
4. Transação R$120 "Maquiagem Social – Adriana Mathioly" (produção) aguardando confirmação da cliente.

Backlog técnico:
5. Fase **taste-skill** (`design-taste-frontend` v2): nova direção visual. Dials sugeridos p/ app de
   operação mobile: VARIANCE baixo, MOTION baixo, DENSITY médio-alto. Próxima tarefa da sessão.
6. ~~Poda de bundle~~ **feito** `770f7bb` (29 deps + 36 componentes ui/ orfaos removidos).
7. ~~`ClientPortal.jsx` lista appointments~~ **feito** `a76b904` (usa action `available_slots`).
8. ~~Validação/máscara de telefone~~ **feito** `cbb279f` (`src/lib/phone.js`, 5 formulários).
9. ~~Erros de `tsc`~~ **feito** `b18fcf0` (strictNullChecks + ui em tsx; `npx tsc --noEmit` limpo).
10. Push dos commits + deploy back/front quando o usuário pedir.

## Sessão 2026-08-08 (continuação) — commits adicionados

- `770f7bb` front: poda de deps não usadas (29) e componentes `ui/` órfãos (36)
- `cc43ec9` docs: `DECISAO_PROGRAMA_FIDELIDADE.md` (decisão tier) + CHECKPOINT referenciando
- `b18fcf0` front: `tsc --noEmit` limpo (strictNullChecks + input/label/button em tsx)
- `a76b904` front: portal público usa action `available_slots` (não lista mais appointments)
- `cbb279f` front: máscara/validação de telefone BR (`src/lib/phone.js`) em 5 formulários
- `2a3a47f` front: telefone normalizado (só dígitos) no agendamento — máscara é só visual

Skills migradas nesta sessão: `redesign-existing-projects`, `design-taste-frontend` e
`kimi-webbridge` copiadas de `~/.kimi-code/skills/` para `~/.pi/agent/skills/` (sem symlink).

## Testes (sessão 2026-08-08, WebBridge + API)

- Backend: `mix test` → 43 testes, 0 falhas (warnings de WhatsApp = adapter não configurado, ok).
- API `available_slots`: retorna slots; 400 sem parâmetros obrigatórios.
- App da cliente `/app`: menu (bottom nav) presente; aba Agendar mantém o menu; Fidelidade
  com máscara de telefone funciona (inválido desabilita botão; busca real mostra Bronze).
- Portal `/agendar`: E2E completo — serviço → profissional → 14 dias → slots via backend →
  dados (máscara) → confirmar → agendamento criado no banco. **Sem menu por design**
  (página standalone p/ link de WhatsApp; `/app` tem o menu).
- Login admin → `/` + 9 telas admin OK (sem regressão da poda). Login profissional → `/minha-agenda`.
- **Bug corrigido no teste**: telefone era gravado com máscara `(11) 99777-0001` em
  `appointments.client_phone` (quebraria WhatsApp futuro) → agora normalizado (`2a3a47f`).
- **Dev server**: após renomear ui/*.jsx→tsx, o vite em execução mantinha cache com módulos
  deletados (erro "Failed to load button.jsx" no portal). Solução: reiniciar o dev server
  (pkill vite + npm run dev).
- **Obs.**: hydration mismatch em `/agendar` (dates via `Date.now()` no SSR) — não bloqueia;
  candidato a fix na fase taste.

## Bug mobile reportado pelo usuário (sessão 2026-08-08) — FIX `82a373a`

Sintoma: `/minha-agenda` em viewport mobile ficava "desfeito" — dias do calendário
estouravam a tela, menu inferior deslocado para baixo, página zoomada (layout viewport
544px em vez de 390).

Causas (2, corrigidas juntas):
1. **TanStackRouterDevtools** (dev-only, `__root.tsx`) abria um painel de 544px de
   largura → Chrome mobile fazia auto-zoom-out da página toda. Removido do root e o
   pacote `@tanstack/react-router-devtools` desinstalado.
2. **Fileira de dias das agendas** (`MinhaAgenda.jsx` e `Agenda.jsx`): botões com
   `flex-1` mas `min-width:auto` não encolhiam abaixo do conteúdo mínimo (~77px × 7 =
   544px). Agora a fileira rola horizontalmente (`overflow-x-auto -mx-5 px-5 pb-1`,
   mesmo padrão do portal `/agendar`) com chips `shrink-0`.

Validação (WebBridge, emulação 390×844): `scrollW == clientW == 390` em `/agendar`,
`/agenda`, `/app`, `/login`, `/minha-agenda`; nav fixo em `bottom:844`; último dia
alcançável por scroll. Screenshot de referência: `/tmp/minha_agenda_fix.jpeg`.

> Nota de teste: a extensão de browser do usuário (classes `aiinhbfoop-*`, painel de
> 440px) também injeta elementos no DOM e polui medições de layout — ignorar ao depurar.

## Convenções do projeto

- Commit por correção, mensagens em pt-BR começando com `front:`/`back:`. **Nunca** `git push` sem pedir.
- Build check do front: `cd labelle_front && npm run build` (warnings de `node:*`/chunk>500kB são pré-existentes).
- Testes back: `cd labelle_back && mix test`.
- shadcn components em `src/components/ui/` — mudanças sistêmicas vão ali (ex.: sheet z-60), não página por página.
