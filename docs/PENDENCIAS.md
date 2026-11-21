# Pendências — esteira-frontend

Formato: `docs/agents/pendencias.md` do workspace (uma linha `- [ ]` por pendência).

## Da revisão de segurança da F0.5 (2026-11-21)

- [ ] **Refresh entre abas:** o `RenovacaoSessaoService` deduplica só dentro de uma aba. Duas abas renovando juntas podem acionar a reuse detection do BFF e revogar a sessão. Precisa de tolerância a refresh concorrente na API (janela de graça) e, opcionalmente, `navigator.locks` no front. Decidir com a API antes da E1.
- [ ] **Build `preview` só no ambiente de preview:** `ng build -c preview` traz uma sessão falsa (`perfis: ['mor']`) e dispensa o login. O pipeline do template-ci só pode publicá-lo no `review-<fatia>`, nunca em qa, hml ou produção. Conferir quando a P2 ligar o preview (`docs/mudancas-template.md`).
- [ ] **API revalida o `returnUrl` depois de decodificar** (`%2f%2f`, `%5c`): o front valida o texto, mas `/%2f/` ainda é caminho da mesma origem para o navegador. Conferir na `esteira-api` (B3, `ReturnUrlSeguro`) com teste.
- [ ] **Repetição de POST/PUT/DELETE depois do refresh** supõe que a API autentica antes de executar (o 401 `auth.access-token-expired` sai antes de qualquer efeito). Confirmar ao criar o primeiro endpoint de escrita (A1).

## Da revisão de código da F0.5 (2026-11-21)

- [ ] **Boot com o Keycloak fora do ar:** se o `me` volta `auth.access-token-expired` e o refresh volta 422 (`auth.provedor-indisponivel`), o `AuthService.carregar` relança e o app não sobe (tela em branco, sem toast, porque o toaster ainda não existe). Decidir o que mostrar (página de indisponibilidade fora do shell) antes de ir a produção.
- [ ] **Critério 9 só por lint:** o builder do Angular não oferece `import.meta.glob` nem `@types/node` para varrer `src/app` num teste Vitest; a garantia é a regra do ESLint. Se o projeto adotar `@types/node`, acrescentar a varredura da spec.
- [ ] **`perfilGuard` sem rota real:** nenhuma rota declara `data.perfis` ainda, então o redirecionamento a `/sem-acesso` só tem teste unitário. O primeiro item de menu restrito (A1 ou X1) deve ganhar um E2E.
- [ ] **Julgamentos do review:** `text-white` fora dos tokens (`shell` e menu lateral), `sem-acesso` e `nao-encontrado` repetem o mesmo bloco, `ItemMenu.icone` como `string` em vez de `keyof ICONES_DO_SHELL`, `ehDaApi` e `caminhoDe` moram em `erro-api.ts`. Resolver quando a terceira página de aviso aparecer.

## Da A1 — cadastro de Aplicação (2026-11-21)

- [ ] **`features.json` em qa, hml e produção:** o build de produção sai com `{}` (tudo desligado); `{"A1": true}` vive em `src/dev/features.json` e só entra na configuração `development`. Em qa, hml e produção quem manda é o ConfigMap do Ambiente (`APP_FEATURES_JSON`): conferir no template-ci que o nginx o serve por cima do arquivo da imagem.
- [ ] **Validação do grupo ao sair do campo:** a spec pede mostrar o grupo encontrado ao sair do campo, mas a API não tem rota de consulta de grupo sem criar. Hoje o erro (`gitlab.grupo-nao-encontrado`, `aplicacao.grupo-ja-vinculado`) aparece ao criar. Pedir à API uma consulta de grupo, ou aceitar o comportamento atual.
- [ ] **Smoke manual contra a API real:** os testes e o E2E usam a API simulada; o smoke com GitLab real espera o token do bot (`docs/mudancas-infra.md`, item 2). Rodar com `dev` (MOR) e `dev-sem-papel`.
- [ ] **Menu "Aplicações" aparece pra qualquer pessoa logada:** o papel por Aplicação não vem no `me`, só da API (a lista vem vazia e o detalhe dá 404 sem papel). Aceitável; reavaliar se a Esteira ganhar um perfil global de "sem nenhuma aplicação".
- [ ] **Piso fixo duplicado no front:** a tabela de política trava Crítica, Alta e o modo fora de `review` (espelha o 11a da spec). A API continua sendo quem recusa; se o piso mudar, atualizar `politica-aba.component.ts`.
- [ ] **Segredo em Destino (revisão de segurança da A1):** a API só recusa chave com nome de segredo; não pega `pwd`, `passwd`, `auth`, `bearer`, `private`, `cookie`, `cert`, nem segredo dentro do valor (`https://user:senha@host`, JWT, `glpat-`). O Destino aparece pra todo papel e vai inteiro pra auditoria. Endurecer `IndiciosDeSegredo` em `esteira-api` (`DestinoEntity`).
- [ ] **Limite de tamanho de entrada (revisão de segurança da A1):** `Nome`, `Sigla`, `Usuario` e `Configuracao` do Destino não têm tamanho máximo nem as colunas `HasMaxLength`; um papel com acesso grava megabytes (e na auditoria). Acrescentar `MaximumLength`, máximo de chaves e limite de corpo nas rotas novas da `esteira-api`.
