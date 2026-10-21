# Conciliar atendimentos históricos sem cadastro vinculado

**Estado:** conciliação parcial autorizada; atendimento sem telefone permanece pendente de identificação pela equipe.

As novas criações manuais com telefone completo passam a vincular cadastro, e `visit_count` é calculado a partir dos agendamentos concluídos com `client_id`. Atendimentos **antigos** sem vínculo continuam sem visita atribuída, mesmo que tenham nome ou telefone gravados.

Antes de executar qualquer correção, gerar uma prévia somente leitura por atendimento: status, telefone normalizado válido (10/11 dígitos nacionais), cadastro existente com correspondência exata, duplicidades ou conflitos, e vínculos financeiros associados. Conferir a identidade com a equipe autorizada. Se houver cliente correspondente, vincular após revisão; se não houver, só criar cadastro com nome/telefone confiáveis e autorização. Registros sem telefone, com telefone incorreto ou ambíguos ficam para análise manual. Não associar por nome, não reescrever cobranças/pagamentos sem plano específico e não executar backfill silencioso.

Após o vínculo confirmado, a contagem derivada passa a incluir os atendimentos `concluido` sem job periódico.

## Prévia de produção (somente leitura, 21/10/2026)

Antes da conciliação havia **5 agendamentos sem `client_id`**: 3 concluídos com telefones nacionais de 11 dígitos válidos, todos distintos e ainda sem cadastro (também sem correspondência pelo telefone bruto); 1 concluído sem telefone; e 1 cancelado com telefone válido, que não representa visita. Os 4 concluídos tinham uma cobrança cada, sem recebimentos associados. Não havia correspondência exata com clientes existentes para os três números válidos. A prévia foi somente leitura.

## Execução autorizada (21/10/2026)

O responsável autorizou **criar somente para os atendimentos concluídos com nome e telefone**. Após nova prévia e travas de identidade/status/telefone no banco, foram criados 3 cadastros, vinculados os 3 atendimentos e inseridos 3 registros de auditoria em `financial_edits` (`reconcile_historical_client`) em uma única transação. Verificação posterior: 3 concluídos vinculados a 3 clientes distintos; permanecem sem vínculo **1 concluído sem telefone** e **1 cancelado**. Cobranças e pagamentos não foram alterados; as 3 cobranças desses atendimentos continuam sem `client_id`. A contagem de visitas derivada incluirá esses atendimentos após a publicação do código correspondente.

A equipe precisa obter o telefone correto e confirmar a identidade do atendimento concluído restante; não inferir pelo nome. O cancelado não conta como visita e ficou sem alteração. Reatribuição financeira dos lançamentos antigos requer plano e auditoria específicos, sem alterar valores ou status por efeito deste vínculo. Para novas conciliações, repetir a prévia imediatamente antes de qualquer escrita.
