# Desenvolvimento

**Um servidor só.** O solver roda no navegador, então trabalhar no site não
exige subir a API — ela não participa mais do cálculo.

**Não use `npm run build` para trabalhar.** Ele compila para produção e
termina, então toda mudança exigiria rodar de novo. O build serve para
publicar, ou para conferir o resultado final antes de publicar.

```bash
cd /e/Github/forneus/web
npm run dev
```

Abra http://localhost:4321 — o `/` redireciona para `/pt/`.

## O que recarrega sozinho, e o que não

| Você muda | O que acontece |
|---|---|
| `.astro`, `.ts`, `.css` em `web/src/` | O navegador atualiza sozinho, preservando o estado da página |
| `web/src/i18n/ui.ts` | Idem — as strings aparecem na hora |
| `web/src/lib/solver/` | Idem. **Rode `npm test` depois**: é o que garante que o TypeScript ainda concorda com o Python |
| `src/forneus_core/data/*.json` | O site recarrega (o solver do navegador importa esse arquivo direto). **Regenere as fixtures** — veja abaixo |
| `astro.config.mjs` | Pare e suba o `npm run dev` de novo |

## Ao mexer em qualquer um dos dois solvers

O algoritmo existe em Python (referência) e em TypeScript (navegador). Os dois
precisam concordar, e isso é verificado, não confiado:

```bash
python scripts/generate_fixtures.py   # Python gera o gabarito
cd web && npm test                    # TypeScript é comparado com ele
cd .. && .venv/Scripts/python.exe -m pytest -q
```

## A API Python

Continua no repositório e continua testada, mas **não roda em produção** e não
é necessária para desenvolver. Se quiser levantá-la mesmo assim:

```bash
cd /e/Github/forneus
.venv/Scripts/python.exe -m uvicorn forneus_core.api:create_app --factory --reload
```

## Ver o site em outro aparelho da rede

```bash
npm run dev:host
```

O Astro imprime o endereço de rede. Como não há API, o celular calcula
sozinho — nada mais precisa ser configurado.

## Conferir o build antes de publicar

```bash
cd web
npm run check   # erros de tipo nos .astro e .ts
npm test        # paridade com o Python
npm run build
npm run preview # serve o dist/ como em produção
```
