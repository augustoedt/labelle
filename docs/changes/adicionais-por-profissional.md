# Serviços adicionais por profissional

Cada adicional tem sua profissional e nome registrados, com preço, duração e comissão do serviço/opção P/M/G. A gestão seleciona quem executa, inclusive em atendimento concluído; é permitido repetir serviços e profissionais no mesmo horário para a mesma cliente. A cobrança permanece única no atendimento principal e continua sincronizada e auditada nas edições após conclusão.

Bônus de indicação: +15 pontos percentuais em Pix/dinheiro ou +10 no cartão, somente sobre os serviços executados pela própria profissional que indicou a cliente. Serviços de outras profissionais geram apenas a comissão base para suas executoras, sem bônus para quem indicou. A indicação é registrada separadamente no atendimento; se quem indicou participar apenas em um adicional, recebe bônus somente nesse adicional. Gorjeta do fluxo de conclusão continua explicitamente destinada à profissional principal.

Comissões no financeiro, ranking, planilha e visão da profissional são distribuídas por executora. A agenda diária mostra cada serviço na coluna da executora; quatro semanas e agenda da profissional também incluem os adicionais. Participantes consultam seus serviços sem receber permissão para editar valores ou finalizar o atendimento principal de outra profissional. A administração e a profissional responsável pelo atendimento aberto podem selecionar outra executora habilitada. Edições após conclusão e alterações de valores/comissões permanecem exclusivas da administração.

A disponibilidade considera os adicionais e o reagendamento verifica todas as profissionais envolvidas. Sobreposições dentro do atendimento ou para a mesma cliente vinculada são permitidas; uma profissional adicional ocupada com outra cliente não pode ser selecionada.

Migrações preservam os adicionais antigos atribuindo-os à profissional principal, como funcionavam antes, e preservam a identidade da indicadora nos atendimentos já marcados. Não há exclusão de clientes/agendamentos nem recálculo retroativo de cobranças.

Validação: 77 testes backend, 25 frontend, build e TypeScript. Cobrem simultaneidade, permissões, cobrança única/auditoria, disponibilidade/reagendamento e bônus por executora em Pix/cartão. Teste visual isolado: principal R$100/50%, adicional da própria indicadora R$60/40% e de outra executora R$60/40%; indicadora recebe R$98 (base R$74 + bônus R$24), outra recebe R$24, comissão total R$122 e cobrança R$220.

A tela de conclusão usa duas colunas no desktop, com serviços e pagamento juntos, total e ações sempre visíveis e campos compactos. Textos explicativos foram removidos. A inclusão de adicional por outra profissional foi validada com conta profissional em ambiente local isolado; preços e comissões seguem o catálogo.
