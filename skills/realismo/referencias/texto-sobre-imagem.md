# Texto sobre imagem

Escala de fonte, pares tipográficos e regras de legibilidade em vídeo são do `/hyperframes-creative`
(`typography.md`, `video-composition.md`). Aqui está como pôr texto **em cima de foto e vídeo** sem matar a
imagem.

## Onde colocar

1. Procure o **espaço negativo**: céu, parede, chão, mesa, desfoque de fundo.
2. Se o assunto está num terço da imagem, o texto vai no terço oposto.
3. Nunca sobre rostos, olhos, mãos fazendo a ação, ou o detalhe que a narração cita.
4. Respeite a área segura: margem de 5% em todos os lados para títulos; legendas acima dos 10–15% inferiores em
   vídeos verticais (a interface das redes cobre a parte de baixo).

## Como garantir contraste sem um véu

| Técnica | Como | Quando |
|---|---|---|
| Gradiente de borda | preto (ou cor escura da paleta) de 0% a 50–65% de opacidade, da borda mais próxima até cerca de 40% do quadro | a forma mais natural; parece luz da própria foto |
| Painel local | retângulo só atrás do bloco de texto, com desfoque do que está atrás (`backdrop-filter`) e leve escurecimento | fotos muito ocupadas |
| Escolher o asset | trocar por uma foto com espaço negativo | quase sempre é a melhor saída |

Evite um retângulo preto semitransparente sobre a foto inteira: apaga a imagem e parece slide.

O contraste final é conferido pelo `npx hyperframes check` (WCAG AA). Ele mede o texto sobre o que estiver atrás,
inclusive a foto.

## Quanto texto

- O que a imagem já mostra não precisa ser escrito.
- Uma ideia por plano; uma linha curta é melhor que duas.
- Tempo de leitura: pelo menos 1 s mais 0,3 s por palavra antes de o texto sair.

## Entrada do texto

Sobre foto, o movimento principal é o da câmera. O texto entra de forma curta e discreta (máscara, deslize
pequeno com opacidade, 0,4–0,7 s) e não compete com a câmera. As 24 animações de texto do
`/hyperframes-animation` servem; prefira as sóbrias em vídeos realistas.
