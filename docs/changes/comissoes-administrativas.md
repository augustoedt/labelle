# Comissões administrativas — 2026-10-18

Admin visualiza comissão em percentual e reais no catálogo (incluindo variações), nos atendimentos e serviços adicionais, na Home, no Financeiro e em Relatórios. O painel permite consultar atendimentos concluídos por mês ou pelo período financeiro, com total por profissional e edição de cada linha. A exportação Excel inclui comissões registradas, pendências e aba Comissões.

As actions set_commission aceitam somente percentual 0–100 e têm policy exclusiva admin, tanto no principal quanto nos adicionais. Serviço e variação mantêm escrita exclusiva admin. Profissional não recebe controles de edição e tentativas diretas no backend são recusadas, inclusive em seus próprios atendimentos.

Percentuais históricos registrados não mudam ao editar o catálogo. Alterar comissão de atendimento concluído não modifica preço, status, cobrança ou catálogo. Valores em reais são calculados sobre a base da linha, arredondados em centavos; o editor também permite informar reais e converter para percentual. Comissões calculadas não são lançamentos de pagamento de comissão.

Históricos sem percentual são identificados como pendentes; não é aplicada retroativamente a taxa atual do catálogo. Somente valores registrados entram nos totais. A área da profissional apresenta a mesma distinção em modo leitura.

Validação: mix precommit, 67 testes backend sem falhas; 19 testes frontend, build e TypeScript aprovados. Testes cobrem bloqueio de profissional/anônimo nos quatro recursos, limites, edição concluída com preservação da cobrança e independência do catálogo.
