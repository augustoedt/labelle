# Pontuação automática da campanha — 06/11/2026

## Regra autorizada

Campanha de 01/10/2026 a 31/12/2026, inclusive, com apuração até a data local atual de São Paulo. Um ponto por real recebido em serviços; frações acumulam por cliente antes de arredondar para baixo. Mais 50 pontos por dia distinto com atendimento concluído e 100 pontos uma vez por mês ao atingir três dias distintos. Visitas concluídas contam mesmo com pagamento pendente; os pontos por valor entram conforme o recebimento. Serviços adicionais pontuam pelo valor, sem multiplicar bônus de visita.

Prêmios em janeiro/2027: primeiro Dia de Princesa com cabelo (procedimento além da escova ainda a definir), escova, manicure, pedicure e maquiagem social; segundo hidratação e escova; terceiro manicure e pedicure. Esta entrega automatiza pontos, sem implementar resgate ou escolha das vencedoras.

## Implementação

Notificador Ash recalcula após operações confirmadas em Appointment, AppointmentService, Transaction, Payment e Client, abrangendo conclusão, edições, vínculo e recebimentos posteriores. Usa a fórmula da atualização retroativa: saldos são substituídos pelo total apurado, nunca incrementados cegamente. Recibos prevalecem sobre cobranças legadas; fallback para cobranças pagas somente quando não existem recibos. Gorjetas, voucher/cortesia, cobranças canceladas/estornadas e recibos não confirmados não geram pontos por valor. O valor pontuável é limitado ao total dos serviços. Nenhuma associação por nome.

Recalcular novamente não duplica saldo ou auditoria. Bloqueio transacional serializa reconciliações. A tabela interna loyalty_point_audits guarda saldo anterior/novo, valor recebido, dias, bônus e instante de cada mudança. Nenhuma API pública nova. Falha no notificador agenda nova tentativa Oban; reconciliação a cada cinco minutos recupera notificações perdidas e atualizações externas. A ação de negócio permanece confirmada se a reconciliação posterior falhar.

Datas do atendimento e recebimento devem estar dentro do encerramento da campanha; recebimentos em janeiro não pontuam nesta campanha. Correções/estornos de registros elegíveis podem corrigir o saldo depois do encerramento. Não foi criada campanha para 2027. Não alterados faixas, benefícios ou a divergência pré-existente entre faixas do portal e gestão: a entrega é de pontuação, não níveis.

## Retroativo e validação

Antes desta entrega: 61 de 88 clientes receberam 11.980 pontos pela operação autorizada, com R$8.330 em serviços e 73 dias de visita; nenhuma atingiu bônus mensal nos dados vinculados. Backup e comprovante privados em ~/projetos/labelle-auditoria/fidelidade-20261106. Dois concluídos sem vínculo ficaram de fora. A automação reaplica a mesma fórmula, preservando esses pontos sem duplicação.

mix precommit: 107 testes, zero falhas (oito novos). Cenários: conclusão real via Ash, idempotência/auditoria, visitas no mesmo dia e bônus mensal, pagamento parcial seguido de recebimento idempotente, estorno de cobrança/recibo, cortesia/voucher, gorjeta, frações, setembro/outubro/dezembro/janeiro e edição de serviço adicional. Banco local isolado, sem clientes reais de teste em produção. Migração aditiva cria apenas tabela de auditoria e índice; não muda pagamentos ou cobranças.
