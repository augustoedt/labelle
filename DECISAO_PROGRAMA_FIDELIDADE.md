# Decisão necessária — Programa de Fidelidade

> Documento para a pessoa responsável pelo negócio. Nada de código aqui — só o que
> o sistema faz hoje, o que está divergente e as perguntas que precisam de resposta.

---

## 1. Como o programa de fidelidade funciona hoje

O sistema tem um programa de pontos com 4 níveis:

| Nível | Nome |
|-------|------|
| 🥉 | Bronze |
| 🥈 | Prata |
| 🥇 | Ouro |
| 💎 | VIP |

Ele aparece em **dois lugares**:

1. **No app de gestão (tela do salão)** — mostra a lista de clientes organizada por nível, com a quantidade de pontos de cada um.
2. **No app da cliente (portal público)** — a cliente digita o WhatsApp e vê o nível dela, os pontos, e uma barra de progresso mostrando quanto falta para subir de nível.

---

## 2. O problema: os dois lugares mostram regras diferentes

Cada tela usa uma faixa de pontos diferente para definir os níveis:

| Nível | Faixa no app do salão | Faixa no app da cliente |
|-------|----------------------|------------------------|
| 🥉 Bronze | 0 a 99 pontos | 0 a 499 pontos |
| 🥈 Prata | a partir de 100 | a partir de 500 |
| 🥇 Ouro | a partir de 300 | a partir de 1000 |
| 💎 VIP | a partir de 600 | a partir de 2000 |

**Exemplo prático do impacto:** uma cliente com 250 pontos aparece como **Prata** para o salão, mas o app da cliente mostra o nível dela como **Bronze** (e a barra de progresso indica que faltam 250 pontos para ela chegar a Prata). A mesma pessoa, dois resultados diferentes.

---

## 3. Por que isso acontece (explicação simples)

O sistema **não calcula pontos automaticamente**. Ele apenas:

- Guarda um número de pontos para cada cliente (hoje tudo em **0**);
- Guarda um nível para cada cliente (hoje todos em **Bronze**).

Não existe nenhuma regra no sistema do tipo *"a cada R$ X gastos, a cliente ganha 1 ponto"* ou *"a cada Y visitas, sobe de nível"*. Os pontos só mudam se alguém alterar manualmente o cadastro da cliente.

E como cada uma das duas telas foi programada com uma regra própria (sem conversar entre si), elas divergem.

---

## 4. Perguntas para você decidir

### Pergunta 1 — Existe uma regra de pontos na vida real?
Fora do sistema (no dia a dia do salão), **como os pontos funcionam hoje?**
- A cliente ganha pontos por valor gasto? Quanto? (ex.: 1 ponto por R$ 1, ou 1 ponto por R$ 10)
- A cliente ganha pontos por visita? Quantos?
- Existe bônus em datas especiais (aniversário, indicação)?

Se hoje **não existe regra nenhuma** (é tudo no "olhômetro"), tudo bem — só precisamos saber disso para definirmos a melhor opção abaixo.

### Pergunta 2 — Qual é a faixa correta de pontos?
Entre as duas faixas abaixo, **qual representa a intenção do programa?**

| Nível | Opção A (atual app do salão) | Opção B (atual app da cliente) |
|-------|------------------------------|--------------------------------|
| 🥉 Bronze | 0 a 99 | 0 a 499 |
| 🥈 Prata | 100 a 299 | 500 a 999 |
| 🥇 Ouro | 300 a 599 | 1000 a 1999 |
| 💎 VIP | 600+ | 2000+ |

> Dica: se 1 ponto = R$ 1 gasto, a Opção A significa VIP a partir de R$ 600 gastos e a Opção B a partir de R$ 2.000. Depende de quanto a cliente média gasta.

### Pergunta 3 — Os pontos devem ser calculados automaticamente?
Quer que o sistema **calcule sozinho** os pontos de cada cliente (com base nas compras/visitas registradas no sistema)?

- **Sim** — os pontos e o nível passam a ser atualizados automaticamente a cada venda/finalização de atendimento. Sem trabalho manual, sem divergência.
- **Não** — continuamos controlando pontos manualmente (editar o cadastro da cliente), mas pelo menos as duas telas passam a usar a **mesma** faixa de pontos.

---

## 5. O que faremos com a sua resposta

| Sua resposta | O que será feito |
|--------------|------------------|
| Definir faixa correta + cálculo automático | O sistema passa a calcular pontos sozinho (regra que você definir na Pergunta 1) e as duas telas mostram exatamente o mesmo resultado. |
| Definir faixa correta + controle manual | As duas telas passam a usar a mesma faixa de pontos, com edição manual. Divergência eliminada, mas pontos continuam sendo preenchidos à mão. |
| Não sabe / quer discutir | Marcamos uma conversa curta para alinhar a regra de negócio antes de mexer no sistema. |

---

## 6. Recomendação

Se existe (ou faz sentido criar) uma regra de pontuação, o ideal é **calcular automaticamente**:

- Elimina a divergência de uma vez (as duas telas sempre iguais);
- A cliente vê o nível dela atualizado na hora, o que valoriza o programa;
- Reduz trabalho manual do salão.

A escolha da faixa (Opção A ou B) depende de quanto a cliente gasta em média — por isso as perguntas acima são importantes.

---

*Documento técnico complementar (para referência interna): a divergência está em `src/pages/Loyalty.jsx` (0/100/300/600) e `src/components/client-app/ClientLoyalty.jsx` (0/500/1000/2000); o backend (`clients.loyalty_points` / `clients.loyalty_tier`) armazena os valores mas não os calcula.*
