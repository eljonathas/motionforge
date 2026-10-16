# MotionForge — plano do projeto

Status: proposta para decisão do mantenedor. Nada aqui está implementado ainda.

## 1. O problema

O Claude já escreve animações boas quando alguém o conduz. Sozinho, ele cai sempre no mesmo lugar: fundo
chapado, círculos e elipses em movimento, texto entrando com fade, nenhuma imagem real, nenhuma textura,
nenhuma profundidade. Chamamos isso de **estética de primitivas**. O resultado parece demo de biblioteca, não
peça de motion design.

A primeira versão do MotionForge (o harness em Python, hoje no repositório `motionforge-legacy`) tentou resolver isso com um harness próprio que chama a API: papéis, críticos, orçamento, DAG.
Funcionou em Linux, mas:

- custa caro (um vídeo não saiu com US$ 20, porque o Opus reescreveu cenas e o áudio falhou fora do Linux);
- reproduz o que o Claude Code e o Codex já fazem (laço de ferramentas, sessões, permissões, retomada);
- o runtime de canvas próprio empurra o modelo para desenhar com primitivas, que é exatamente a estética que
  queremos evitar.

## 2. A aposta

O **MotionForge** é um produto de código aberto que dá ao agente que a pessoa já usa (Claude Code, Codex,
Claude Desktop, Claude Web) três coisas que faltam a ele:

1. **Repertório**: referências reais de ofício (princípios, tempos, curvas, composição, tipografia, cor,
   câmera, textura) e uma biblioteca de cenas exemplares, analisadas e reproduzíveis.
2. **Material**: acesso a assets reais e licenciados (fotos, vídeo, ilustrações, Lottie, 3D, texturas, fontes,
   efeitos sonoros e trilhas), com a licença registrada junto de cada arquivo.
3. **Olhos e memória**: ferramentas para ver o que foi feito (quadros, folhas de contato, prévia) e uma memória
   longa do que funcionou e do que a pessoa rejeitou, que o agente consulta antes de decidir.

O modelo e o custo de raciocínio são os da assinatura de quem usa. O MotionForge não chama nenhum modelo por conta
própria.

Não é aprendizado por reforço no sentido de treinar pesos. É memória no contexto. Os pares "escolhido × rejeitado"
que a memória acumula podem, com consentimento explícito, virar um dataset aberto para treino de verdade mais tarde.

## 3. Princípios

- **Realismo vem de material e de ofício, não de primitivas.** A primeira pergunta de cada cena é "que imagem,
  vídeo, ilustração ou tipografia real carrega esta ideia?", não "que forma desenhar?".
- **HTML, CSS, SVG e WebGL são a linguagem.** É o que os modelos escrevem melhor e o que tem mais repertório
  público. Nada de runtime proprietário.
- **Motor substituível.** O conhecimento (skills, receitas, memória, checagens) não depende do motor de render.
- **Determinismo.** O mesmo projeto gera o mesmo MP4.
- **Licença registrada sempre.** Nenhum asset entra num projeto sem origem e licença gravadas ao lado dele.
- **Barato por construção.** Receitas e exemplos reduzem o código escrito do zero; a crítica é feita olhando os
  quadros, não chamando um segundo modelo.
- **Multiplataforma de verdade.** `npx` no Mac, no Windows e no Linux, sem Python e sem sandbox de Linux.

## 4. O que já existe no mercado (e por que não basta)

| Projeto | O que é | Licença | O que falta para nós |
|---|---|---|---|
| HyperFrames (HeyGen) | HTML + GSAP → MP4 determinístico, ~20 skills para agentes, CLI `npx hyperframes` | Apache-2.0 | repertório de direção de arte, curadoria de assets por licença, memória de escolhas |
| Remotion + `remotion-dev/skills` | React → vídeo, 12 skills oficiais | source-available, licença paga para empresas | mesmo que acima; licença restringe uso comercial |
| Motion Canvas / Revideo | canvas imperativo em TS | MIT | menos repertório público; tende às primitivas |

Detalhes e fontes em [REFERENCIAS.md](REFERENCIAS.md).

**Conclusão:** o render já está resolvido por terceiros com licença aberta. O espaço vazio é o **repertório**,
o **material** e a **memória**. É aí que o MotionForge entra.

## 5. Arquitetura

```
┌──────────────── agente da pessoa (Claude Code · Codex · Claude Desktop · Claude Web) ────────────────┐
│  skills do MotionForge: direção, ofício, receitas, assets, áudio, personagens, crítica, memória        │
└──────────────┬───────────────────────────────────────────────┬──────────────────────────────────────┘
               │ MCP (stdio local ou remoto)                    │ arquivos do projeto
┌──────────────▼──────────────┐   ┌────────────────────────────▼───────────────┐
│ motionforge mcp             │   │ projeto/                                    │
│  assets: buscar, baixar,    │   │  brief.md, roteiro.md, storyboard.md        │
│    registrar licença        │   │  cenas/*.html  (composições)                │
│  ver: quadros, folha de     │   │  assets/ + assets/LICENCAS.json             │
│    contato, prévia          │   │  audio/ (voz, trilha, efeitos)              │
│  checar: contraste, área    │   │  .motionforge/memoria/ (lições locais)      │
│    segura, legibilidade,    │   └─────────────────────────────────────────────┘
│    "estética de primitivas" │
│  áudio: voz, alinhamento,   │   ┌─────────────────────────────────────────────┐
│    mixagem                  │──▶│ motor de render (adaptador)                 │
│  render: MP4                │   │  1º: HyperFrames (HTML + GSAP, Apache-2.0)  │
│  memória: lembrar, recordar │   │  depois: Remotion (opcional)                │
└─────────────────────────────┘   └─────────────────────────────────────────────┘
```

### 5.1 Motor de render

Recomendação (ver [decisão 0001](decisoes/0001-motor-de-render.md)): **adotar o HyperFrames como primeiro motor**,
atrás de um adaptador. Ele já entrega HTML → MP4 determinístico, prévia ao vivo, GSAP, Lottie e Three.js, com
licença Apache-2.0. O MotionForge não reescreve render; investe no que o modelo faz antes do render.

### 5.2 Camada de conhecimento (as skills)

As skills são o produto. Cada uma é curta no `SKILL.md` e aponta para referências em arquivos à parte, que o
agente lê só quando precisa.

**Revisão de 16/10/2026, depois de ler as skills do HyperFrames.** O HyperFrames já publica cerca de 330 mil
palavras de skills: regras técnicas do motor, ~100 referências de animação (regras atômicas, 22 blueprints de
cena, catálogo de transições, adaptadores de GSAP, Lottie, Three.js), direção criativa (house style, "lazy
defaults" de IA, composição para vídeo, tipografia, paletas, narração, ritmo por batida) e fluxos completos
(explicador, lançamento de produto, motion graphics, legendas, música). Reescrever isso seria desperdício e criaria
instruções conflitantes. O que **não** existe lá:

1. **Material real aberto e licenciado.** O `media-use` deles busca no catálogo da HeyGen e pede login no CLI da
   HeyGen; não há busca em fontes abertas (Pexels, Openverse, Poly Haven…) nem registro de licença por arquivo.
2. **Realismo fotográfico e cinematográfico.** O repertório deles é de UI, SaaS e tipografia cinética. O próprio
   "background layer" padrão sugere brilhos radiais, texto fantasma e formas geométricas: exatamente a estética
   que queremos evitar quando o pedido pede realismo.
3. **Ilustração e personagens.** Não há sistema de ilustração consistente, personagens com rig, nem sincronia
   labial (visemas).
4. **Narrativa visual fora de tecnologia.** Documentário, educação, histórias, jornalismo: lógica de b-roll,
   planos, metáfora visual a partir de material real.
5. **Memória de escolhas.** A memória deles é de reuso de assets, não de decisões aprovadas e rejeitadas.
6. **Medição.** Não há benchmark que diga se as skills melhoram os vídeos.

Por isso o MotionForge é um **pacote complementar**: as skills dele **delegam** a técnica às skills do HyperFrames
(`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`) e cuidam só das seis lacunas acima.
Quando houver conflito (por exemplo, o fundo decorativo padrão deles num vídeo que pede realismo), a skill do
MotionForge diz explicitamente qual regra vale e por quê.

| Skill | Para quê |
|---|---|
| `motionforge` | roteador: decide se o pedido pede realismo, ilustração ou design gráfico; carrega as skills do MotionForge certas e aponta as do HyperFrames para a técnica |
| `realismo` | quando e como usar foto, vídeo e ilustração reais; hierarquia "material antes de forma"; os anti-padrões, incluindo os padrões do HyperFrames que não servem para realismo |
| `material` | buscar, escolher e baixar assets abertos com licença registrada (`motionforge assets`); critérios de escolha (enquadramento, espaço para texto, coerência de luz e cor entre planos); o que nunca usar |
| `cinema-2d5` | profundidade a partir de foto: recorte em camadas, parallax, movimentos de câmera (Ken Burns bem feito, push-in, travelling), luz, sombra, grão, gradação coerente entre planos |
| `ilustracao` | sistema de ilustração consistente (traço, paleta, proporções), fontes abertas de ilustração, composição de cenas ilustradas |
| `personagens` | personagens a partir de SVG ou Lottie com rig, poses, ciclos (andar, falar, gesticular), visemas e sincronia com a narração; os 12 princípios aplicados a personagens |
| `narrativa` | do pedido ao roteiro e à lista de planos para conteúdo fora de tecnologia: b-roll, ritmo de leitura, metáfora visual, como mostrar sem ilustrar literalmente cada palavra |
| `receitas` | índice da biblioteca de cenas exemplares do MotionForge (realistas, ilustradas e com personagens) |
| `critica` | rubrica para julgar os próprios quadros com foco em realismo e material, incluindo o detector de estética de primitivas (`motionforge check`) |
| `memoria` | quando lembrar, o que guardar, como recuperar antes de decidir |

Áudio (narração, trilha, efeitos, mixagem) fica com o `hyperframes-audio` e o `media-use` deles; o MotionForge só
acrescenta vozes sem conta da HeyGen (voz do sistema, ElevenLabs ou OpenAI pela chave de quem usa) se o M3 mostrar
que é preciso.

**Anti-padrões explícitos** (vão no `realismo` e na `critica`): cena feita só de formas geométricas; fundo
chapado sem textura nem profundidade; brilhos radiais, texto fantasma e formas decorativas como substitutos de
material real; ícone genérico no lugar de imagem que conte a história; todo elemento entrando com o mesmo fade e
a mesma curva; planos com luz e cor incoerentes entre si.

### 5.3 Biblioteca de cenas exemplares (receitas)

Cada receita é uma pasta:

```
receitas/<id>/
  cena.html          composição funcional, com placeholders de conteúdo
  miniatura.webp     quadro-chave
  folha.webp         folha de contato (8 quadros)
  receita.md         intenção, quando usar, parâmetros, por que funciona, variações, erros comuns
  assets.json        assets usados, com origem e licença
```

Começo com 15 a 20 receitas cobrindo o que mais se pede: abertura com título cinético, foto com Ken Burns e
tipografia, gráfico de dados animado, mapa com rota, lista em cartões, citação, antes/depois, produto em
destaque, linha do tempo, explicação com ilustração, transição de capítulo, encerramento com chamada.

As receitas são escritas e revisadas por pessoas (nós e, depois do lançamento, a comunidade por PR). A referência
de cada uma é uma técnica real de motion design, descrita com nossas palavras e com link para a fonte; nenhum
vídeo ou texto protegido é copiado para o repositório.

### 5.4 Ferramentas (CLI `motionforge` e servidor MCP)

O HyperFrames já tem prévia (`preview`), quadros (`snapshot`), checagens de layout e contraste (`check`,
`validate`), batidas (`beats`) e render. O MotionForge não duplica nada disso; acrescenta:

| Comando / ferramenta MCP | O que faz |
|---|---|
| `motionforge new` / `project_new` | cria o projeto pelo `hyperframes init`, com telemetria desligada, bibliotecas copiadas para `vendor/` (render offline), `assets/LICENCAS.json`, `brief.md` e a pasta de memória |
| `motionforge vendor` / `vendor` | troca referências a CDN por cópias locais |
| `motionforge check` / `check` | licenças de cada asset, nenhuma URL remota, e o **detector de estética de primitivas** |
| `motionforge assets search` e `get` / `assets_search`, `assets_get` | busca em fontes abertas (Openverse, Poly Haven, Pexels; depois Unsplash, Pixabay, Freesound) e baixa gravando origem, autor, licença e atribuição |
| `motionforge memory` / `memory_add`, `memory_search` | memória de boas escolhas (seção 5.5) |
| `snapshot`, `render` (só no MCP) | chamam o `hyperframes snapshot` e o `hyperframes render`, para quem usa o MCP sem terminal |

### 5.5 Memória de boas escolhas

- **Lições locais** em `.motionforge/memoria/` no projeto e em `~/.motionforge/memoria/` para a pessoa: decisão,
  contexto, resultado (aprovado, rejeitado, editado), motivo, data, quadro de referência.
- **Captura**: a skill `memoria` instrui o agente a registrar quando a pessoa aprova, rejeita ou corrige; no
  Claude Code, hooks (`Stop`, `PostToolUse`) lembram o agente de registrar antes de encerrar.
- **Uso**: `recordar` no início de cada vídeo e antes de cada cena, filtrando por tipo de cena e estilo.
- **Higiene**: cada lição tem origem e pode ser descartada; lições contraditórias são mostradas juntas para a
  pessoa decidir.
- **Pares de preferência (opt-in)**: exportáveis em JSONL para contribuir com um dataset aberto.

### 5.6 Superfícies

| Onde | Como |
|---|---|
| Claude Code | plugin completo: skills, comandos (`/video`), hooks de memória e o MCP local |
| Codex | skills e o MCP local |
| Claude Desktop | o MCP local e as skills |
| Claude Web | skills enviadas como zip; prévia de cena como artifact; export no navegador; um MCP remoto opcional mais tarde |

## 6. O que vem da primeira versão (`motionforge-legacy`)

**Levamos (como ideia ou código adaptado):** as checagens visuais (contraste, área segura, legibilidade), o
alinhamento e os visemas, o grafo de mixagem com ducking, a rubrica de crítica, o desenho dos pares de preferência
(DS5) e o editor de rig (C8) como referência para personagens.

**Deixamos:** o harness de agentes, o DAG, os papéis com prompts próprios, o runtime de canvas, o SaaS
multi-cliente, créditos, notificações, publicação, o dataset hospedado, Python e o sandbox de áudio em Linux.

## 7. Fases

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **M0** | este plano, pesquisa de referências, decisão do motor | mantenedor aprova o caminho |
| **M1** | CLI e MCP (`motionforge new`, `vendor`, `check`, `assets`, `memory`, `mcp`) sobre o HyperFrames; plugin do Claude Code; skills `motionforge`, `realismo`, `material`, `critica` | `motionforge check` reprova uma cena de estética de primitivas e aprova uma com material real licenciado; render offline no Mac, no Windows e no Linux (CI) |
| **M2** | skills `cinema-2d5` e `narrativa`; 10 receitas realistas com material real e licença registrada | no Mac do mantenedor, pelo Claude Code com Sonnet, um vídeo de 30 s a partir de um pedido fora de tecnologia, com fotos ou vídeos reais e nenhuma cena reprovada pelo detector |
| **M3** | skills `ilustracao` e `personagens` (rig, ciclos, visemas); 5 receitas ilustradas e com personagem | um personagem ilustrado fala uma frase da narração com boca sincronizada |
| **M4** | memória: `memory`, hooks do Claude Code, skill `memoria`; benchmark de 20 pedidos | num conjunto fixo de pedidos, a segunda rodada (com memória) tem nota maior e gasta menos turnos que a primeira |
| **M5** | Claude Web (skills em zip, prévia em artifact) e Codex | uma cena do benchmark feita no Claude Web, com prévia |
| **M6** | lançamento aberto: documentação, galeria, guia de contribuição de receitas | repositório público, licença, CI verde |

## 8. Como medimos se funciona

- **Benchmark fixo** de 20 pedidos variados (sem gênero ou público como padrão), rodado antes e depois de cada
  fase, com o mesmo modelo.
- **Nota de qualidade** por rubrica (hierarquia, ritmo, uso de material real, tipografia, legibilidade, coerência
  com o pedido), julgada em pares por pessoas e, como apoio, pelo próprio agente.
- **Taxa de estética de primitivas**: fração de cenas reprovadas pelo detector.
- **Custo**: turnos e tokens por vídeo de 30 s, medidos na sessão.
- **Portabilidade**: o benchmark roda no Mac, no Windows e no Linux.

## 9. Decisões pendentes do mantenedor

1. Motor: HyperFrames como primeiro motor (recomendado) ou outro.
2. Licença do MotionForge: Apache-2.0 (recomendado, compatível com o HyperFrames) ou MIT.
3. Voz padrão: voz do sistema (grátis) com ElevenLabs/OpenAI opcionais pela chave da pessoa (recomendado).
4. Fontes de assets aceitas na primeira versão e se exigem chave (Pexels, Unsplash e Pixabay pedem chave grátis
   de API).
5. Destino da primeira versão: decidido — renomeada para `motionforge-legacy` e arquivada; este repositório passa a se chamar `motionforge`.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Dependência de um projeto de terceiro (HyperFrames) | adaptador de motor; receitas em HTML puro funcionam em qualquer motor baseado em navegador |
| Licença de asset mal registrada | download só pelas ferramentas, que gravam a licença; checagem que recusa render com asset sem licença |
| Receitas da comunidade são código executado localmente | revisão de PR, render isolado em navegador headless, sem rede durante o render |
| Lições ruins contaminando a memória | origem, data e descarte por lição; contradições mostradas à pessoa |
| Limites da assinatura | receitas reduzem código do zero; crítica pelos quadros, sem segundo modelo |
| Termos de uso das assinaturas | o MotionForge roda na conta de cada pessoa; nunca compartilha uma assinatura entre usuários |
| GSAP tem licença própria (gratuita, com restrição a construtores visuais que concorram com o Webflow) | o MotionForge não é um construtor visual; registrar a análise na decisão 0001 |
