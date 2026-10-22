# Conciliar atendimentos históricos sem cadastro vinculado

**Estado:** conciliação parcial autorizada; atendimentos restantes aguardam conferência de identidade e telefone pela equipe.

As novas criações manuais com telefone completo passam a vincular cadastro, e `visit_count` é calculado a partir dos agendamentos concluídos com `client_id`. Atendimentos **antigos** sem vínculo continuam sem visita atribuída, mesmo que tenham nome ou telefone gravados.

Antes de executar qualquer correção, gerar uma prévia somente leitura por atendimento: status, telefone normalizado válido (10/11 dígitos nacionais), cadastro existente com correspondência exata, duplicidades ou conflitos, e vínculos financeiros associados. Conferir a identidade com a equipe autorizada. Se houver cliente correspondente, vincular após revisão; se não houver, só criar cadastro com nome/telefone confiáveis e autorização. Registros sem telefone, com telefone incorreto ou ambíguos ficam para análise manual. Não associar por nome, não reescrever cobranças/pagamentos sem plano específico e não executar backfill silencioso.

Após o vínculo confirmado, a contagem derivada passa a incluir os atendimentos `concluido` sem job periódico.

## Prévia de produção (somente leitura, 21/10/2026)

Antes da conciliação havia **5 agendamentos sem `client_id`**: 3 concluídos com telefones nacionais de 11 dígitos válidos, todos distintos e ainda sem cadastro (também sem correspondência pelo telefone bruto); 1 concluído sem telefone; e 1 cancelado com telefone válido, que não representa visita. Os 4 concluídos tinham uma cobrança cada, sem recebimentos associados. Não havia correspondência exata com clientes existentes para os três números válidos. A prévia foi somente leitura.

## Execução autorizada (21/10/2026)

O responsável autorizou **criar somente para os atendimentos concluídos com nome e telefone**. Após nova prévia e travas de identidade/status/telefone no banco, foram criados 3 cadastros, vinculados os 3 atendimentos e inseridos 3 registros de auditoria em `financial_edits` (`reconcile_historical_client`) em uma única transação. Verificação posterior: 3 concluídos vinculados a 3 clientes distintos; permanecem sem vínculo **1 concluído sem telefone** e **1 cancelado**. Cobranças e pagamentos não foram alterados; as 3 cobranças desses atendimentos continuam sem `client_id`. Após a publicação em 22/10/2026, a consulta somente leitura retornou 1 visita concluída por cadastro conciliado (3 no total).

## Novas pendências observadas em 22/10/2026

Após a conciliação inicial, surgiram mais **8 atendimentos concluídos sem `client_id`**, todos com nome e telefone completo, em 7 números distintos. Um número aparece em dois atendimentos com **nomes divergentes**; os demais não têm correspondência com clientes existentes nem pelo telefone bruto. Cada um tem uma cobrança e nenhum recebimento associado. Naquela prévia, os 8 ficaram sem alteração, aguardando conferência individual da identidade e autorização para a nova leva. Também permaneciam o concluído sem telefone e o cancelado da prévia anterior.

## Conciliação do telefone compartilhado (22/10/2026)

O responsável confirmou a criação de **um único cadastro** para os dois atendimentos de mesmo telefone, com o nome do atendimento mais recente (18h, em vez do nome das 9h). Foram reconfirmados o telefone de 11 dígitos idêntico nos dois, o status `concluido`, a ausência de cliente existente e de outros atendimentos com esse número. Em uma transação, criou-se 1 cliente, vincularam-se os 2 atendimentos e registraram-se 2 auditorias com o autorizador identificado. A verificação somente leitura confirmou 2 visitas concluídas para o cliente. As 2 cobranças permaneceram sem `client_id`; pagamentos não foram alterados.

Prévia posterior: **6 concluídos com telefone completo ainda sem vínculo, 2 concluídos sem telefone e 1 cancelado**. Esses números podem mudar com novos atendimentos; repetir a prévia antes de qualquer outra conciliação.

A equipe precisa obter os telefones corretos e confirmar a identidade dos atendimentos concluídos sem telefone; não inferir pelo nome. O cancelado não conta como visita e ficou sem alteração. Reatribuição financeira dos lançamentos antigos requer plano e auditoria específicos, sem alterar valores ou status por efeito deste vínculo. Para novas conciliações, repetir a prévia imediatamente antes de qualquer escrita.
