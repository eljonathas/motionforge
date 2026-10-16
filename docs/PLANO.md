# Reelcraft — plano do projeto

Status: proposta para decisão do mantenedor. Nada aqui está implementado ainda.

## 1. O problema

O Claude já escreve animações boas quando alguém o conduz. Sozinho, ele cai sempre no mesmo lugar: fundo
chapado, círculos e elipses em movimento, texto entrando com fade, nenhuma imagem real, nenhuma textura,
nenhuma profundidade. Chamamos isso de **estética de primitivas**. O resultado parece demo de biblioteca, não
peça de motion design.

O MotionForge tentou resolver isso com um harness próprio que chama a API: papéis, críticos, orçamento, DAG.
Funcionou em Linux, mas:

- custa caro (um vídeo não saiu com US$ 20, porque o Opus reescreveu cenas e o áudio falhou fora do Linux);
- reproduz o que o Claude Code e o Codex já fazem (laço de ferramentas, sessões, permissões, retomada);
- o runtime de canvas próprio empurra o modelo para desenhar com primitivas, que é exatamente a estética que
  queremos evitar.

## 2. A aposta

O **Reelcraft** é um produto de código aberto que dá ao agente que a pessoa já usa (Claude Code, Codex,
Claude Desktop, Claude Web) três coisas que faltam a ele:

1. **Repertório**: referências reais de ofício (princípios, tempos, curvas, composição, tipografia, cor,
   câmera, textura) e uma biblioteca de cenas exemplares, analisadas e reproduzíveis.
2. **Material**: acesso a assets reais e licenciados (fotos, vídeo, ilustrações, Lottie, 3D, texturas, fontes,
   efeitos sonoros e trilhas), com a licença registrada junto de cada arquivo.
3. **Olhos e memória**: ferramentas para ver o que foi feito (quadros, folhas de contato, prévia) e uma memória
   longa do que funcionou e do que a pessoa rejeitou, que o agente consulta antes de decidir.

O modelo e o custo de raciocínio são os da assinatura de quem usa. O Reelcraft não chama nenhum modelo por conta
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
o **material** e a **memória**. É aí que o Reelcraft entra.

## 5. Arquitetura

```
┌──────────────── agente da pessoa (Claude Code · Codex · Claude Desktop · Claude Web) ────────────────┐
│  skills do Reelcraft: direção, ofício, receitas, assets, áudio, personagens, crítica, memória        │
└──────────────┬───────────────────────────────────────────────┬──────────────────────────────────────┘
               │ MCP (stdio local ou remoto)                    │ arquivos do projeto
┌──────────────▼──────────────┐   ┌────────────────────────────▼───────────────┐
│ reelcraft-mcp               │   │ projeto/                                    │
│  assets: buscar, baixar,    │   │  brief.md, roteiro.md, storyboard.md        │
│    registrar licença        │   │  cenas/*.html  (composições)                │
│  ver: quadros, folha de     │   │  assets/ + assets/LICENCAS.json             │
│    contato, prévia          │   │  audio/ (voz, trilha, efeitos)              │
│  checar: contraste, área    │   │  .reelcraft/memoria/ (lições locais)        │
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
licença Apache-2.0. O Reelcraft não reescreve render; investe no que o modelo faz antes do render.

### 5.2 Camada de conhecimento (as skills)

As skills são o produto. Cada uma é curta no `SKILL.md` e aponta para referências em arquivos à parte, que o
agente lê só quando precisa.

| Skill | Para quê |
|---|---|
| `reelcraft` | roteador: lê o pedido e decide quais skills carregar |
| `direcao` | processo de produção: brief → roteiro → storyboard → cenas → revisão → export; quando parar e mostrar |
| `oficio-movimento` | princípios de animação aplicados a motion design: antecipação, sobreposição, arcos, espaçamento; tempos e curvas por tipo de elemento |
| `oficio-composicao` | grade, hierarquia, enquadramento, profundidade em camadas, parallax, câmera virtual |
| `oficio-tipografia` | tipografia cinética, pares de fontes, ritmo de leitura, legibilidade em tela pequena |
| `oficio-cor-luz` | paletas, contraste, gradação, luz, sombra, grão, textura, desfoque |
| `assets` | onde buscar foto, vídeo, ilustração, ícone, Lottie, 3D, textura, fonte, som; como registrar a licença; o que nunca usar |
| `receitas` | índice da biblioteca de cenas exemplares, com quando usar cada uma |
| `audio` | narração, alinhamento palavra a palavra, trilha, efeitos, ducking |
| `personagens` | personagens com ilustração real (SVG ou Lottie com rig), não bonecos de primitivas |
| `critica` | rubrica para julgar os próprios quadros, incluindo o detector de estética de primitivas |
| `memoria` | quando lembrar, o que guardar, como recuperar antes de decidir |

**Anti-padrões explícitos** (vão na `direcao` e na `critica`): cena feita só de formas geométricas; fundo
chapado sem textura nem profundidade; todo elemento entrando com o mesmo fade e a mesma curva; texto centralizado
em todas as cenas; ícone genérico no lugar de imagem que conte a história; ausência de hierarquia.

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

### 5.4 Ferramentas (servidor MCP)

| Ferramenta | O que faz |
|---|---|
| `projeto_iniciar` | cria a estrutura do projeto e o arquivo de licenças |
| `assets_buscar` | busca em fontes com licença aberta (foto, vídeo, ilustração, ícone, Lottie, 3D, textura, som) e devolve miniaturas e licença |
| `assets_baixar` | baixa para `assets/` e registra origem, autor, licença e atribuição exigida |
| `quadros` | renderiza instantes de uma cena em PNG para o agente ver |
| `folha_de_contato` | uma imagem com N quadros da cena ou do vídeo |
| `checar_cena` | contraste, área segura, texto legível, quadros vazios, **proporção de primitivas sem asset real** |
| `previa` | abre a prévia ao vivo no navegador |
| `voz` | narração com a voz do sistema (grátis) ou com a chave da pessoa (ElevenLabs, OpenAI) |
| `alinhar` | tempos de cada palavra da narração |
| `mixar` | narração, trilha e efeitos com ducking, via ffmpeg |
| `renderizar` | MP4 final pelo motor |
| `lembrar` / `recordar` | grava e consulta a memória |

### 5.5 Memória de boas escolhas

- **Lições locais** em `.reelcraft/memoria/` no projeto e em `~/.reelcraft/memoria/` para a pessoa: decisão,
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

## 6. O que vem do MotionForge

**Levamos (como ideia ou código adaptado):** as checagens visuais (contraste, área segura, legibilidade), o
alinhamento e os visemas, o grafo de mixagem com ducking, a rubrica de crítica, o desenho dos pares de preferência
(DS5) e o editor de rig (C8) como referência para personagens.

**Deixamos:** o harness de agentes, o DAG, os papéis com prompts próprios, o runtime de canvas, o SaaS
multi-cliente, créditos, notificações, publicação, o dataset hospedado, Python e o sandbox de áudio em Linux.

## 7. Fases

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **M0** | este plano, pesquisa de referências, decisão do motor | mantenedor aprova o caminho |
| **M1** | MCP mínimo (`projeto_iniciar`, `quadros`, `folha_de_contato`, `renderizar`) sobre o HyperFrames; skills `direcao`, `oficio-movimento`, `critica`; 5 receitas | no Mac do mantenedor, pelo Claude Code com Sonnet, um vídeo de 30 s sem áudio que não seja estética de primitivas |
| **M2** | `assets_buscar` e `assets_baixar` com licença registrada; skills `assets`, `oficio-composicao`, `oficio-tipografia`, `oficio-cor-luz`; mais 10 receitas | o mesmo pedido gera cenas com foto, vídeo ou ilustração real, todas com licença registrada |
| **M3** | áudio: `voz`, `alinhar`, `mixar`; skill `audio` | 30 s com narração, do pedido ao MP4, dentro de uma sessão Pro, no Mac e no Windows |
| **M4** | memória: `lembrar`, `recordar`, hooks; skill `memoria`; benchmark | num conjunto fixo de pedidos, a segunda rodada (com memória) tem nota maior e gasta menos turnos que a primeira |
| **M5** | Claude Web e Codex; personagens | uma cena do benchmark feita no Claude Web, com prévia e export |
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
2. Licença do Reelcraft: Apache-2.0 (recomendado, compatível com o HyperFrames) ou MIT.
3. Voz padrão: voz do sistema (grátis) com ElevenLabs/OpenAI opcionais pela chave da pessoa (recomendado).
4. Fontes de assets aceitas na primeira versão e se exigem chave (Pexels, Unsplash e Pixabay pedem chave grátis
   de API).
5. Destino do repositório `motionforge`: arquivar como referência (recomendado).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Dependência de um projeto de terceiro (HyperFrames) | adaptador de motor; receitas em HTML puro funcionam em qualquer motor baseado em navegador |
| Licença de asset mal registrada | download só pelas ferramentas, que gravam a licença; checagem que recusa render com asset sem licença |
| Receitas da comunidade são código executado localmente | revisão de PR, render isolado em navegador headless, sem rede durante o render |
| Lições ruins contaminando a memória | origem, data e descarte por lição; contradições mostradas à pessoa |
| Limites da assinatura | receitas reduzem código do zero; crítica pelos quadros, sem segundo modelo |
| Termos de uso das assinaturas | o Reelcraft roda na conta de cada pessoa; nunca compartilha uma assinatura entre usuários |
| GSAP tem licença própria (gratuita, com restrição a construtores visuais que concorram com o Webflow) | o Reelcraft não é um construtor visual; registrar a análise na decisão 0001 |
