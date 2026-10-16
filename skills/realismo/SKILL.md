---
name: realismo
description: >
  Visual direction for realistic videos made with code: decides, scene by scene, which real material carries the
  idea (footage, photo, illustration, typography) before any shape is drawn; plans shots with framing, camera move
  and light; places text over images; keeps grade, light and grain coherent across shots; and lists the
  anti-patterns that make agent videos look like abstract templates. Use for any HyperFrames video about real
  subjects, and whenever the result looks geometric, flat, generic or "made of circles". Overrides the HyperFrames
  default background layer (radial glows, ghost text, geometric decoratives) in realistic videos.
---

# Realismo

Um vídeo realista é uma sequência de **planos**, não de slides. Cada plano mostra uma coisa de verdade, de um
ponto de vista, com uma luz, por um tempo, e a câmera tem um motivo para se mover.

## 1. A escada do material (por cena, de cima para baixo)

Para cada cena, desça a escada e pare no primeiro degrau que conta a ideia:

1. **Vídeo real** do assunto (o processo acontecendo, o lugar, o gesto).
2. **Foto real** do assunto, com movimento de câmera.
3. **Foto real recortada em camadas** para profundidade (2.5D).
4. **Ilustração** de um sistema único e coerente (mesmo traço e paleta no vídeo inteiro).
5. **Imagem gerada** pela pessoa no gerador dela, registrada como origem.
6. **Tipografia como imagem**, quando a frase é a mensagem (citação, número, título).
7. **Formas**, só como **apoio** ao material: seta apontando um detalhe da foto, círculo de destaque desenhado
   sobre ela, rota sobre um mapa, marca de dado. **Nunca como assunto da cena.**

Busque e baixe o material com a skill `material`. Escreva no storyboard, para cada cena: degrau escolhido,
asset, enquadramento, movimento e onde vai o texto.

## 2. Pense em planos

| Decisão | Regra prática |
|---|---|
| Escala do plano | alterne geral, médio e detalhe; nunca dois planos seguidos na mesma escala **e** com o mesmo movimento |
| Duração | 2,5 a 5 s por foto em vídeo narrado; corte na fronteira de frase da narração, não no meio de uma palavra |
| Movimento | todo plano parado em foto ganha um movimento lento e motivado; vídeo real geralmente não precisa de movimento extra |
| Direção | o movimento vai para onde o olho deve ir (o rosto, o produto, o detalhe que a narração cita) |
| Luz | planos vizinhos com luz de temperatura parecida; se mudar (dia para noite), que seja a história pedindo |

Detalhes e valores de cada movimento em [referencias/planos.md](referencias/planos.md). A técnica de keyframes
é do `/hyperframes-keyframes`.

## 3. Texto sobre imagem

- Texto vai no **espaço negativo** da foto (céu, parede, mesa vazia), nunca sobre rostos, olhos ou o detalhe que
  a cena quer mostrar.
- Se não houver espaço negativo, crie contraste localmente: gradiente escuro (ou claro) **a partir da borda mais
  próxima do texto**, nunca um véu chapado sobre a foto inteira.
- Pouco texto: o que a imagem já mostra não precisa ser escrito.

Valores e padrões em [referencias/texto-sobre-imagem.md](referencias/texto-sobre-imagem.md).

## 4. Coerência entre planos

O espectador percebe em segundos quando as fotos vêm de lugares diferentes. Unifique:

- **uma gradação** para o filme inteiro (aplicada pelo `/media-use`, `references/media-treatments.md`);
- **grão** uniforme por cima de tudo, inclusive dos gráficos, para que eles pareçam estar na mesma imagem;
- **direção de sombra** coerente ao compor recortes;
- **níveis de preto** parecidos entre planos.

Detalhes em [referencias/coerencia.md](referencias/coerencia.md).

## 5. O que não fazer (e o que vale no lugar)

| Anti-padrão | No lugar |
|---|---|
| cena feita só de círculos, elipses e retângulos arredondados | material real do degrau 1 a 4 |
| fundo chapado ou gradiente genérico atrás do texto | a própria foto ou vídeo como fundo, ou uma textura real (papel, concreto, tecido) |
| brilho radial, texto fantasma e formas decorativas "para dar profundidade" | profundidade real: camadas da foto, desfoque de foco, parallax |
| ícone genérico no lugar do assunto (ícone de casa para falar de uma casa) | a casa |
| todo elemento entra com o mesmo fade e a mesma curva | movimento de câmera no plano; texto com entrada própria e curta |
| zoom e rotação ao mesmo tempo, ou zoom rápido | um movimento lento por plano |
| fotos com cores, luzes e granulação incompatíveis lado a lado | uma gradação e um grão para o filme |
| imagem esticada ou ampliada além da resolução | trocar o asset, ou reduzir o movimento |

Este `realismo` vale sobre a "camada de fundo" do `hyperframes-creative` (`house-style.md` e
`video-composition.md`) em vídeos realistas: ali a camada de fundo é a imagem; brilhos, texto fantasma e formas
decorativas só entram se o conceito pedir. As regras de escala de texto, contraste e leitura deles continuam
valendo.

## 6. Antes de dar a cena por pronta

- [ ] O degrau do material está escrito no storyboard e o asset tem licença em `assets/LICENCAS.json`.
- [ ] O plano tem um movimento motivado (ou é vídeo real que já se move).
- [ ] O texto está no espaço negativo e passa no contraste.
- [ ] A cena combina em cor, luz e grão com a anterior e a seguinte.
- [ ] `npx reelcraft check` não aponta estética de primitivas nesta cena.

Depois, siga a `critica`.
