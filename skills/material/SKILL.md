---
name: material
description: >
  Find, choose and download real, openly licensed material for a video — photos, footage, textures, HDRIs, 3D
  models, illustrations, icons and sound effects — from open sources (Openverse, Poly Haven, Pexels and others)
  with `reelcraft assets`, recording origin, author, license and attribution next to every file. Use whenever a
  scene needs a real image, video, texture or sound, before drawing any shape, and when the person provides their
  own files or generated images that must be registered.
---

# Material

Todo asset de um projeto vem com origem e licença registradas em `assets/LICENCAS.json`. Sem registro, o
`npx @eljonathas/reelcraft check` reprova o projeto.

## 1. Buscar

```bash
npx @eljonathas/reelcraft assets search --kind photo --q "mãos amassando pão, luz de janela"
npx @eljonathas/reelcraft assets search --kind video --q "ondas batendo em rochas, câmera lenta"
npx @eljonathas/reelcraft assets search --kind texture --q "papel kraft"
```

`--kind`: `photo`, `video`, `texture`, `hdri`, `model`, `illustration`, `icon`, `sfx`.

Escreva a busca como um **plano**: assunto + ação + luz + enquadramento ("detalhe de mãos digitando, luz
lateral quente"). Buscas em inglês costumam trazer mais resultados nas fontes abertas.

| Fonte | Tem | Chave |
|---|---|---|
| Openverse | fotos e áudio em Creative Commons, de muitos acervos | não |
| Poly Haven | texturas, HDRIs e modelos 3D, todos CC0 | não |
| Pexels | fotos e vídeos de alta qualidade | `PEXELS_API_KEY` grátis |

Sem a chave do Pexels, a busca usa as fontes sem chave. Para restringir a uma fonte: `--provider pexels`.
O Openverse só devolve licenças que permitem uso comercial e modificação; `--any-license` existe, mas não use
em vídeos que possam ser publicados.

## 2. Escolher

Olhe as miniaturas antes de baixar. Para cada candidato, confira:

- **Conta a ideia sem legenda?** Se precisar de texto para entender, procure outra.
- **Espaço para texto** onde o roteiro precisa de texto (ver `realismo`, texto sobre imagem).
- **Orientação**: horizontal para 16:9, vertical para 9:16; recortar uma foto horizontal para vertical perde
  quase tudo.
- **Resolução**: pelo menos a de saída vezes a escala final do movimento (1920 px × 1,12 > 2150 px).
- **Luz e cor** compatíveis com os outros planos escolhidos.
- **Pessoas identificáveis** só quando a fonte declara liberação de imagem ou a pessoa é figura pública num
  contexto informativo; na dúvida, prefira mãos, costas, silhuetas, multidão desfocada.
- **Sem marcas e logotipos** de terceiros em destaque.

## 3. Baixar e registrar

```bash
npx @eljonathas/reelcraft assets get pexels:12345        # no diretório do projeto (ou --dir <projeto>)
```

O `get` baixa para `assets/<tipo>/` e grava em `assets/LICENCAS.json`: arquivo, fonte, id, título, autor, link,
licença, link da licença, se exige atribuição e o texto de atribuição. **Nunca** referencie a URL remota no HTML:
o render precisa ser offline e reprodutível.

## 4. Licenças

| Pode | Com cuidado | Não use |
|---|---|---|
| CC0, Pexels, Poly Haven, licenças "uso comercial sem atribuição" | CC-BY e CC-BY-SA: coloque a atribuição nos créditos finais e na descrição | NC (não comercial) e ND (sem derivações) em qualquer vídeo que possa ser publicado; imagens de busca genérica sem licença |

Se algum asset exigir atribuição, crie uma cena de créditos ou uma linha na descrição com o `attribution_text` de
cada um.

## 5. Material da própria pessoa

- **Arquivos dela** (fotos, vídeos, logotipo da própria marca): copie para `assets/` e registre com
  `provider: "user"` e a licença que ela declarar.
- **Imagens geradas** no gerador dela (ChatGPT, Gemini, outro): registre com `provider: "generated"`, o modelo e
  o prompt como origem.

Peça material à pessoa quando a cena depende de algo que só ela tem (o produto dela, o rosto dela, o lugar dela).
