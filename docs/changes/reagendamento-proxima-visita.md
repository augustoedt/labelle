# Cancelamento, reagendamento e próxima visita — 2026-10-18

Áreas logadas da gestão e profissionais: botões de Cancelar agendamento (com confirmação), Reagendar (data e horário) e Agendar próxima visita em atendimentos concluídos. As ações também ficam acessíveis ao abrir o cartão vermelho e no detalhe editável da gestão.

Reagendamento usa action restrita a data/hora, permitida a admin e profissional dona. Somente agendado/confirmado pode ser movido; expediente, data futura e conflito são conferidos com trava transacional. O registro original é excluído da checagem de sobreposição consigo mesmo. Cancelamento preserva histórico.

Na conclusão há uma opção de agendar a próxima visita. Após concluir e cobrar, abre formulário novo com cliente, celular, serviço, variação e profissional reaproveitados; a data pode ser escolhida. A nova action book_return exige staff autorizado, calcula preço/duração no servidor e valida disponibilidade. Celular continua opcional para agendamento manual. O atendimento anterior não é sobrescrito.

Validação: mix precommit com 65 testes sem falhas; 17 testes frontend, build e TypeScript aprovados. Testes cobrem conflito, autorização, não reagendar concluído, preservação de preço e nova visita sem telefone.
