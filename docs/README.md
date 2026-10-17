# Documentação do LaBelle

Este diretório reúne documentação compartilhada do monorepo. O produto tem dois componentes de aplicação distintos — backend e frontend — mais um proxy de borda; use os documentos abaixo para distinguir responsabilidades e contratos. Código e configuração são a fonte da verdade para rotas, variáveis e comandos.

## Como navegar

Comece pelo [estado do projeto](checkpoints/project-state.md). Para mudanças, consulte a tabela abaixo e depois o documento canônico correspondente.

### Antes de… → leia

| Antes de… | Leia |
|---|---|
| Rodar ou testar localmente | [README da raiz](../README.md), [README do backend](../labelle_back/README.md) e scripts em [`labelle_front/package.json`](../labelle_front/package.json) |
| Alterar recursos, API ou dados no backend | [Revisão do backend](reviews/revisao-backend-ash.md), [mapa de arquitetura](architecture/componentes.md) e código em `labelle_back/lib/` |
| Alterar telas, rotas ou integração com API no frontend | [Mapa de arquitetura](architecture/componentes.md) e código em `labelle_front/src/` |
| Alterar fronteiras entre frontend, API e proxy | [Mapa de arquitetura](architecture/componentes.md) e [deploy Railway](runbooks/deploy-railway.md) |
| Fazer deploy ou operar Railway | [Runbook de operação](runbooks/deploy-railway.md) |
| Verificar conexão/pareamento do WhatsApp | [Verificar WAHA](runbooks/verificar-waha.md); o [plano antigo](archive/plano-migracao-waha-local.md) é somente histórico |
| Alterar fidelidade | [Decisão do programa de fidelidade](decisions/programa-de-fidelidade.md) |
| Retomar trabalho interrompido | [Checkpoint](checkpoints/project-state.md) |

## Pastas e documentos

### `architecture/` — responsabilidades e fronteiras
- [componentes.md](architecture/componentes.md): orientação para localizar backend, frontend e proxy; contratos devem ser verificados no código.

### `checkpoints/` — snapshot de retomada
- [project-state.md](checkpoints/project-state.md): checkpoint autoritativo único; registra o estado e ressalvas de atualização.

### `decisions/` — decisões de produto/arquitetura
- [programa-de-fidelidade.md](decisions/programa-de-fidelidade.md): divergência e decisão necessária para regras de pontos.

### `runbooks/` — operações
- [deploy-railway.md](runbooks/deploy-railway.md): topologia Railway consultada em 2026-10-17 e passos de publicação; no próximo deploy autorizado, executar o checklist pós-deploy e registrar data/resultado no runbook.
- [verificar-waha.md](runbooks/verificar-waha.md): consulta somente leitura da sessão WAHA a partir da release Railway; executado em 2026-10-17.

### `issues/` — pendências abertas
- [issue-002-configuracao-estudio.md](issues/issue-002-configuracao-estudio.md): cadastrar telefone/endereço reais do estúdio.
- [issue-003-profissionais-e-seguranca.md](issues/issue-003-profissionais-e-seguranca.md): confirmar serviços realizados por cada profissional no cadastro.

### `archive/` — histórico, não procedimento vigente
- [issue-001-fluxo-atendimento.md](archive/issue-001-fluxo-atendimento.md): entrega do fluxo de atendimento e lembretes.
- [issue-004-whatsapp-empresa.md](archive/issue-004-whatsapp-empresa.md): relato de integração WhatsApp.
- [plano-migracao-waha-local.md](archive/plano-migracao-waha-local.md): proposta anterior à configuração atual do webhook/proxy; não reutilizar como runbook.

### `reviews/` — revisões solicitadas
- [revisao-backend-ash.md](reviews/revisao-backend-ash.md): achados abertos da revisão do backend/Ash; não é plano de implementação.

Planos ativos, benchmarks e apresentações serão criados em pastas próprias quando houver conteúdo. Não há documentos dessas categorias neste snapshot.
