# AGENTS.md — Reelcraft

Regras para quem altera este repositório (pessoas ou agentes). O que o produto faz está em `docs/PLANO.md`.

1. **Idioma:** documentação, skills e receitas em português; código, identificadores e mensagens de commit em inglês.
2. **Sem modelo embutido:** nenhum código do Reelcraft chama API de modelo. O raciocínio é do agente de quem usa.
3. **Licença sempre registrada:** nenhum asset entra no repositório ou num projeto sem origem, autor, licença e
   atribuição gravados. Nada com licença NC ou ND nas receitas.
4. **Nada copiado:** skills e receitas descrevem técnicas com palavras próprias e citam a fonte por link.
5. **Contra a estética de primitivas:** receita feita só de formas geométricas sobre fundo chapado não é aceita.
6. **Multiplataforma:** tudo roda com `npx` no Mac, no Windows e no Linux; nada de dependência só de Linux.
7. **Determinismo:** o mesmo projeto gera o mesmo MP4; nada de aleatoriedade sem semente nem relógio no render.
8. **Skills curtas:** `SKILL.md` com o essencial; detalhes em arquivos de referência carregados sob demanda.
9. **Decisões:** decisões de arquitetura vão em `docs/decisoes/NNNN-titulo.md`.
10. **Commits:** Conventional Commits.
