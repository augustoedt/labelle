# Cadastros com dados inválidos e mesclagem auditada

**Estado:** pendente; não implementar junto ao vínculo simples de novos agendamentos.

Um telefone digitado errado pode criar um segundo cadastro para uma pessoa já cadastrada. Corrigir apenas o vínculo de um agendamento não elimina o cadastro incorreto nem reconcilia atendimentos, cobranças, pagamentos e lembretes associados a ambos os clientes.

Quando o caso surgir, definir um fluxo administrativo para marcar dados inválidos com motivo e responsável, impedir vínculo automático com o número contestado e, se ambos os cadastros tiverem histórico, apresentar prévia dos vínculos e mesclar com auditoria e operação atômica. Não mesclar por nome, apagar histórico ou presumir que `is_active = false` bloqueie a busca por telefone: atualmente ela encontra inclusive registros inativos, e o telefone continua sujeito à chave única.

Até existir esse fluxo, qualquer caso concreto requer análise manual dos dois cadastros e autorização específica antes de modificar dados de produção.
