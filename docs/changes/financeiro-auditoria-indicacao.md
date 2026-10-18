# Financeiro, comentários de edições e vínculo da cliente

A cobrança concluída era sincronizada apenas na finalização. Edições posteriores de preços não atualizavam o lançamento, e o indicador Lucro não descontava as comissões. Agora edições de preço/comissão são atômicas e administrativas. Alterações em serviço principal/adicionais concluídos sincronizam o mesmo lançamento, preservando seu status; não criam uma cobrança inexistente. Gorjetas percentuais são recalculadas sobre os serviços atualizados.

O financeiro separa Entradas, Saídas, Saldo em caixa, Comissões dos recebidos e Saldo após comissões. Somente lançamentos pagos no período entram no caixa; comissões são calculadas sobre atendimentos concluídos vinculados às entradas pagas. Saídas de categoria comissão compensam o montante descontado, evitando desconto duplicado do repasse no mesmo período. Percentuais ausentes tornam o saldo explicitamente parcial.

Cada edição pós-conclusão registra autor, horário, campos anteriores/novos e comentário. Comentário é solicitado mas não bloqueia o salvamento. Cada evento sem comentário gera contorno vermelho e ícone no financeiro; a administração pode acrescentar o comentário posteriormente, preservando os valores do evento. A lista e o relatório Excel exibem o histórico. Não se inventa histórico de alterações anteriores à implantação.

O admin marca Cliente desta profissional já no agendamento. O vínculo fica salvo no cadastro e pré-marca futuras reservas com a mesma profissional, inclusive próximas visitas e reservas reconhecidas pelo celular. Não é estendido a outra profissional nem a clientes apenas com nomes iguais. Marcar com celular válido cria/vincula o cadastro sem duplicar o telefone. Sem celular/cadastro o agendamento segue permitido, mas o vínculo não pode ser memorizado por identidade. A migração reaproveita indicações anteriores somente quando há uma única profissional indicada para a cliente.

Profissionais não podem editar preço/comissão de concluídos, marcar indicação nem modificar o histórico; podem registrar gorjeta ao concluir conforme o fluxo já existente.

`FinancialReconciliation.preview/0` identifica cobranças pagas divergentes de serviços concluídos; `run!/0` corrige de forma idempotente com evento de auditoria e comentário de sistema. Ignora cobranças inexistentes e vínculos com múltiplos lançamentos de serviços, evitando inferências ambíguas.

Validação: 72 testes backend, 22 frontend, build e TypeScript. Cobrem cobrança após preço/comissão, adicionais incluídos/editados/excluídos, gorjeta percentual, auditoria/comentário posterior, permissões, memória por identidade/profissional, saldo sem duplo desconto e reconciliação idempotente.
