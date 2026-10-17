# LaBelle

Aplicação de gestão de salão, organizada neste monorepo em serviços independentes:

- [`labelle_back/`](labelle_back/README.md): API Phoenix/Ash em Elixir, persistência PostgreSQL e integrações de domínio.
- [`labelle_front/`](labelle_front/package.json): interface React 19 com TanStack Start, executada pelo Vite em desenvolvimento.
- [`labelle_proxy/`](labelle_proxy/Caddyfile): proxy Caddy para rotas selecionadas do backend/serviços.
- [`docs/`](docs/README.md): documentação compartilhada do produto, operação e decisões.

## Desenvolvimento local

Inicie o backend e o frontend em terminais separados:

Com Docker, Elixir/Mix e Node/npm instalados, use três terminais na raiz do repositório:

```bash
cd labelle_back && docker compose up -d db
cd labelle_back && mix setup && mix phx.server
cd labelle_front && npm ci && npm run dev
```

O backend serve em `http://localhost:4000` e o frontend em `http://localhost:3001`. O PostgreSQL local expõe a porta 5433 conforme [`labelle_back/docker-compose.yml`](labelle_back/docker-compose.yml); confirme credenciais/portas em `labelle_back/config/dev.exs` antes de alterar o ambiente. Para verificar: `cd labelle_back && mix test`; `cd labelle_front && npm run build && npx tsc --noEmit`.

## Documentação

Comece por [`docs/README.md`](docs/README.md), que separa referências de backend, frontend, integração e operações e aponta o estado conhecido do projeto.
