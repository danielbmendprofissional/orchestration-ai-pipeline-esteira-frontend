# esteira-frontend

Frontend Angular da Esteira. Parte do workspace `esteira` — regras, specs e issues vivem no repositório do workspace (ver `docs/agents/workspace.md` lá). Arquitetura e regras de código: [`CLAUDE.md`](CLAUDE.md).

Fluxo de branches: `feature-x → MR → dev → qa → hml → main`.

## Rodar

Node 24.22 (`nvm use` lê o `.nvmrc`).

```bash
npm ci
npm start          # http://localhost:4200, /api → esteira-api em http://localhost:5105
npm run test:ci
npm run e2e        # primeira vez: npx playwright install chromium
```

Publicação: imagem nginx do `template-ci` (`nginx/`), que serve o `/config.json` a partir da variável `APP_RUNTIME_CONFIG` de cada ambiente.
