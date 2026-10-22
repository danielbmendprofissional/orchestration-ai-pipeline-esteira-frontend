# esteira-frontend

Frontend Angular da Esteira. Vocabulário do domínio: `../CONTEXT-MAP.md` (Aplicação, Entrega, Fluxo, Candidata, Ambiente, Deploy, Análise, Achado…) — nomes de feature, componente e rota usam esses termos, em pt-BR. Decisões: `../docs/adr/` — stack e arquitetura na **ADR-0005**, componentes na **ADR-0015**, config em runtime na **ADR-0006**, sessão na **ADR-0004**, tempo real na **ADR-0011**. Convenção de código Angular: skill `angular-developer`. Design: `../docs/design/` (e o `DESIGN.md` quando a definição do design existir).

## Stack

Angular 22 standalone e **zoneless**, signals, `httpResource`/`resource` pra leitura e `firstValueFrom` pra comando · **spartan/ui** (brain + helm em `src/app/shared/ui`) · Tailwind 4 · Vitest + Playwright + axe · Node 24.22 (`.nvmrc`).

## Camadas (ADR-0005)

| Camada | Arquivo | Pode | Não pode |
|---|---|---|---|
| API | `{feature}-api.service.ts` | `HttpClient`, URL, tipos gerados | regra, signal, mensagem |
| Domínio | `{feature}.service.ts` | orquestrar a API, signals, regra de exibição | `HttpClient` direto |
| Smart | `pages/*.page.ts` | serviço de domínio, Router | API service, `HttpClient` |
| Dumb | `components/*.component.ts`, `shared/ui/` | só `input()`/`output()` | injetar serviço |

```
src/app/
  core/      config/ (runtime, /config.json) · api/ (tipos gerados) · http/ · auth/
  layout/    casca (sidebar + header), sem regra de negócio
  features/  <feature>/ api service · domain service · pages/ · components/
  shared/    ui/ (helm do spartan + componentes próprios) · pipes/ · guards/
  app.config.ts · app.routes.ts
```

## Regras

- **Tokens com fonte única em `src/styles.css`:** `@theme` pros utilitários Tailwind e `:root` pras variáveis do helm. Cor, raio, sombra e fonte saem daí — classe de fábrica do Tailwind (`bg-blue-500`) ou tema de fábrica do spartan é P0 (`../docs/design/component-library.md`).
- **Componente de UI:** `npx ng g @spartan-ng/cli:ui <nome>` gera o helm em `shared/ui` (alias `@spartan-ng/helm/<nome>`). O código é nosso: variante nova entra no `cva` do próprio helm. Seletores `hlm*` só em `shared/ui`; o resto usa prefixo `est`.
- **Contrato com a API:** tipos em `src/app/core/api/esteira-api.d.ts`, gerados por `npm run generate:api-types` com a `esteira-api` rodando. Nunca editar à mão; nunca declarar interface própria pra payload da API.
- **Ambiente:** nada de `environment.<ambiente>.ts`. O que muda por ambiente vem do `/config.json` (`AppConfigService`, carregado no `provideAppInitializer`); nunca segredo lá.
- **Sessão:** nenhum token no navegador (BFF, ADR-0004); `/api` na mesma origem — em dev, `proxy.conf.json` manda pra `http://localhost:5105`.
- **Permissão:** o front pergunta à API o que o usuário pode fazer; nunca reimplementa regra de papel.
- Texto direto em pt-BR no template, sem i18n.

## Comandos

```bash
npm start                    # ng serve com proxy de /api → http://localhost:5105
npm run test:ci              # Vitest, sem watch
npm run e2e                  # Playwright + axe (sobe o ng serve sozinho)
npx ng lint
npx ng build
npm run generate:api-types   # com a esteira-api no ar
```

Teste unitário junto do arquivo (`*.spec.ts`); E2E em `e2e/`, sempre com a checagem do axe nas telas novas.
