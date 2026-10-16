# Planos e movimentos de câmera sobre material real

A implementação dos keyframes (wrapper, `scale`, `x`, `y`, `clip-path`, timeline pausada e seek-safe) é do
`/hyperframes-keyframes`. Aqui estão as **escolhas** e os **valores** que fazem o movimento parecer filmado.

## Escalas de plano

| Plano | Mostra | Uso típico |
|---|---|---|
| Geral | o lugar inteiro, o contexto | abrir um assunto, mudar de lugar |
| Médio | a pessoa ou o objeto com algum entorno | explicar, apresentar |
| Detalhe | uma parte (mãos, textura, um número no papel) | dar prova, ritmo, emoção |

Sequência que funciona na maior parte dos vídeos narrados: geral → médio → detalhe → médio, e repetir com
variação. Dois detalhes seguidos cansam; dois gerais seguidos parecem slideshow.

## Movimentos sobre foto

Valores para 1920×1080 a 30 fps, com o plano inteiro como duração do movimento.

| Movimento | Como | Faixa segura | Quando |
|---|---|---|---|
| Push-in | escala de 1,00 para 1,06–1,12, ancorada no ponto de interesse | 6–12% no plano todo | aproximar o espectador do assunto; tensão, foco |
| Pull-out | o inverso, de 1,10 para 1,00 | 6–10% | revelar contexto, terminar uma ideia |
| Pan lateral | translação de 3–6% da largura, com escala fixa de 1,08–1,12 (para ter borda sobrando) | 3–6% | seguir uma linha (estrada, prateleira, horizonte) |
| Tilt | translação vertical equivalente | 3–6% | de baixo para cima em prédios, árvores, pessoas em pé |
| Parallax 2.5D | camadas recortadas movendo-se em ritmos diferentes (fundo 0,3×, meio 0,6×, frente 1,0×) | translação total da frente ≤ 5% | dar volume a uma foto única; transições suaves |

Regras:

- **Um movimento por plano.** Zoom e rotação juntos, ou zoom e pan em direções opostas, parecem efeito de
  apresentação.
- **Curva quase linear.** `none` ou `sine.inOut`; nada de `back`, `elastic` ou `bounce` em câmera sobre foto.
- **Comece e termine no assunto.** O ponto de ancoragem da escala é o assunto, não o centro da imagem.
- **Resolução sobra.** A imagem precisa ter pelo menos a resolução de saída vezes a escala final (para 1920 px e
  escala 1,12, mais de 2150 px de largura). Se não tiver, troque o asset ou reduza o movimento.
- **Bordas.** Em pan, tilt e parallax, mantenha escala mínima suficiente para que nenhuma borda da imagem entre
  no quadro em nenhum instante. Confira com `npx hyperframes snapshot --at` no começo e no fim do plano.

## Parallax a partir de uma foto

1. Separe o assunto do fundo (remoção de fundo do `/media-use`, ou um PNG recortado que você já tenha).
2. O fundo vira a camada de trás; preencha o buraco deixado pelo assunto (desfoque forte, ou uma versão da foto
   sem o assunto, ou simplesmente escala maior para cobrir).
3. Desfoque leve no fundo (2–6 px) vende profundidade de campo.
4. Mova as camadas na mesma direção, em ritmos diferentes; nunca em direções opostas.
5. Mantenha a sombra do assunto coerente com a luz do fundo.

## Vídeo real

- Corte no gesto: comece um pouco antes da ação e termine logo depois.
- Não acelere nem desacelere sem motivo narrativo.
- Som ambiente do vídeo fica mudo por padrão; entra só se a história pedir, e baixo.
- Evite cortar entre dois vídeos com movimentos de câmera opostos (um indo para a esquerda, o próximo para a
  direita), a menos que seja a intenção.

## Transições entre planos

Corte seco é o padrão do cinema e funciona para quase tudo. Use dissolve curto (8–15 quadros) para passagem de
tempo ou de lugar. Transições vistosas do catálogo do `/hyperframes-animation` são para vídeos gráficos; num vídeo
realista, cada uma precisa de um motivo.
