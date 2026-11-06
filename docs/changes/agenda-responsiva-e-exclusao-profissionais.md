# Agenda responsiva e exclusão de profissionais — 2026-11-06

A grade diária da Agenda e do painel mantém o seletor de dias e oferece botões de profissionais de 60 × 44 px, usando os nomes cadastrados. Em celular, inicia na primeira profissional; em desktop, mantém a visão Todas. Os botões têm estado selecionado acessível e acompanham o gesto horizontal na área da grade: arrastar para a direita avança e para a esquerda retorna, sem circular nos limites. O botão selecionado permanece visível sem deslocar a página verticalmente. Horário livre continua abrindo novo agendamento com data, hora e profissional preenchidos.

A rolagem vertical continua livre e preserva a posição ao mudar de profissional. Depois de uma pausa de 180 ms, um ajuste suave de até 18 px enquadra o começo do expediente ou 13h, somente se a parada já estiver perto desses pontos. Horários intermediários permanecem acessíveis; não há scroll-snap obrigatório. A preferência de movimento reduzido é respeitada.

Quatro semanas usa lista por dia quando sua área disponível tem até 840 px, com dia da semana, data e serviços. A seleção filtra serviços principais e adicionais da profissional, incluindo inativas com reserva apenas no período exibido. Falha ao carregar adicionais mostra erro e opção de tentar novamente.

Os indicadores do painel e do financeiro se organizam pela largura efetiva do conteúdo, com espaço próprio para números. A sidebar ocupa menos espaço entre 1024 e 1279 px. Controles de toque, textos dos cartões públicos e formulários de adicionais foram ajustados; em telas de 320 px, nome/celular ficam em linhas separadas e os seletores adicionais empilham.

Na aba Profissionais, somente admin pode excluir e restaurar. Excluir solicita confirmação e desativa o cadastro; Inativos permite consulta e restauração. O cadastro, usuário vinculado, agendamentos, atendimentos, recebimentos e vínculos de serviços são preservados. O PATCH de is_active usado pela interface já é compatível com a versão anterior do backend; o DELETE do backend também passou a fazer exclusão lógica. Não há migração nem alteração automática de registros existentes.

## Validação

- Frontend: 43 testes, build Vite e TypeScript aprovados.
- Backend: mix precommit aprovado, 88 testes sem falhas. Novos testes HTTP negam DELETE/PATCH para anônimos e profissionais, inclusive a titular, e verificam preservação de dados e restauração pelo admin.
- Chrome com viewports emulados de 320, 390, 768, 1024, 1280 e 1440 px: formulários, agenda, quatro semanas, painel e financeiro. Valores fictícios longos (R$ 9.876.543,21), seis profissionais e nomes extensos usados para verificar quebras.
- Testados botão de profissional, arraste direita/esquerda, parada vertical em 11h30, clique em horário livre com preenchimento correto, inclusão de adicional com outra profissional, exclusão lógica e restauração pelo admin.
- Reservas, recebimentos e exclusão de teste ocorreram somente no banco local isolado, com cadastros fictícios. Nenhum registro de produção foi editado durante essa validação. Dispositivo físico e Safari não foram testados.
