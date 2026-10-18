# Pendências de celular e agendamento rápido — 2026-10-18

Somente áreas autenticadas. Agenda da gestão, grade diária, calendário de quatro semanas e agenda da profissional destacam telefone ausente/incompleto com ícone e contorno vermelho. Home administrativa e Clientes listam pendências, com preenchimento posterior. A área pública da cliente não importa ou apresenta os componentes de pendências.

O indicador conta registros de clientes e atendimentos sem vínculo; não presume que nomes iguais sejam a mesma pessoa. A aba Sem cadastro vinculado inclui todos os atendimentos sem client_id, inclusive os que já têm telefone. Por isso a quantidade sem vínculo pode ser diferente da quantidade sem celular. Sem migração, exclusão ou associação automática por nome.

A action complete_phone aceita apenas telefone, resolve/cria o cliente pelo número normalizado e vincula o atendimento. Apenas admin ou profissional dona podem executá-la. Preço, duração, estado, data e outras informações do atendimento permanecem inalteradas. Agendamento manual sem telefone continua permitido.

Clicar em horário livre da grade abre Novo Agendamento com data, hora e profissional preenchidas. No painel, abre o formulário da Agenda. Horários fora do expediente ou ocupados não oferecem criação. Nome sugere clientes ativos com telefone; serviço filtra conforme digitação, incluindo normalização de acentos. Selecionar cliente preenche telefone e vínculo, mantendo opção de nome avulso sem celular.

Validação: 58 testes backend (precommit), testes frontend, build e TypeScript. Prévia local validada para clique em 19/10 às 10:30, profissional preenchida e busca Escova. Preenchimento não é executado automaticamente em produção.
