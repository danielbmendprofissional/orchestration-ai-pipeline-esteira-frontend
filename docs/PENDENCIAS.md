# Pendências — esteira-frontend

Formato: `docs/agents/pendencias.md` do workspace (uma linha `- [ ]` por pendência).

## Da revisão de segurança da F0.5 (2026-11-21)

- [ ] **Refresh entre abas:** o `RenovacaoSessaoService` deduplica só dentro de uma aba. Duas abas renovando juntas podem acionar a reuse detection do BFF e revogar a sessão. Precisa de tolerância a refresh concorrente na API (janela de graça) e, opcionalmente, `navigator.locks` no front. Decidir com a API antes da E1.
- [ ] **Build `preview` só no ambiente de preview:** `ng build -c preview` traz uma sessão falsa (`perfis: ['mor']`) e dispensa o login. O pipeline do template-ci só pode publicá-lo no `review-<fatia>`, nunca em qa, hml ou produção. Conferir quando a P2 ligar o preview (`docs/mudancas-template.md`).
- [ ] **API revalida o `returnUrl` depois de decodificar** (`%2f%2f`, `%5c`): o front valida o texto, mas `/%2f/` ainda é caminho da mesma origem para o navegador. Conferir na `esteira-api` (B3, `ReturnUrlSeguro`) com teste.
- [ ] **Repetição de POST/PUT/DELETE depois do refresh** supõe que a API autentica antes de executar (o 401 `auth.access-token-expired` sai antes de qualquer efeito). Confirmar ao criar o primeiro endpoint de escrita (A1).
