# Lembretes automáticos e auditoria de fidelidade — 2026-11-06

## Auditoria somente leitura

Consulta por SSH à release de produção, sem gerar lembretes nem enviar mensagens: 13 lembretes de agradecimento com status falhou, nenhum registro enviado e sent_at vazio. Os jobs diários de geração e entrega possuem execuções concluídas; um job concluído não garante envio, pois a rotina anterior retornava sucesso mesmo quando todos os contatos falhavam. Os logs registraram WAHA HTTP 500 / No LID for user em 21/10. A sessão WAHA consultada agora está WORKING. Conexão ativa não comprova entrega das mensagens antigas.

A regra anterior de reengajamento contava 45 dias desde o último lembrete, podendo levar cerca de 65 dias desde a visita. Falhas não eram selecionadas novamente pela entrega automática. Fidelidade: os 88 cadastros consultados têm zero pontos; não foi encontrado cálculo automático de pontuação ou aplicação automática dos benefícios exibidos.

## Regras implementadas

- Retorno: agradecimento aos 20 dias da última visita concluída; reengajamento aos 45 dias sem retorno. Novos reengajamentos somente 45 dias após o último reengajamento enviado. Agradecimentos antigos são cancelados quando já cabe reengajamento.
- Clientes ativos, com telefone brasileiro de 10/11 dígitos nacionais (também aceita DDI55); histórico por client_id. Sem vínculo/celular, não se inventa associação por nome. Novo agendamento em aberto suspende contatos de retorno; nova visita reinicia o ciclo. Cancelamentos manuais são respeitados.
- Geração diária às 09h e entrega às 09h30 de São Paulo. Falhas são retomadas na próxima entrega diária, reutilizando o registro, após verificar novamente visita, agenda, situação do cliente e celular atual.
- Agenda: busca automática a cada minuto, envia pelo template de lembrete 2h antes de agendamentos agendados/confirmados. Usa horário local de São Paulo (UTC-3), inclusive virada de dia; recupera atraso do agendador de até cinco minutos. O envio manual permanece disponível.
- Oban deduplica por agendamento/data/hora, inclusive jobs concluídos. Antes de enviar, revalida a reserva: cancelados, concluídos, em atendimento e horários alterados não recebem o lembrete antigo. Falha do provedor permite novas tentativas, limitadas ao início do serviço. Aceite do provedor registra outcome=sent e sent_at no meta do job, sem copiar telefone ou texto.
- Gestão: filtro Falhas e reenvio manual de contatos falhos. A interface não presume entrega por simplesmente abrir o WhatsApp.

Nenhuma migração ou disparo manual em massa foi executado. Os envios continuam dependentes de números válidos e do WAHA aceitar cada mensagem; aceite HTTP não comprova leitura/recebimento pelo aparelho.

## Fidelidade: proposta, ainda não aplicada

As faixas continuam divergentes: gestão 0/100/300/600; portal 0/500/1000/2000. O backend guarda pontos e nível, mas não calcula pontuação por atendimento. Descontos e serviços gratuitos anunciados no portal não possuem aplicação automática no fechamento. Não foi alterado nenhum saldo de pontos, faixa ou benefício nesta tarefa.

Sugestão para uma implementação posterior, após decisão do responsável:

1. Uma única regra no backend para as duas telas: 1 ponto por R$1 efetivamente recebido em serviços, acumulando frações em centavos; gorjetas, estornos e pagamentos duplicados não geram pontos. Pagamento parcial credita somente o recebido; estorno reverte o crédito correspondente.
2. Faixas únicas Bronze 0, Prata 500, Ouro 1000 e VIP 2000 pontos, evitando a divergência atual. A pontuação acumulada e o saldo resgatável devem ser campos separados se houver resgate.
3. Começar com um benefício simples e controlado pelo admin, por exemplo um crédito de R$20 ao acumular 500 pontos resgatáveis, sem acumular com outra promoção. É apenas proposta comercial, sem aplicação automática.
4. Livro de movimentos de pontos vinculado ao recebimento, com idempotência, reversão e auditoria. Carga retroativa somente após prévia e autorização; não transformar histórico existente em pontos silenciosamente.

## Testes

mix precommit: 99 testes, zero falhas, incluindo 11 novos cenários de automação e contato. Cobertura: limites 19/20/45 dias, reengajamento repetido, retorno, nova visita, falha e nova tentativa, cancelamento manual, telefone inválido, deduplicação após conclusão do job, UTC-3/meia-noite, alterações/cancelamentos/início do atendimento e comprovante técnico de envio. Adaptador fictício e banco local isolado; nenhum WhatsApp real enviado pelos testes.

Frontend: 43 testes, build e TypeScript aprovados. Não foi aplicado benefício nem pontuação automática de fidelidade; a proposta requer decisão de produto.
