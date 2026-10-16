# Reelcraft

Repertório, material e memória para o Claude Code, o Codex e o Claude Web produzirem vídeos de motion graphics
com código: cenas com imagem, vídeo, ilustração e tipografia de verdade, não demos de círculos e elipses.

O raciocínio é do modelo que você já assina; o Reelcraft não chama modelo nenhum. Ele fornece:

- **skills** de direção e ofício (movimento, composição, tipografia, cor e luz, áudio, personagens, crítica);
- **receitas**: cenas exemplares, analisadas e reproduzíveis;
- **ferramentas** (MCP) para buscar assets com licença registrada, ver quadros, checar cenas, gerar áudio e
  renderizar MP4;
- **memória** das escolhas que funcionaram e das que você rejeitou.

Estado: planejamento. Veja o [plano](docs/PLANO.md), as [referências](docs/REFERENCIAS.md) e a
[decisão do motor](docs/decisoes/0001-motor-de-render.md).

## Ferramentas (CLI e MCP)

Pacote npm `reelcraft` (Node 22 ou mais novo; Mac, Windows e Linux). O render é do
[HyperFrames](https://github.com/heygen-com/hyperframes), que vem como dependência; o Reelcraft só acrescenta o
que ele não faz.

```bash
npx reelcraft new meu-video --resolution portrait   # projeto HyperFrames que renderiza offline
npx reelcraft vendor [dir]                           # troca CDN por cópias locais em vendor/
npx reelcraft check [dir] [--json]                   # licenças, URLs remotas, estética de primitivas
npx reelcraft assets search --kind photo --q "névoa na floresta"
npx reelcraft assets get pexels:2014422              # baixa e grava a licença em assets/LICENCAS.json
npx reelcraft memory add "Foto com Ken Burns atrás do título" --kind approved --tags foto,titulo
npx reelcraft memory search titulo                   # --global para a memória da pessoa
npx reelcraft mcp                                    # servidor MCP em stdio
```

- `check` sai com código 1 se houver erro (asset sem licença, licença NC/ND em uso, URL remota, cena só de
  formas). Layout e contraste são do `hyperframes check`; o Reelcraft não os repete.
- `assets` usa Openverse e Poly Haven sem chave e Pexels com `PEXELS_API_KEY`
  ([chave gratuita](https://www.pexels.com/api/)). Por padrão, só licenças que permitem uso comercial e
  modificação.
- Ferramentas MCP: `project_new`, `vendor`, `check`, `assets_search`, `assets_get`, `memory_add`,
  `memory_search`, `snapshot` e `render`. O `render` recusa projetos com problema de licença ou URL remota, a
  não ser com `force: true`.

### Claude Code

```text
/plugin marketplace add eljonathas/reelcraft
/plugin install reelcraft@reelcraft
```

O plugin declara a pasta `skills/` e o servidor MCP (`npx -y reelcraft mcp`).

### Desenvolvimento

```bash
npm ci
npm run typecheck && npm run lint && npm test
HYPERFRAMES_BROWSER_PATH=/caminho/do/chrome npm run test:integration   # render real, precisa de Chrome
```

Os testes dos provedores de assets usam respostas gravadas à mão a partir da documentação pública das APIs; não
foram conferidos contra os serviços reais.
