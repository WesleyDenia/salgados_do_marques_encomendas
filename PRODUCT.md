# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Administradores e equipa operacional dos Salgados do Marquês, em contexto de balcão e preparação, que precisam de criar, consultar e gerir encomendas sem perder visibilidade sobre a carga de trabalho.

## Product Purpose

O painel centraliza a operação de encomendas: registo, pesquisa, clientes, planeamento, capacidade de fritura e configurações. O sucesso é permitir à equipa confirmar rapidamente o que há para preparar, quando e para quem.

## Positioning

Uma área operacional ligada ao backend do negócio que combina a encomenda individual com a capacidade de preparação e a ocupação dos slots de recolha.

## Operating Context

Uso diário em computador e, quando necessário, em ecrãs mais pequenos. A equipa alterna entre criação de encomendas, consulta de listas, confirmação de recolhas e planeamento de períodos e capacidade.

## Capabilities and Constraints

- A aplicação é uma app web Next.js autenticada, com regras operacionais no backend.
- Os fluxos existentes de encomendas, clientes, planeamento, capacidade, auditoria e definições devem ser preservados.
- A interface deve tornar listas, estados e prioridades mais fáceis de percorrer, sem alterar os contratos de dados nem as integrações.
- Este registo foi inferido do pedido e da base de código; detalhes de papéis operacionais além de administrador permanecem em aberto.

## Brand Commitments

Salgados do Marquês é a marca exibida no painel. A interface deve transmitir controlo, rapidez e confiança operacional, sem transformar o ambiente de trabalho numa experiência promocional.

## Evidence on Hand

- Rotas e componentes existentes em `src/app/(shell)` e `src/features/`.
- Dados operacionais reais são carregados através da fronteira local `/api/v1`.
- Não há logótipo nem guia visual de marca dedicado no repositório.

## Product Principles

- Priorizar a leitura do trabalho pendente e das exceções.
- Tornar ações frequentes rápidas e previsíveis.
- Manter estados operacionais explícitos e consistentes.
- Usar uma linguagem visual densa, calma e adequada a trabalho repetido.
