---
name: Esteira
description: A autoridade que decide se cada versão pode seguir até produção.
colors:
  surface-0: "#08080a"
  surface-1: "#101012"
  surface-2: "#161619"
  surface-3: "#1d1d21"
  rail: "#000000"
  line: "#26262b"
  line-strong: "#36363d"
  fg: "#fafafa"
  fg-2: "#d4d4d8"
  fg-muted: "#a1a1aa"
  fg-dim: "#8b8b94"
  brand: "#0a4ee4"
  brand-hover: "#2d6bff"
  brand-fg: "#7aa2ff"
  ok: "#2ea043"
  ok-fg: "#56d364"
  run: "#d29922"
  run-fg: "#e3b341"
  bad: "#f85149"
  bad-fg: "#ff7b72"
  sev-media: "#c9b458"
  sev-baixa: "#7aa2ff"
  lane-2: "#e4e4e7"
  chart-a: "#2d6bff"
  chart-b: "#d9732a"
typography:
  headline:
    fontFamily: "Mona Sans Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Mona Sans Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Mona Sans Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Mona Sans Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: "Geist Mono Variable, ui-monospace, Consolas, monospace"
    fontSize: "0.78125rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.bad-fg}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  pill:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 11px"
  chip-filter-selected:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "8px 11px"
  panel:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.xl}"
    padding: "18px 20px"
  list-row:
    backgroundColor: "{colors.surface-1}"
    padding: "12px 20px"
  nav-item-active:
    backgroundColor: "{colors.surface-2}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: Esteira

## Overview

**Creative North Star: "A Torre de Controle"**

A Esteira é o lugar onde todo deploy começa e é decidido. A interface se comporta como uma torre de controle: calma, escura, densa de informação, com o estado de cada Entrega à vista e cada decisão acompanhada da evidência que a sustenta. Nada pisca por enfeite; o que chama atenção é o que está travando ou esperando alguém.

É uma ferramenta de trabalho para longas sessões em tela grande e notebook, então a densidade é alta e o texto é pequeno (corpo de 14 px), mas a leitura vem antes de tudo: hierarquia por peso e tamanho, cor reservada para estado e ação. Os componentes são precisos e silenciosos: bordas finas, superfícies em camadas de grafite, nenhum ornamento que dispute com o dado.

Os protótipos que originaram este sistema estão em `../docs/design/prototipos/` (workspace) e são a referência visual de cada tela.

**Key Characteristics:**
- Fundo preto/grafite em camadas; profundidade por tom de superfície, não por sombra.
- Azul só em marca, ação principal e seleção.
- Status no estilo GitHub Actions, sempre com ícone e texto, nunca só cor.
- Listas enxutas e paginadas; detalhe no hover ou numa gaveta lateral.
- Código, versões e hashes sempre em mono.

## Colors

Grafite quase preto com um único azul de ação e uma família de status emprestada do GitHub Actions.

### Primary
- **Azul Esteira** (#0a4ee4): ação principal da tela (um botão por contexto), item selecionado (filtro ativo, aba, página atual) e a marca. Hover em **Azul Aceso** (#2d6bff). Em texto e link sobre fundo escuro, **Azul Claro** (#7aa2ff).

### Neutral
- **Breu** (#08080a): fundo da aplicação.
- **Grafite 1** (#101012): blocos, listas, gavetas.
- **Grafite 2** (#161619): cabeçalho de tabela, hover de linha, botão secundário.
- **Grafite 3** (#1d1d21): ícone em caixa, hover do secundário, superfície selecionada.
- **Preto do trilho** (#000000): menu lateral.
- **Linha** (#26262b) e **Linha Forte** (#36363d): divisórias e bordas de controle.
- **Texto** (#fafafa), **Texto 2** (#d4d4d8), **Apagado** (#a1a1aa), **Discreto** (#8b8b94): da informação principal ao rótulo de apoio.

### Status e severidade
- **Concluído** (#2ea043, texto #56d364), **Executando/Aguardando** (#d29922, texto #e3b341), **Falhou/Bloqueado** (#f85149, texto #ff7b72). Cada um tem fundo suave (10% de opacidade) e borda (40%) para pílulas e cartões.
- Severidade de achado: Crítica usa o vermelho, Alta o âmbar, **Média** (#c9b458) e **Baixa** (#7aa2ff).
- Gráficos: **Série A** (#2d6bff) e **Série B** (#d9732a).
- O segundo projeto no mapa de etapas usa o trilho **Prata** (#e4e4e7).

### Named Rules
**The One Voice Rule.** O azul aparece só onde há ação principal, seleção ou marca. Um segundo botão azul na mesma área é erro.

**The Never Color Alone Rule.** Estado nunca é comunicado só por cor: sempre ícone (estilo GitHub Actions) e texto. Ausência de resultado nunca parece sucesso.

**The Colorblind Chart Rule.** Gráfico de duas séries usa azul × laranja, nunca verde × vermelho.

## Typography

**Body Font:** Mona Sans (com Segoe UI, system-ui)
**Label/Mono Font:** Geist Mono (com ui-monospace, Consolas)

**Character:** Mona Sans é a fonte do GitHub: técnica, um pouco larga, legível em tamanho pequeno. Geist Mono separa claramente `0/O` e `I/l/1`, o que importa para versões, hashes e regras.

### Hierarchy
- **Headline** (650, 28 px, 1.15, -0.02em): título da página. 22 px no celular.
- **Title** (600, 15 px): título de bloco e de gaveta (19 px na gaveta).
- **Body** (400, 14 px, 1.45): texto da interface; 13 px em linhas de lista e tabela.
- **Label** (600, 12 px): pílulas, cabeçalho de tabela, rótulos de campo.
- **Code** (400, 12,5 px, mono): versões (`v3.8.0`), hashes, caminhos, regras, IDs (`E-12`, `V9`, `SEC-2291`).

### Named Rules
**The Mono Means Machine Rule.** Tudo o que é identificador de máquina (versão, hash, caminho, regra, chave de configuração, ID) vai em mono; tudo o que é linguagem de gente vai em Mona Sans.

## Layout

Menu lateral fixo de 240 px à esquerda e conteúdo à direita, limitado a 1680 px e centralizado em telas grandes. Abaixo de 1100 px o menu vira uma coluna de ícones de 64 px (o nome aparece no hover); abaixo de 760 px vira uma barra no topo e o conteúdo ocupa a largura toda, com margem de 16 px. Nada pode gerar rolagem lateral da página de 2560 a 320 px: tabela larga rola dentro da própria caixa.

Ritmo: blocos separados por 18 px, conteúdo de bloco com 18 × 20 px de respiro, linhas de lista com 10 a 14 px na vertical e 20 px nas laterais. Formulários de uma coluna dentro da gaveta, com 16 px entre campos.

Padrões de página:
- **Lista:** título, linha de filtros (busca, seletor de Aplicação com busca, chips com contagem), lista enxuta, paginação com "1–8 de N" (janela de páginas, ver Componentes).
- **Detalhe:** cabeçalho com estado, metadados em linha, blocos; abas logo abaixo do cabeçalho do bloco.
- **Ações:** fora do bloco, no canto inferior direito; Reprovar/Cancelar à esquerda da ação principal.

## Elevation & Depth

Sistema plano em camadas tonais: a profundidade vem do grafite ficando mais claro (fundo → bloco → cabeçalho → ícone), não de sombra. A única sombra em superfície parada é um brilho de 1 px na borda de cima. Sombra de verdade só no que flutua sobre a página.

### Shadow Vocabulary
- **Brilho de borda** (`box-shadow: inset 0 1px 0 #ffffff12`): blocos, listas, botões, pílulas de seleção.
- **Flutuante** (`box-shadow: 0 18px 40px #000c`): popover do sino.
- **Gaveta** (`box-shadow: -24px 0 48px #000a`): gaveta lateral, sobre um véu preto de 73%.
- **Foco** (`box-shadow: 0 0 0 3px #0a4ee433`, com borda azul): campos em foco.

### Named Rules
**The Flat-By-Default Rule.** Superfície parada não tem sombra projetada. Se parece que precisa, a resposta é outra camada de grafite.

## Shapes

Cantos suavemente arredondados e bordas de 1 px. Controles (botão, campo, item de menu) com 8 px; caixas e cartões internos com 10 px; blocos e listas com 12 px; pílulas, chips e contadores totalmente arredondados. Ícones de traço de 1,8 px, 16 px por padrão.

## Components

### Buttons
- **Shape:** cantos de 8 px, altura confortável (8 × 14 px de respiro), ícone de 16 px à esquerda do texto.
- **Primary:** Azul Esteira com texto branco e brilho de borda; hover em Azul Aceso. Um por contexto.
- **Secondary:** Grafite 2 com borda Linha Forte; hover em Grafite 3.
- **Danger:** fundo transparente, borda e texto vermelhos (Cancelar entrega, Revogar, Excluir).
- **Disabled:** 45% de opacidade e cursor de bloqueio; o motivo vai no `title`, nunca num texto ao lado.
- **Pequeno:** 5 × 10 px de respiro, 12 px de texto, para ações dentro de linhas.

### Chips
- **Filtro:** pílula com borda Linha Forte e contador; selecionado com borda Azul Aceso e fundo azul suave.
- **Pílula de status:** fundo suave + borda + texto da cor do status, com ícone; neutra em Grafite 2.

### Cards / Containers
- **Bloco:** cantos de 12 px, fundo Grafite 1 com leve gradiente para baixo, borda Linha, brilho de borda, 18 × 20 px de respiro, título de 15 px com ícone em caixa de 28 px.
- **Caixa interna:** cantos de 10 px, cabeçalho em Grafite 2 separado por divisória.

### Inputs / Fields
- **Style:** fundo Grafite 1, borda Linha Forte, cantos de 8 px.
- **Focus:** borda Azul Aceso e anel azul de 3 px.
- **Error:** borda e anel vermelhos, mensagem curta em vermelho logo abaixo; nunca bloquear em silêncio.
- **Campo com cara de segredo** (PASSWORD, TOKEN, KEY…) é recusado na hora, com orientação.

### Navigation
- **Menu lateral:** preto, itens de 14 px em Apagado; hover e ativo em Grafite 2 com texto branco e brilho de borda. Contador azul em "Aguardando você". Pessoa logada no rodapé.
- **Abas:** texto Apagado, ativa em branco com sublinhado Azul Aceso de 2 px; contador em pílula.
- **Responsivo:** só ícones abaixo de 1100 px, barra no topo abaixo de 760 px.

### Lista enxuta (signature)
Linha clicável inteira com ícone de estado, título (600), linha de contexto em Discreto, colunas curtas e uma seta no fim; hover em Grafite 2. O detalhe aparece no hover (`title`) ou numa gaveta. Cabeçalho de 38 px em Grafite 2. Agrupamento por dia ou seção em faixa Grafite 2.

### Gaveta lateral (signature)
Painel de até 540 px vindo da direita, sobre véu escuro, com fechar no canto, título de 19 px e ações no rodapé alinhadas à direita. É onde se edita cadastro e se vê o detalhe de um registro; fecha com Esc.

### Mapa de etapas (signature)
Cartões de etapa em grade sobre fundo pontilhado, com **uma faixa por Fluxo** (um Projeto cada), ligadas por um trilho (azul para o primeiro, Prata para o segundo). Cinco colunas: **Abertura** e **Liberação** ocupam as duas faixas (são da Entrega); **QA, HML e PRD** são de cada Fluxo. Estados da etapa, sempre ícone + texto: Concluído (borda e selo verdes), Executando e Aguardando aprovação (âmbar; o cartão diz de quem é a vez), Bloqueada e Falhou (vermelho), Pulada, Superado e Cancelado (tracejado). O estado da Entrega fica no título, um só: o mais urgente. A etapa atual leva a etiqueta "você está aqui".

### Badge de estado da Fatia (signature)
Pílula pequena com ícone e texto curto, sem barra de progresso: o progresso é texto na linha ("3 de 5 tasks", "CI verde, aguardando você"). Cor só com significado: **neutro** (Planejada, Com spec, Excluída riscada, Liberada com ícone de confirmado em cinza claro, sem verde), **azul** (Em execução, Em revisão, Em Entrega: o que anda) e **âmbar** (Pronta para Entrega e Aguardando liberação: esperam uma ação sua; depois do prazo de 30 dias o tempo fica em âmbar forte, sem bloquear nada). Fatia sem flag leva o selo de cadeado "sem flag" e a caixa de seleção travada.

### Seletor com busca (signature)
Para escolher entre muitas opções (a lista de Aplicações chega a 50): botão que mostra a escolha ("Todas as aplicações", "Valuto", "Valuto +2") e abre um popover com campo de busca, grupo **Recentes**, itens com caixa de seleção e contagem, no máximo 8 por vez e a dica "digite para refinar". Nunca um `select` com a lista inteira.

### Paginação com janela
Anterior e próxima, página atual em azul e uma janela `1 2 … 5 6 7 … 59 60`, mais "Ir para" a página e "Por página" (5, 8, 10, 20, 50, 100). A seleção feita numa página continua marcada nas outras.

### Gaveta de decisão e de Liberação
Mesma gaveta lateral, com o corpo rolável e um rodapé de ações fixo: Reprovar ou Excluir à esquerda, a ação principal à direita. A Liberação mostra as Notas de entrega em texto de produto, as Fatias com caixa por Fatia e os links do GitLab (issue, MR, commit; só o que ainda existe), a ordem API e depois front, e o **Liberar selecionadas**. **Abaixo de 760 px a gaveta vira folha embaixo da tela**, com cantos de 16 px, botões de 52 px lado a lado e o motivo da autoaprovação quando o MOR abriu a Entrega. O e-mail leva por link a essa folha, nunca aprova sozinho.

## Do's and Don'ts

### Do:
- **Do** use o Azul Esteira (#0a4ee4) só em ação principal, seleção e marca.
- **Do** coloque as ações de um bloco fora dele, no canto inferior direito, com Reprovar/Cancelar à esquerda da principal.
- **Do** explique um botão desativado no `title`.
- **Do** mande avisos para o sino do topo e históricos para a Auditoria (link "ver na auditoria", já filtrado).
- **Do** pagine listas e mantenha cada linha curta; detalhe no hover ou na gaveta.
- **Do** escreva versões, hashes, caminhos e IDs em Geist Mono.
- **Do** mostre a versão de uma Entrega como **prevista**: o número definitivo só nasce na confirmação em produção.
- **Do** deixe a evidência na frente de quem decide, inclusive na folha do celular.

### Don't:
- **Don't** comunique estado só por cor.
- **Don't** mostre histórico de alterações dentro da tela de trabalho.
- **Don't** escreva texto explicativo ao lado de botão.
- **Don't** use verde × vermelho como par de séries em gráfico.
- **Don't** use o tema de fábrica do spartan nem classe de fábrica do Tailwind sem token por trás.
- **Don't** abra campos de edição dentro de tabela de leitura; edição de cadastro é na gaveta.
- **Don't** use "candidata", "rc", "DEV" nem "AET" em tela: são do modelo antigo (ADR-0021 a 0025).
- **Don't** aprove nada direto pelo e-mail: ele só leva à tela de decisão.
