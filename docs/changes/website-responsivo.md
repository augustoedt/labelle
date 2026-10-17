# Website responsivo — 2026-10-17

Website baseado na referência enviada: marfim, bege, rosa e cobre, marca horizontal com símbolo original, apresentação, categorias, equipe e contato. Navegação móvel, catálogo P/M/G e agendamento em quatro etapas. Painel com menu lateral desktop e métricas reais.

`/app` apresenta o website; `/agendar` abre o fluxo com variações. Contatos vêm de Configurações. Identificação da cliente existente preservada, sem nova autenticação nesta entrega.

## Catálogo

Responsável aprovou todos os valores do JSON, inclusive PENDENTE. Fonte: [JSON aprovado](../data/variacoes_cabelo.aprovadas.json). Importação concluída: 15 serviços base, 30 opções em 10 serviços. Corte Masculino mantido inativo. Histórico e agendamentos preservados. Backup fora do Git: `~/projetos/labelle-db-backups/2026-10-17-variacoes-json-before.json`.

## Validação

Quatro testes de catálogo, vite build e tsc --noEmit aprovados. Inspeção visual do website e painel; catálogo → opção → profissional sem criar agendamentos. Larguras 320, 390, 768 e 1440 sem transbordamento horizontal no fluxo. Publicação no GitHub augustoedt/labelle, main, pelo autodeploy Railway existente.

## Imagem

Ferramenta integrada ImageGen. Asset: `labelle_front/public/images/salon-hero.webp`. Ambiente identificado como ilustrativo na página; não é fotografia do estabelecimento. Profissionais sem foto usam iniciais.

Prompt: Use case: photorealistic-natural. Asset type: wide website hero photograph for La Belle Studio, beauty salon. Primary request: create a warm sophisticated beauty salon interior, inspired by a refined beige and dusty rose salon website. Composition: horizontal editorial architectural photo, reception desk of curved warm travertine and brushed copper at the right, cream upholstered curved lounge chairs near left foreground, large arched mirrors and a subtle hairstyling station further back, sheer ivory curtains with natural daylight, botanical stems and soft indirect warm lighting. Palette: ivory, sand, muted dusty rose, walnut and copper. High-end but intimate and believable; calm welcoming atmosphere. No people. No logos, no lettering, no text, no collage, no phones, no UI elements. The image is an illustrative mood image, not documentation of a real business. Wide landscape composition suitable for a 16:9 hero crop with natural textures and restrained photographic contrast.
