# Referências

Levantamento feito em 16/10/2026 para o plano. As licenças mudam: antes de integrar qualquer fonte, confirmar os
termos na página oficial e gravar a versão consultada. Os itens marcados **(confirmar)** vieram de fontes
secundárias ou conflitantes.

## 1. Motores de vídeo por código

| Projeto | Linguagem e modelo | Licença | Para agentes | Observações |
|---|---|---|---|---|
| [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen) | HTML + CSS; animação por GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI; clipes com `data-start`, `data-duration`, `data-track-index` | Apache-2.0 | ~20 skills (`npx skills add heygen-com/hyperframes`): roteador, fluxos (explicador, lançamento de produto, motion graphics, slideshow…), domínio (core, animação, keyframes, criativo, mídia, áudio, CLI, registro) | render determinístico em Chrome headless + FFmpeg; `npx hyperframes init/preview/render/lint/check/snapshot`; Node 22+ e FFmpeg |
| [Remotion](https://www.remotion.dev/) + [remotion-dev/skills](https://github.com/remotion-dev/skills) | React; cada quadro é função do tempo | source-available; licença paga para uso em empresas ([comparativo oficial](https://www.remotion.dev/docs/compare/motion-canvas)) | 12 skills oficiais (best practices, create, markup, studio, render, captions, maps…) | maior ecossistema; a licença limita o uso comercial de quem adotar |
| [Motion Canvas](https://motioncanvas.io/) | TS imperativo, canvas único | MIT | não oficiais | forte em vídeos explicativos; tende a primitivas desenhadas |
| Revideo | fork do Motion Canvas com render no servidor | MIT **(confirmar)** | não oficiais | foco em pipelines automatizados |

**GSAP** é usado pelo HyperFrames. Desde 2025 é gratuito, inclusive os plugins antes pagos (SplitText,
MorphSVG), sob a "Standard No Charge License" do Webflow. A licença proíbe uso em ferramentas no-code de construção
visual de animações que concorram com o Webflow; código gerado por IA não é uso proibido segundo o FAQ do Webflow.
Fontes: [anúncio do Webflow](https://webflow.com/blog/gsap-becomes-free), [texto da licença](https://gsap.com/community/standard-license/).

## 2. Fontes de assets reais

O objetivo é que cada cena carregue material de verdade. Toda busca e todo download passam pelas ferramentas do
Reelcraft, que gravam origem, autor, licença e atribuição em `assets/LICENCAS.json`.

| Tipo | Fonte | Licença | Observações |
|---|---|---|---|
| Foto e vídeo | [Pexels](https://www.pexels.com/license/) | uso comercial gratuito, atribuição não obrigatória | API com chave gratuita e limite de taxa; não revender sem modificação; cuidado com pessoas identificáveis |
| Foto | [Unsplash](https://unsplash.com/license) | uso gratuito, atribuição não obrigatória no uso comum | **(confirmar)** a API exige atribuir o Unsplash e o fotógrafo e tem regras de hotlink |
| Foto, vídeo, música, efeitos | [Pixabay](https://pixabay.com/service/license-summary/) | licença própria (não é mais CC0) **(confirmar)** | API permite baixar e servir localmente **(confirmar)** |
| Busca em Creative Commons | [Openverse](https://openverse.org/) | varia por obra (CC0, CC-BY, CC-BY-SA…) | gravar a licença de cada obra; evitar NC e ND para uso comercial |
| Texturas, HDRIs, modelos 3D | [Poly Haven](https://polyhaven.com/about-contact) | CC0 | sem conta; ótimo para fundos, luz e profundidade |
| Ícones | [Lucide](https://lucide.dev/), [Phosphor](https://phosphoricons.com/) | ISC, MIT | ícone é apoio, nunca o assunto da cena |
| Ilustrações | [Open Peeps](https://www.openpeeps.com/), [unDraw](https://undraw.co/license) | CC0, licença própria | **(confirmar)** termos do unDraw |
| Animações Lottie | [LottieFiles](https://lottiefiles.com/) | "Lottie Simple License" nas gratuitas, mas a licença varia por criador | conferir a licença em cada animação ([ajuda](https://help.lottiefiles.com/animation-licensing-basics-), [documentação](https://docs.lottiefiles.com/en/integrations/after-effects/02_explore/premium-animations)) |
| Fontes | [Google Fonts](https://fonts.google.com/) | OFL na maioria | baixar e embutir; nunca depender de CDN no render |
| Efeitos sonoros | [Freesound](https://freesound.org/) | varia por som (CC0, CC-BY, CC-BY-NC) | filtrar por licença na busca |
| Imagens geradas | o gerador que a pessoa já usa (ChatGPT, Gemini…) | termos do provedor | registrar o modelo e o prompt como origem |

**Nunca usar**: imagens de busca genérica sem licença, logotipos e marcas de terceiros sem autorização, rostos de
pessoas reais sem liberação de imagem, obras com licença NC em vídeos comerciais.

## 3. Referências de ofício

Usadas para escrever as skills de ofício com nossas palavras. Nenhum texto protegido é copiado; cada skill cita a
fonte da técnica.

| Tema | Referência |
|---|---|
| Princípios de animação | Thomas e Johnston, *The Illusion of Life* (os 12 princípios); Richard Williams, *The Animator's Survival Kit* |
| Movimento em interfaces (tempos, curvas, coreografia) | [Material Design 3: motion](https://m3.material.io/styles/motion/overview); [IBM Carbon: motion](https://carbondesignsystem.com/elements/motion/overview/); [Apple HIG: motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| Tipografia | Robert Bringhurst, *The Elements of Typographic Style*; Ellen Lupton, *Thinking with Type* |
| Composição e grade | Josef Müller-Brockmann, *Grid Systems in Graphic Design* |
| Cor | Josef Albers, *Interaction of Color* |
| Legibilidade e contraste | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (contraste 4,5:1 para texto) |
| Motion design profissional | artigos e tutoriais públicos de estúdios e escolas (School of Motion, Motionographer), citados por link quando uma receita se basear numa técnica descrita lá |

## 4. Memória para agentes (projetos de referência)

| Projeto | O que faz | Fonte |
|---|---|---|
| claude-mem | captura a atividade das sessões, resume e injeta contexto relevante nas próximas | [Better Stack](https://betterstack.com/community/guides/ai/claude-mem/) |
| cwms | skill que guarda o contexto antigo em disco com resumo e palavras-chave e o recupera depois | [PyPI](https://pypi.org/project/cwms/) |

A referência indicada pelo mantenedor ("context-window") ainda precisa do link para ser analisada.
