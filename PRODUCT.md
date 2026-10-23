# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Agora:** uma pessoa só (Daniel), no papel de **MOR** — abre fluxos, acompanha pipelines e aprova tudo, muitas vezes com autoaprovação marcada.
- **Depois:** times com papéis por Aplicação — **Analista** (mantém o cadastro e a configuração de publicação), **Membro** (abre fluxo, corta candidata, reexecuta), **Aprovador técnico** (aprovação da proposta, da candidata e da entrega; Exceções), **Aprovador de negócio** (aprovação de negócio, issue por issue, sem precisar entrar no GitLab), **Publicador** (ida para produção) — e o MOR, global.
- O aprovador de negócio não é técnico: lê Notas de entrega em linguagem de produto, não diffs.

## Product Purpose

A Esteira é o lugar onde todo deploy começa e é decidido. Cada versão nova de um Projeto anda num **Fluxo de deploy** (dentro de uma **Entrega** que junta os Fluxos parceiros, ex.: API + front), passando por etapas (abertura, aprovação da proposta, DEV, QA, HML, aprovação de negócio, aprovação da entrega, produção). As pipelines do GitLab perguntam à Esteira se podem publicar; ela aplica a política de segurança da Aplicação, mostra o que ferramentas e agentes (code-review, qa, security) encontraram, registra as aprovações humanas e executa as promoções no GitLab por um bot.

Sucesso: saber de relance o que está onde, o que está travando e o que espera por você — e nunca publicar algo que não passou pelas regras.

## Positioning

Não é um painel de CI nem um gerenciador de tarefas: é a autoridade que **decide** se uma versão pode avançar, juntando num só lugar gate de segurança por ambiente, resultado de agentes de IA, aprovações humanas auditadas e a orquestração do GitLab — por Entrega, não por pipeline solto.

## Operating Context

- Usado junto com o GitLab (pipelines do template-ci, MRs, issues) e a IDE. A Esteira é fail-closed: se estiver fora do ar, nada publica.
- Muito estado mudando sozinho (pipelines, deploys por Destino, respostas de agentes) — atualização ao vivo na tela.
- Decisões em três contextos, todos obrigatórios: **desktop com tela grande** (acompanhamento longo, várias Entregas abertas), **notebook** (13–14") e **celular** (aprovar ou reprovar a partir do e-mail de pendência).
- Pendências chegam por e-mail e por uma caixa "aguardando você" na própria Esteira.

## Capabilities and Constraints

- Vocabulário obrigatório (glossário em `../CONTEXT-MAP.md`): Aplicação, Projeto, Entrega, Fluxo de deploy, Candidata, Etapa, Ambiente, Destino, Deploy, Análise, Achado, Exceção, Aprovação (≠ revisão de código), Notas de entrega, Cancelamento, Rollback, Sincronização. Evitar "Sistema" e "Artefato".
- Texto em pt-BR, sem i18n.
- Stack fixa: Angular 22 + spartan/ui + Tailwind 4 (ADR-0005, ADR-0015).
- Ainda não existe nenhuma tela de negócio; as features entram nas fatias A1 (cadastro) e E1–E5 (Entrega, análises, aprovações, orquestração, notas).

## Brand Commitments

O nome **Esteira** e o logo do cão facetado (protótipo em `../docs/design/prototipos/logo-cao.html`). Cores, fontes e componentes definidos na D0: ver `DESIGN.md`.

## Evidence on Hand

- Telas do sistema antigo do TCE em `../docs/referencias/tce-fluxo-deploy/telas/` — referência **funcional** (o que existe e como o fluxo anda), não visual.
- Referência de direção dada pelo Daniel em `../docs/referencias/visual/` (pipeline do GitLab).
- Não existem dados reais, clientes, depoimentos ou métricas; não inventar.

## Product Principles

1. **O estado manda.** Em qualquer tela, o primeiro a ser lido é onde cada Fluxo está e o que o impede de seguir.
2. **Decisão com evidência.** Toda aprovação mostra junto o que a sustenta (achados, resultado dos agentes, diff, notas) e registra quem decidiu e por quê.
3. **Fail-closed também na interface.** Ausência de resultado nunca parece sucesso; esperando, falhou e aprovado são inconfundíveis.
4. **Uma Entrega, uma visão.** Fluxos parceiros aparecem juntos, na ordem da dependência.
5. **Cada papel vê o seu trabalho.** O aprovador de negócio lê linguagem de produto; o técnico, o detalhe técnico.

## Accessibility & Inclusion

WCAG 2.1 AA (ADR-0005; axe-core no E2E). Status nunca só por cor.
