# esteira-frontend

Frontend Angular da Esteira. Vocabulário do domínio: `../CONTEXT-MAP.md` (Aplicação, Entrega, Fluxo, Candidata, Ambiente, Deploy, Análise, Achado…) — nomes de feature, componente e rota usam esses termos, em pt-BR. Decisões: `../docs/adr/` — stack e arquitetura na **ADR-0005**, componentes na **ADR-0015**, config em runtime na **ADR-0006**, sessão na **ADR-0004**, tempo real na **ADR-0011**. Convenção de código Angular: skill `angular-developer`. Design: **`DESIGN.md`** (fonte de verdade; tokens em `src/styles.css`), `PRODUCT.md`, protótipos em `../docs/design/prototipos/` e regras em `../docs/design/`.

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
  core/      boot.ts (config e depois sessão) · config/ (runtime, /config.json) · api/ (tipos gerados)
             auth/ (AuthService, sessão) · http/ (interceptors de sessão e de erro, paginação) · notificacao/ (toast)
  layout/    shell (menu lateral + cabeçalho + conteúdo), sem regra de negócio · pages/ (sem-acesso, não encontrado)
  features/  <feature>/ api service · domain service · pages/ · components/
  shared/    ui/ (helm do spartan + componentes próprios) · pipes/ · guards/ (authGuard, perfilGuard, RotaData)
  app.config.ts · app.routes.ts
```

## Regras

- **Tokens com fonte única em `src/styles.css`:** `@theme` pros utilitários Tailwind e `:root` pras variáveis do helm. Cor, raio, sombra e fonte saem daí — classe de fábrica do Tailwind (`bg-blue-500`) ou tema de fábrica do spartan é P0 (`../docs/design/component-library.md`).
- **Componente de UI:** `npx ng g @spartan-ng/cli:ui <nome>` gera o helm em `shared/ui` (alias `@spartan-ng/helm/<nome>`). O código é nosso: variante nova entra no `cva` do próprio helm. Seletores `hlm*` só em `shared/ui`; o resto usa prefixo `est`.
- **Contrato com a API:** tipos em `src/app/core/api/esteira-api.d.ts`, gerados por `npm run generate:api-types` com a `esteira-api` rodando. Nunca editar à mão; nunca declarar interface própria pra payload da API.
- **Ambiente:** nada de `environment.<ambiente>.ts`. O que muda por ambiente vem do `/config.json` (`AppConfigService`, carregado no `provideAppInitializer`); nunca segredo lá.
- **Sessão:** nenhum token no navegador (BFF, ADR-0004); `/api` na mesma origem — em dev, `proxy.conf.json` manda pra `http://localhost:5105`. O ESLint proíbe `localStorage`, `sessionStorage`, `indexedDB` e `document.cookie`. O boot (`core/boot.ts`) carrega o `/config.json` e depois o `me`; sem sessão, `AuthService.entrar()` navega a página inteira ao login (uma vez só) com o `returnUrl` interno (`returnUrlSeguro`). Login e logout nunca passam pelo roteador.
- **Interceptors** (ordem em `app.config.ts`, sessão por fora, erro por dentro): `sessaoInterceptor` renova com **um** `POST /auth/refresh` para todas as requisições que vencerem juntas e repete cada original uma vez (sem laço); `errorInterceptor` mostra o `message` de cada `errors[]` em toast e deixa o `code` no erro (`codigoDoErro`), e usa mensagem genérica para Problem Details e rede. A page decide pelo `code`, nunca pelo status (`auth.provedor-indisponivel` vem como 422).
- **Paginação:** `lerPagina`/`cabecalhosDePaginacao` em `core/http/paginacao.ts`; nenhuma page conhece header `X-*`. Header ausente é erro, não lista vazia.
- **Rota e menu:** a rota declara `data` do tipo `RotaData` (`menu: { rotulo, icone }`, `perfis?`); o mesmo dado alimenta o menu do shell e o `perfilGuard` (rota restrita leva `canActivate: [perfilGuard]`). O `icone` é uma chave de `layout/icones.ts`: a feature acrescenta o ícone lá.
- **Permissão:** o front pergunta à API o que o usuário pode fazer; nunca reimplementa regra de papel (o `perfilGuard` só confere o que o `me` devolveu).
- **Preview:** `ng build --configuration preview` troca o `AuthApiService` por `auth-api.service.preview.ts` (sessão falsa, sem API nem Keycloak). Tela nova acrescenta ali os dados falsos dela, tipados pelo contrato gerado.
- Texto direto em pt-BR no template, sem i18n.

## Comandos

```bash
npm start                    # ng serve com proxy de /api → http://localhost:5105
npm run test:ci              # Vitest, sem watch
npm run e2e                  # Playwright + axe (sobe o ng serve sozinho; E2E_PORT=4311 npm run e2e roda ao lado de um ng serve já aberto)
npx ng lint
npx ng build
npx ng build --configuration preview   # build estático com sessão falsa
npm run generate:api-types   # com a esteira-api no ar
```

Teste unitário junto do arquivo (`*.spec.ts`); E2E em `e2e/`, sempre com a checagem do axe nas telas novas. O E2E simula a sessão com `page.route` (`e2e/sessao-falsa.ts`), então não depende de API, Redis nem Keycloak; o login real é um smoke manual (`npm start` com a API local, login com `dev` e com `dev-sem-papel`).
