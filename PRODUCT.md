# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Agora:** uma pessoa só (Daniel), no papel de **MOR** — abre Entregas, acompanha pipelines e aprova tudo, muitas vezes com autoaprovação marcada.
- **Depois:** times com papéis por Aplicação — **Analista** (mantém o cadastro e a configuração de publicação), **Membro** (abre Entrega selecionando Fatias, reexecuta), **Aprovador técnico** (aprova a MR da Fatia, o QA e o HML; Exceções), **Aprovador de negócio** (libera e exclui Fatias, lendo as Notas de entrega, sem precisar entrar no GitLab), **Publicador** (confirma a produção e usa o Atalho) — e o MOR, global.
- O aprovador de negócio não é técnico: lê Notas de entrega em linguagem de produto, não diffs.

## Product Purpose

A Esteira é o lugar onde todo deploy começa e é decidido. O trabalho chega à `main` **Fatia** por Fatia; quem publica **seleciona Fatias Prontas para Entrega** no **Painel de Fatias** e abre uma **Entrega**, que tem um **Fluxo de deploy** por Projeto tocado (ex.: API + front). Cada Fluxo passa por QA, HML e PRD, e a **Liberação** liga, Fatia por Fatia, o flag que mantinha a feature desligada em produção. As pipelines do GitLab perguntam à Esteira se podem publicar; ela aplica a política de segurança da Aplicação, mostra o que ferramentas e agentes (code-review, qa, security) encontraram, registra as aprovações humanas e executa as promoções no GitLab por um bot.

Sucesso: saber de relance o que está onde, o que está travando e o que espera por você — e nunca publicar algo que não passou pelas regras.

## Positioning

Não é um painel de CI nem um gerenciador de tarefas: é a autoridade que **decide** se uma versão pode avançar, juntando num só lugar gate de segurança por ambiente, resultado de agentes de IA, aprovações humanas auditadas e a orquestração do GitLab — por Entrega, não por pipeline solto.

## Operating Context

- Usado junto com o GitLab (pipelines do template-ci, MRs, issues) e a IDE. A Esteira é fail-closed: se estiver fora do ar, nada publica.
- Muito estado mudando sozinho (pipelines, deploys por Destino, respostas de agentes) — atualização ao vivo na tela.
- Decisões em três contextos, todos obrigatórios: **desktop com tela grande** (acompanhamento longo, várias Entregas abertas), **notebook** (13–14") e **celular** (aprovar ou reprovar a partir do e-mail de pendência).
- Pendências chegam por e-mail e por uma caixa "aguardando você" na própria Esteira.

## Capabilities and Constraints

- Vocabulário obrigatório (glossário em `../CONTEXT-MAP.md`): Aplicação, Projeto, Fatia, Painel de Fatias, Entrega, Fluxo de deploy, Artefato, Etapa (Abertura, QA, HML, PRD, Liberação), Ambiente, Destino, Deploy, Análise, Achado, Exceção, Atalho, Aprovação (≠ revisão de código), Notas de entrega, Liberação, Cancelamento, Rollback. Evitar "Sistema", "Candidata", "rc", "DEV" e "AET" (termos do modelo antigo). Estados da Fatia e da Entrega: `../docs/adr/0023`, `0024` e `0025`.
- Texto em pt-BR, sem i18n.
- Stack fixa: Angular 22 + spartan/ui + Tailwind 4 (ADR-0005, ADR-0015).
- Telas já implementadas: Aplicações (A1). Protótipos aprovados do modelo novo (D1): Painel de Fatias, Abrir Entrega, Entrega, Entregas, Aguardando você (com a folha de decisão do celular), Exceções, Auditoria. Entram nas fatias P1 (Painel), P2 (review e aprovação), E1 a E8, X1 e X2.

## Brand Commitments

O nome **Esteira** e o logo do cão facetado (protótipo em `../docs/design/prototipos/logo-cao.html`). Cores, fontes e componentes definidos na D0 e estendidos na D1: ver `DESIGN.md`.

## Evidence on Hand

- Telas do sistema antigo do TCE em `../docs/referencias/tce-fluxo-deploy/telas/` — referência **funcional** (o que existe e como o fluxo anda), não visual.
- Referência de direção dada pelo Daniel em `../docs/referencias/visual/` (pipeline do GitLab).
- Não existem dados reais, clientes, depoimentos ou métricas; não inventar.

## Product Principles

1. **O estado manda.** Em qualquer tela, o primeiro a ser lido é onde cada Fluxo está e o que o impede de seguir.
2. **Decisão com evidência.** Toda aprovação mostra junto o que a sustenta (achados, resultado dos agentes, diff, notas) e registra quem decidiu e por quê.
3. **Fail-closed também na interface.** Ausência de resultado nunca parece sucesso; esperando, falhou e aprovado são inconfundíveis.
4. **Uma Entrega, uma visão.** Fluxos parceiros aparecem juntos, na ordem da dependência. A unidade de trabalho continua sendo a Fatia: a Entrega só a agrupa.
5. **Cada papel vê o seu trabalho.** O aprovador de negócio lê linguagem de produto; o técnico, o detalhe técnico.

## Accessibility & Inclusion

WCAG 2.1 AA (ADR-0005; axe-core no E2E). Status nunca só por cor.
