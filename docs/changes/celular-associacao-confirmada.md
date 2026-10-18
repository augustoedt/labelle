# Celular por cartão e associação confirmada — 2026-10-18

Na Home e na grade da Agenda, clicar em atendimento sem celular abre um formulário específico para preencher o número e vincular cliente. A lista de pendências usa o mesmo formulário. Outros atendimentos autorizados com o mesmo nome aparecem com caixas de seleção desmarcadas: somente os confirmados são associados ao telefone informado.

O backend confere nome, telefone já existente, vínculo e permissão de cada registro. A associação é transacional; qualquer falha reverte a operação. Cadastro resolvido pelo celular normalizado e upsert pela identidade única, sem sobrescrever o nome do cliente existente. Não há associação automática de pessoas pelo nome nem alteração de dados de produção durante a validação.

Validação: 62 testes backend via mix precommit, 17 frontend, build e TypeScript. Casos incluem reutilização por número, conflito de upsert, seleção parcial, nome divergente e acesso a atendimento de outra profissional.
