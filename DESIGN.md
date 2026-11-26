---
name: Salgados Encomendas
description: Sistema visual compacto para operação de encomendas e produção.
colors:
  ink-blue: "oklch(0.19 0.035 255)"
  operational-blue: "oklch(0.34 0.09 250)"
  cool-paper: "oklch(0.975 0.007 245)"
  cool-paper-depth: "oklch(0.96 0.012 245)"
  panel-white: "oklch(0.997 0.002 245)"
  amber-signal: "oklch(0.72 0.15 80)"
  amber-selection: "oklch(0.78 0.13 82 / 55%)"
  focus-blue: "oklch(0.52 0.11 250)"
  state-danger: "oklch(0.54 0.2 28)"
  divider: "oklch(0.87 0.014 245)"
typography:
  body:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  compact:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
  micro:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
  title:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    letterSpacing: "-0.03em"
rounded:
  control: "0.625rem"
  surface: "0.875rem"
spacing:
  compact: "0.75rem"
  standard: "1rem"
  section: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.operational-blue}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.control}"
    height: "2rem"
  panel:
    backgroundColor: "{colors.panel-white}"
    rounded: "{rounded.surface}"
    padding: "1.25rem"
---

# Design System: Salgados Encomendas

## Overview

**Creative North Star: "O registo de produção legível"**

O painel é uma superfície de trabalho, não uma vitrina. A informação é densa mas calma: o azul-tinta dá continuidade à navegação, o papel frio reduz a fadiga e os sinais de estado têm cor apenas quando carregam significado. A hierarquia começa pela tarefa e pelo estado operacional, nunca pela decoração.

Key characteristics:

- Navegação escura, conteúdo claro e dados compactos.
- Uma superfície principal de painel por área, com divisores e tonalidades antes de mais cartões.
- Estados importantes codificados com cores sem depender apenas delas.

## Colors

A paleta usa azul-tinta para estrutura, azul operacional para ação e sinais âmbar, esmeralda e vermelho exclusivamente para prioridade e estado.

### Primary

- **Operational Blue** (`oklch(0.34 0.09 250)`): ações primárias, foco e seleção.
- **Ink Blue** (`oklch(0.19 0.035 255)`): rail de navegação e métricas de maior prioridade.

### Secondary

- **Amber Signal** (`oklch(0.72 0.15 80)`): estado ativo no rail e atenção operacional.

### Neutral

- **Cool Paper** (`oklch(0.975 0.007 245)`): fundo de trabalho.
- **Cool Paper Depth** (`oklch(0.96 0.012 245)`): início da transição discreta do fundo.
- **Panel White** (`oklch(0.997 0.002 245)`): superfícies de conteúdo.
- **Divider** (`oklch(0.87 0.014 245)`): grelha subtil, limites de tabelas e campos.

**The Meaningful Color Rule.** Cores de estado aparecem apenas para ação, seleção, capacidade ou exceção; não são ornamento.

## Typography

**Body Font:** Geist, com fallback sans-serif.

**Character:** Uma única família de interface, com contraste por peso e escala. Métricas usam algarismos tabulares para permitir varrimento vertical sem saltos visuais.

### Hierarchy

- **Title** (600, 1.875rem, tracking -0.03em): títulos de área.
- **Section title** (600, 1.125rem): títulos de painéis.
- **Body** (400, 0.875rem, line-height 1.5): descrição e valores de suporte.
- **Label** (600, 0.75rem, uppercase, tracking 0.12em): cabeçalhos de tabela e nomes de campos.
- **Micro label** (600, 0.6875rem): rótulos auxiliares no rail de navegação.

## Layout

O conteúdo tem limite de 1600px, padding de 16px em ecrãs pequenos e 32px em desktop. As áreas operacionais usam grelhas de 2 e 4 colunas que se tornam pilhas em larguras menores. O ritmo normal é 12px dentro de grupos compactos, 16px entre elementos relacionados e 20px entre secções.

## Elevation & Depth

A profundidade é predominantemente tonal: fundo frio, painel branco e divisores precisos. As superfícies operacionais usam uma sombra ambiente baixa (`0 10px 28px -24px`) para separar o conteúdo sem criar uma parede de cartões flutuantes.

## Shapes

Controlos usam raio de 10px; superfícies e painéis usam 14px. Chips são a única forma totalmente arredondada e são reservados para estados curtos. Bordas são finas, em vez de pesadas ou duplicadas com sombra.

## Components

### Buttons

- **Primary:** azul operacional, texto claro, altura compacta para uso frequente.
- **Outline / ghost:** usados para ações secundárias; o hover muda a superfície, não a função.
- **Focus:** anel azul visível de 2px com offset.

### Cards / Containers

- **Style:** painel branco com borda neutra e sombra ambiente discreta.
- **Use:** agrupar um bloco de trabalho; não empilhar painéis dentro de painéis sem necessidade.

### Inputs / Fields

- **Style:** fundo claro, borda neutra, raio de controlo e label operacional curto.
- **Focus:** borda e anel em azul operacional.

### Tables

- **Style:** cabeçalhos em maiúsculas compactas, linhas de 44–48px e zebra subtil.
- **State:** hover azul claro e seleção azul claro mais forte.

### Navigation

- **Style:** rail azul-tinta, item ativo âmbar e texto de alto contraste.
- **Responsive:** sheet lateral no móvel; mesmos itens e estados que no desktop.

## Do's and Don'ts

### Do:

- **Do** usar a cor para comunicar prioridade, seleção e estado.
- **Do** apresentar dados transacionais em tabelas ou listas com divisores e zebra subtil.
- **Do** manter ações frequentes no mesmo vocabulário de botões em todas as rotas.

### Don't:

- **Don't** preencher cada área com cartões brancos idênticos.
- **Don't** usar sombras pesadas, gradientes decorativos ou animações de entrada em fluxos operacionais.
- **Don't** esconder um estado operacional apenas numa cor; preservar sempre a etiqueta textual.
