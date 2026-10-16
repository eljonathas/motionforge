# Coerência entre planos

Fotos e vídeos de fontes diferentes têm cor, contraste, nitidez e granulação diferentes. Sem tratamento, o vídeo
parece colagem. A técnica de tratamento (correção, presets, LUT, acabamento) é do `/media-use`
(`references/media-treatments.md`); aqui estão os critérios.

## O que unificar

| Aspecto | Critério |
|---|---|
| Temperatura de cor | todos os planos do mesmo lugar e momento na mesma temperatura; quente ou frio é uma decisão do filme |
| Contraste e pretos | pretos parecidos entre planos vizinhos; nenhum plano lavado ao lado de um plano saturado |
| Saturação | uma faixa para o filme; nada de um plano neon entre planos naturais |
| Granulação | grão uniforme por cima de tudo, inclusive textos e gráficos (1,5–4% de opacidade, animado por quadro) |
| Nitidez | não misture foto muito nítida com foto muito comprimida; se precisar, um leve desfoque iguala |

## Ordem de trabalho

1. Escolha o plano de referência (o mais importante ou o mais bonito).
2. Corrija os outros em direção a ele, um aspecto por vez, com o `/media-use`.
3. Aplique o acabamento comum (grão, vinheta leve se combinar) ao filme inteiro.
4. Compare os planos lado a lado com `npx hyperframes compare` ou uma folha de `snapshot`.

## Compondo recortes

- Sombra na direção da luz do fundo, com o mesmo grau de dureza.
- Bordas do recorte com 1–2 px de suavização; bordas duras denunciam colagem.
- A cor do recorte puxada para a cor ambiente do fundo.
- Ilustração e foto no mesmo quadro só como colagem assumida (estilo editorial), não por acaso.
