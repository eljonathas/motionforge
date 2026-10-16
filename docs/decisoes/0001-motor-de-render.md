# 0001 — Motor de render: adotar o HyperFrames atrás de um adaptador

Status: proposta, aguardando o mantenedor.

## Contexto

O MotionForge precisa transformar composições em MP4 de forma determinística, no Mac, no Windows e no Linux, sem
chamar modelo nenhum. O runtime de canvas da primeira versão (`motionforge-legacy`) faz isso, mas empurra o agente para desenhar com
primitivas, que é a estética que o projeto quer evitar. Os modelos escrevem HTML, CSS, SVG e GSAP com muito mais
repertório do que uma API proprietária de canvas.

Opções levantadas em [REFERENCIAS.md](../REFERENCIAS.md):

- **HyperFrames**: HTML + GSAP (e CSS, Lottie, Three.js), Apache-2.0, render determinístico, prévia, ~20 skills.
- **Remotion**: React, maior ecossistema, licença paga para empresas.
- **Motion Canvas / Revideo**: MIT, canvas imperativo.
- **Runtime próprio** (o da primeira versão): controle total, repertório nenhum fora do nosso.

## Decisão proposta

1. O primeiro motor é o **HyperFrames**, usado como dependência e chamado por um adaptador (`renderizar`,
   `quadros`, `previa`).
2. As composições do MotionForge são **HTML comum** com as convenções do HyperFrames; receitas não usam nada que
   prenda a um motor sem necessidade.
3. Um adaptador para Remotion pode vir depois, se houver demanda, sem mudar skills nem receitas.
4. O runtime de canvas da primeira versão não é trazido.

## Consequências

- Não escrevemos nem mantemos render; o esforço vai para skills, receitas, assets, checagens e memória.
- As skills do MotionForge convivem com as do HyperFrames: as dele ensinam o motor; as nossas ensinam direção de
  arte, material real e boas escolhas. Precisamos evitar instruções conflitantes (ver M1).
- Dependemos do ritmo do HyperFrames; o adaptador limita o estrago se ele mudar ou parar.
- O GSAP tem licença própria gratuita, com restrição a construtores visuais no-code que concorram com o Webflow.
  O MotionForge não é um construtor visual; a análise fica registrada aqui e deve ser revista se surgir um editor
  visual de animação.

- Achados ao testar o HyperFrames 0.8.164 (16/10/2026):
  - o projeto criado pelo `init` carrega o GSAP de uma CDN; sem rede o render falha. O `motionforge new` copia as
    bibliotecas para `vendor/`, o que também deixa o render reprodutível;
  - a telemetria anônima vem ligada; o MotionForge define `HYPERFRAMES_NO_TELEMETRY=1` nos comandos que chama e
    documenta a opção para quem usa o HyperFrames direto;
  - o `init` baixa as skills do HyperFrames do GitHub; o render pode usar um Chromium existente via
    `HYPERFRAMES_BROWSER_PATH`;
  - o `media-use` do HyperFrames depende do catálogo e do CLI da HeyGen para música, imagens e voz; o MotionForge
    oferece o caminho aberto e licenciado em paralelo.

## Alternativas rejeitadas

- **Runtime próprio**: mantém o problema da estética de primitivas e o custo de manter render.
- **Remotion como primeiro motor**: a licença paga para empresas limitaria quem pode usar o MotionForge.
- **Motion Canvas**: canvas único, menos material real (vídeo, DOM, Lottie) e menos repertório dos modelos.
