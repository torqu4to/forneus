# Página inicial: central de companheiros

Reformulação de 16/10/2026. Prévia local: http://localhost:4323/pt/ (também /en/).

## Direção

Skills aplicadas: frontend-design, design-taste-frontend e web-design-guidelines. A direção sorteada foi **The page is the object**, seed **782305909**. O painel com abas foi adaptado aos menus de companheiros de Tree of Savior Neo: cada aba abre um sistema, com seu ícone original e uma ação concreta. O argumento da página é: escolher o sistema, experimentar o investimento, abrir o planejador com a própria equipe. Não foram criados depoimentos, métricas comerciais ou dados de poder novos.

A paleta vem dos cenários extraídos: pergaminho `#f6efd9`, prado `#e9ecd9`, tinta `#443e2d`, verde `#3f6249` e dourado `#e0bd76`. Bree Serif dá o tom dos títulos; Barlow mantém os textos e números legíveis. O cenário da árvore é o foco da primeira tela. As abas e o exemplo de orçamento são as interações principais. A apresentação mantém os dados existentes do otimizador em 6 estrelas.

## Assets

As imagens novas estão em `public/assets/home/`. `sources.json` registra nome, bundle, path ID, dimensões e SHA-256 do PNG original de cada exportação. Foram convertidas para WebP com transparência preservada:

- `bg_loading_13`: árvore da tela de carregamento, usada na abertura e na aba Amigatos.
- `bg_plantingmain`: cenário da aba Florais.
- `bg_springtraveldiary`: ilustração de viagem, usada na aba Fantasmas e junto ao exemplo.
- `system_icon_flower`: ícone original do sistema Floral.
- `system_icon_pet`: ícone original do sistema de pets, usado para Fantasmas.

O ícone `system_icon_cat` e os quatro retratos de Amigatos já haviam sido importados com proveniência registrada em `src/data/AMIGATOS-SOURCE.md` e `amigatos-roster.json`. Os ícones dos guardiões seguem a origem registrada em `src/data/FLORAIS-SOURCE.md`. A arte do jogo pertence aos respectivos titulares; sua inclusão não concede licença sobre essa arte. Não foram usadas imagens de banco, fotografias substitutas ou imagens geradas nesta reformulação. Não há conteúdo fictício para substituir antes de publicar.

## Revisão

- `astro check`: nenhum erro ou aviso; apenas uma indicação de API depreciada que já existia em `amigatos/perfil.astro`.
- `astro build`: 18 páginas geradas com sucesso.
- Lint da skill: nenhum padrão proibido encontrado na página.
- Inspector em 1440, 768 e 390 pixels, nas duas línguas: nenhum FAIL na revisão final. Capturas e relatórios em `.taste-skill/game-home-complete/` e `.taste-skill/game-home-en/`.
- Conferência adicional em 320 e 900 pixels: sem transbordamento horizontal.
- Abas verificadas por clique e teclas ArrowRight, Home e End; uma única aba selecionada e um único painel visível.
- Menu móvel e os três orçamentos verificados no navegador. Imagens carregadas sem falhas.
- O sistema operacional pede movimento reduzido; a página respeita isso. O modo sem essa preferência também foi conferido, com as entradas ativadas.

Duas adaptações do medidor: `palette-cream` preserva o pergaminho da arte original, conforme a identidade solicitada; `still-page` considera que o movimento foi desligado pela preferência de acessibilidade do sistema. O único aviso restante é a ausência de vídeo: não havia clipe escolhido nos assets originais, e um vídeo genérico enfraqueceria a identidade pedida. A árvore tem movimento discreto apenas quando permitido pela preferência do usuário.

Autoavaliação visual, após as correções: design 8/10, usabilidade 8,5/10, criatividade 7,5/10 e conteúdo 8/10; ponderação da skill: 8,05/10. Limitação visual: a árvore se repete na aba Amigatos, por ser a arte original mais adequada entre as revisadas. Os dados e regras das ferramentas continuam com sua cobertura anterior; esta mudança é da página inicial.
