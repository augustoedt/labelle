# Pendências de pagamento — 2026-10-20

Na conclusão, a profissional responsável ou a administração escolhe Pago integralmente, Pagamento parcial ou Pagamento pendente. Parcial exige valor positivo inferior ao total (serviços e gorjeta); pendente permite concluir sem forma de pagamento e sem recebimento. A cobrança guarda o total e pagamentos confirmados guardam o que foi recebido.

Financeiro mostra cliente/atendimento, total, recebido e saldo aberto. A administração registra novos pagamentos, cumulativos e em uma ou mais formas, até quitar o saldo. O backend valida o saldo sob bloqueio e grava pagamentos e situação na mesma transação; referência de envio evita duplicação em repetição. Profissionais não recebem acesso de escrita direta ao financeiro.

Home, financeiro e receita dos relatórios contam somente valores recebidos, pela data de cada pagamento. Lançamentos antigos pagos sem histórico individual preservam o cálculo anterior. O indicador de comissões dos recebidos usa a fração recebida; comissões registradas dos atendimentos permanecem separadas. A regra de bônus por indicação continua +15 p.p. em Pix/dinheiro e +10 p.p. se houver cartão, somente nos serviços realizados por quem indicou.

Sem migração, exclusão ou alteração retroativa de registros de produção. Testes: 79 backend, 28 frontend, build e TypeScript. Teste de interface isolado: atendimento R$60, recebido R$20, saldo R$40; recebimento posterior de R$40 quita a conta, retira a pendência e aumenta o caixa somente em R$40.
