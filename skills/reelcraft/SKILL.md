---
name: reelcraft
description: >
  Use together with /hyperframes whenever a video, animation or motion graphic is about the real world (people,
  places, objects, nature, food, history, science, news, education, stories, products shown as physical things)
  or the person asks for realism, photos, footage, illustration or characters, or complains that the result looks
  generic, abstract, geometric, "like a template" or "made of circles". Decides which Reelcraft skills apply
  (realismo, material, critica) and which HyperFrames skills own the technique, and sets up the project with
  `reelcraft new` so assets carry licenses and renders work offline.
---

# Reelcraft — roteador

O Reelcraft complementa o HyperFrames. O HyperFrames ensina o motor, a animação e o design gráfico; o Reelcraft
cuida de **material real com licença, realismo, ilustração, personagens, narrativa, crítica e memória**.

## 1. Classifique o pedido antes de escrever qualquer HTML

Leia o pedido e escolha **um** registro visual dominante. Escreva a escolha e o motivo no `brief.md`.

| Registro | Quando | Carregue |
|---|---|---|
| **Realista** | o assunto existe no mundo e tem aparência (lugar, pessoa, objeto, comida, natureza, evento, processo físico) | `realismo` + `material` + `critica` |
| **Ilustrado** | o assunto é abstrato, imaginário, para crianças, ou precisa de personagem recorrente | `ilustracao` e `personagens` (quando existirem) + `material` + `critica` |
| **Gráfico** | interface, software, dados puros, tipografia como mensagem, marca | só as skills do HyperFrames (`hyperframes-creative`, `hyperframes-animation`) + `critica` |

Na dúvida entre realista e gráfico, escolha **realista**: o erro mais comum de agentes é tratar assunto concreto
como se fosse um slide de tecnologia.

## 2. Monte o projeto

```bash
npx reelcraft new <nome> --resolution landscape   # ou portrait / square
```

Isso cria o projeto do HyperFrames com as bibliotecas em `vendor/` (render offline), `assets/LICENCAS.json`,
`brief.md` e a pasta de memória, com a telemetria do HyperFrames desligada. Se o projeto já existe, rode
`npx reelcraft vendor` uma vez para trocar CDNs por cópias locais.

## 3. Consulte a memória

```bash
npx reelcraft memory search "<assunto ou estilo>" --scene-type <tipo de cena>
```

Lições aprovadas pesam mais que suas preferências gerais; lições rejeitadas são coisas a **não** repetir.

## 4. Quem manda em quê

| Assunto | Skill dona |
|---|---|
| contrato do motor, `data-*`, timeline, validação | `/hyperframes-core` |
| animação, curvas, transições, câmera (`keyframes`) | `/hyperframes-animation`, `/hyperframes-keyframes` |
| tipografia, paleta, ritmo, narração | `/hyperframes-creative` |
| tratamento de foto e vídeo (gradação, LUT) | `/media-use`, `references/media-treatments.md` |
| mixagem de áudio | `/hyperframes-audio` |
| **registro visual, uso de material real, texto sobre imagem, coerência entre planos** | `realismo` |
| **buscar e licenciar foto, vídeo, textura, ilustração, som** | `material` |
| **julgar os próprios quadros e decidir o que refazer** | `critica` |

Quando uma regra do HyperFrames conflita com o `realismo` num vídeo realista (por exemplo, a "camada de fundo"
com brilhos radiais, texto fantasma e formas decorativas), **vale o `realismo`**. Em vídeos gráficos, vale o
HyperFrames.

## 5. Antes de renderizar

```bash
npx reelcraft check          # licenças, URLs remotas, estética de primitivas
npx hyperframes check        # layout, contraste, runtime
```

Depois siga a `critica`. Ao final, registre o que a pessoa aprovou, rejeitou ou corrigiu:

```bash
npx reelcraft memory add "<a decisão>" --kind approved|rejected|edited --scene-type <tipo> --reason "<o porquê>"
```
