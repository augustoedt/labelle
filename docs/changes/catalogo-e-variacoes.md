# Catálogo, identidade visual e variações de serviços

Implementação local na branch `feature/variacoes-pmg-labelle`, em `~/projetos/labelle-melhorias`.

## Comportamento

- Cabeçalhos rosa (#F28FA3 → #F7A6B8), logo branca no aplicativo da cliente e cartões sobre fundo rosa claro.
- Catálogo com busca sem distinção de acentos, categorias, descrições, preço inicial calculado pelas opções ativas e seleção da variação antes do agendamento.
- O botão de agendamento do catálogo mantém serviço e opção escolhidos.
- Gestão de serviços com descrição e variações editáveis: nome, descrição, preço, duração, comissão e situação ativa. Serviço e opções são salvos na mesma transação. Opções existentes podem ser desativadas, preservando referências históricas.
- Agendamentos com referência à variação e cópia de nome, preço, duração e comissão. Alterar o preço no catálogo não reescreve reservas existentes. Uma troca de serviço/opção atualiza os dados comerciais.
- Agendamento online calcula os dados comerciais no servidor e mantém o estado `agendado`, exibido como “Aguardando confirmação”.
- O servidor verifica expediente, data futura, sobreposição e habilitação para opções com variação. Um lock transacional serializa solicitações online por profissional/data; não cobre gravações manuais que não utilizam esse lock.
- Vínculo da cliente é resolvido no backend a partir do telefone dentro da transação, sem aceitar associação arbitrária enviada pelo navegador.
- Agendamento confirmado pode ser exportado em `.ics`, no fuso do salão (João Pessoa, UTC−03), com duração escolhida e alarmes de 24h e 1h. A apresentação dos alarmes depende do aplicativo de calendário e das permissões do aparelho.
- Relatório de comissões usa a comissão registrada na reserva, mantendo o cálculo legado para reservas antigas.

## Cadastros e publicação

A opção Escova G corresponde ao pedido documentado: R$ 60, 40 minutos, comissão de 40%. A migração cadastra essa opção somente nos serviços existentes chamados Escova, da categoria cabelo, sem sobrescrever opções já cadastradas. Caso esse serviço ainda não exista, crie-o na gestão. Preços e durações de P e M não foram fornecidos no histórico acessível; o formulário permite cadastrá-los sem inventar valores.

Antes de publicar, revisar a migração, os serviços e vínculos de profissionais reais. A versão local não muda os dados de produção. As regras existentes de identificação da cliente por telefone não foram substituídas por um novo sistema de login nesta entrega.

## Verificação

Frontend: `node --test src/lib/serviceCatalog.test.js`, `npm run build`, `npx tsc --noEmit`.
Backend: `mix precommit`, usando banco PostgreSQL isolado. Para contêineres, `LABELLE_TEST_DB_HOST` e `LABELLE_TEST_DB_PORT` podem definir a conexão de teste, sem mudar o padrão localhost:5433.

Resultados finais constam no relatório de entrega. Nenhum push ou deploy é realizado por esses comandos.
