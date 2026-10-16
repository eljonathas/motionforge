# Experimento 0001 — HyperFrames sozinho × HyperFrames + MotionForge

Status: preparado, aguardando acesso às fontes de assets.

## Pergunta

As skills e ferramentas do MotionForge produzem vídeos realistas visivelmente melhores do que o HyperFrames
sozinho, com o mesmo modelo e o mesmo pedido? Se não, o projeto para ou vira contribuição para o HyperFrames.

## Desenho

| | Braço A | Braço B |
|---|---|---|
| Motor | HyperFrames 0.8.164 | HyperFrames 0.8.164 |
| Skills | só as do HyperFrames | as do HyperFrames + `motionforge`, `realismo`, `material`, `critica` |
| Ferramentas | `npx hyperframes` | `npx hyperframes` + `motionforge` (CLI) |
| Modelo | Sonnet | Sonnet |
| Material | o que o agente conseguir sozinho com o que o HyperFrames oferece | `motionforge assets` (Pexels, Poly Haven, Openverse) |

Cada braço roda em sessão isolada, sem ver o trabalho do outro. Mesmos limites: 30 s, 1080×1920, sem áudio
(o áudio fica fora para não misturar variáveis).

## Pedidos

1. "Faça um vídeo vertical de 30 segundos mostrando como o pão de fermentação natural é feito, do fermento à
   primeira fatia. Texto curto na tela, sem narração."
2. "Faça um vídeo vertical de 30 segundos sobre o caminho do café, do grão no pé até a xícara. Texto curto na
   tela, sem narração."

## O que medimos

| Medida | Como |
|---|---|
| Preferência do mantenedor | os dois vídeos de cada pedido lado a lado, sem saber qual é qual; ele escolhe o melhor e diz por quê |
| Rubrica da `critica` | nota 0–2 por cena em material, plano, texto, coerência, hierarquia e pedido, dada por quem não fez o vídeo |
| Estética de primitivas | `motionforge check` nos dois braços: cenas sem material real |
| Custo | tokens e chamadas de ferramenta de cada sessão |
| Falhas | renders que não saíram, erros que exigiram intervenção |

## Critério de decisão

- **Segue:** o B vence a preferência nos dois pedidos **e** tem nota média de rubrica pelo menos 0,5 acima do A.
- **Repensa:** empate ou vitória dividida.
- **Para:** o A vence ou empata nos dois.
