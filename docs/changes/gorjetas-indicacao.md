# Gorjetas e bônus por indicação

A comissão base continua sendo a registrada em cada serviço/opção P/M/G, nunca a taxa do cadastro da profissional. A conclusão registra separadamente gorjeta (R$ ou percentual sobre o total dos serviços) e bônus de indicação. Gorjeta é adicionada à cobrança e repassada integralmente à profissional; o bônus não aumenta a cobrança.

A administração marca a indicação por esta profissional **neste atendimento** na conclusão. Pix/dinheiro geram +15 pontos percentuais sobre os serviços; débito/crédito geram +10 pontos. A diferença de 5 pontos cobre a máquina somente nos casos de indicação, sem segundo desconto. Não se presume indicação pelo nome da cliente nem se estende automaticamente a outras visitas.

A profissional pode registrar a gorjeta ao concluir seu atendimento, mas não pode alterar a comissão base nem marcar indicação. O servidor calcula e grava os valores derivados; os campos derivados não são aceitos como entrada. Somente admin altera comissões históricas. A cobrança inclui serviços e gorjeta, sem lançar automaticamente uma saída/pagamento de comissão.

Campos novos têm zero/false como padrão; não se recalculam cobranças nem comissões de atendimentos antigos. Percentuais base ausentes continuam explicitamente pendentes. Relatórios somam comissões base conhecidas, bônus e gorjeta, com detalhamento separado.

Validação: 69 testes backend, 20 testes frontend, build e TypeScript. Testes incluem quatro meios de pagamento, gorjeta em valor/percentual, serviços adicionais, validação de valores negativos, permissões da profissional e impossibilidade de concluir novamente.
