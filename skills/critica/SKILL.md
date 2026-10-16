---
name: critica
description: >
  Judge your own video before showing it: capture frames and contact sheets with HyperFrames, run `motionforge
  check` (licenses, remote URLs, the "primitives aesthetic" detector) and `hyperframes check`, score each scene
  with a fixed rubric focused on real material, shots, text over image and coherence, fix the worst scene first,
  and record what the person approves or rejects in memory. Use after drafting scenes, before rendering the final
  MP4, and whenever the person gives feedback on a draft.
---

# Crítica

Você vê o vídeo pelos quadros, não pelo código. Julgue o que está na tela.

## 1. Gere a evidência

```bash
npx @eljonathas/motionforge check                                  # licenças, URLs remotas, estética de primitivas
npx hyperframes check                                # layout, contraste, runtime
npx hyperframes snapshot --frames 8                  # quadros espaçados do vídeo
npx hyperframes snapshot --composition <cena> --frames 4   # uma cena
```

Abra as imagens e olhe. Para comparar duas versões de uma cena: `npx hyperframes compare <a> <b> --at <s>`.

## 2. Pontue cada cena (0, 1 ou 2)

| Critério | 0 | 1 | 2 |
|---|---|---|---|
| **Material** | formas e ícones no lugar do assunto | material real, mas genérico ou fraco | material real que conta a ideia sozinho |
| **Plano** | slide parado ou movimento sem motivo | movimento correto, mas igual ao plano vizinho | escala e movimento motivados e variados |
| **Texto** | sobre o assunto, ilegível ou excessivo | legível, mas competindo com a imagem | no espaço negativo, curto, legível |
| **Coerência** | cor, luz ou grão destoam dos vizinhos | pequenas diferenças | parece filmado no mesmo dia |
| **Hierarquia** | o olho não sabe para onde ir | foco claro, mas segundo ponto fraco | o olho viaja do principal para o secundário |
| **Pedido** | não responde ao que foi pedido | responde em parte | responde e acrescenta |

Uma cena com **0 em Material** é refeita antes de qualquer outra coisa. O vídeo está pronto para mostrar quando
nenhuma cena tem 0 e a média é pelo menos 1,5.

## 3. O detector de estética de primitivas

O `motionforge check` marca cenas sem nenhum material real, cenas dominadas por círculos, elipses e retângulos
decorativos, fundos chapados sem textura e animações todas com a mesma curva e duração. Quando ele marcar uma
cena:

1. Volte à escada do material do `realismo` e escolha um degrau mais alto.
2. Busque o asset com `material`.
3. Mantenha formas só como apoio (seta, destaque, rota, marca de dado).

Não silencie o detector mudando o CSS para escapar da regra; troque o material.

## 4. Refaça na ordem certa

1. Cenas com 0 em Material.
2. Cenas com 0 em qualquer critério.
3. Coerência do filme inteiro (uma passada de gradação e grão).
4. Ajustes finos de tempo e texto.

Uma rodada de crítica por vez; não reescreva o vídeo inteiro por causa de uma cena.

## 5. Mostre à pessoa e aprenda

Mostre a folha de quadros antes do render final. Quando a pessoa aprovar, rejeitar ou corrigir algo, registre:

```bash
npx @eljonathas/motionforge memory add "título branco centralizado sobre foto de multidão" \
  --kind rejected --scene-type abertura \
  --reason "o texto cobria os rostos; ela pediu o texto no céu"
```

Registre o **porquê**, não só o quê. Lições com motivo são as que ajudam no próximo vídeo. Use `--global`
para uma preferência da pessoa que vale em todos os projetos.
