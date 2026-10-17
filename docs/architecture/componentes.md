# Componentes e fronteiras

O repositório contém duas aplicações e um proxy. Este documento é um mapa de navegação, não uma especificação do contrato da API: confirme comportamento, rotas e configuração no código-fonte indicado.

## Backend — `labelle_back/`

Aplicação Elixir/Phoenix com Ash e PostgreSQL. A API, autenticação, regras de domínio e integrações ficam sob `labelle_back/lib/`; recursos persistidos e migrações ficam em `labelle_back/priv/`. O ponto de entrada local e dependências estão em `labelle_back/README.md`, `mix.exs` e `docker-compose.yml`.

## Frontend — `labelle_front/`

Aplicação React com TanStack Start/Router, Vite e TypeScript. Rotas em `src/routes/`, telas/componentes em `src/`, chamadas de servidor à API em `src/server/`. Scripts executáveis são definidos no `package.json`. O framework pode executar funções no servidor; validar cada chamada e nunca assumir que código executa no navegador.

## Proxy — `labelle_proxy/`

Caddy e configuração em `labelle_proxy/Caddyfile`. É um componente separado, não parte do backend nem do bundle frontend. Confirmar roteamento efetivo no arquivo antes de alterar ou publicar.

## Integração

A URL/configuração da API do frontend, autenticação, rotas públicas e webhooks devem ser verificadas no código e configuração atuais, especialmente `labelle_front/src/server/api.ts`, `labelle_back/lib/labelle_back_web/router.ex` e `labelle_back/lib/labelle_back_web/controllers/`. Para operação Railway, consulte [deploy-railway.md](../runbooks/deploy-railway.md).
