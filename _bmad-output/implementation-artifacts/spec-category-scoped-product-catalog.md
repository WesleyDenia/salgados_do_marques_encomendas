---
title: 'Carregar o catálogo operacional por categoria'
type: 'bugfix'
created: '2026-11-11'
status: 'done'
baseline_commit: '24423827227bbf9c2cdea91f8adbc890b19ac48f'
context:
  - '/home/oem/Workspace/salgados-encomendas/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A criação e edição de encomendas obtém uma página global de produtos e apenas depois separa os itens por categoria no navegador. A API usa 15 itens como paginação geral por omissão; com 18 artigos ativos, cinco artigos da categoria “Minis Porções” são divididos entre a primeira e a segunda página e só dois são apresentados.

**Approach:** Carregar as categorias separadamente e, ao selecionar uma delas, solicitar à API somente os respetivos artigos através de `category_id`. A aplicação deve pedir e o endpoint público de produtos deve assumir 100 itens por página, para que uma categoria não volte a ficar incompleta quando o chamador não declarar o tamanho da página.

## Boundaries & Constraints

**Always:** Manter a autenticação e o proxy `/api/v1` existentes; enviar `category_id` e `per_page=100` ao pedir artigos de uma categoria; usar o endpoint existente `GET /categories` para construir os separadores; considerar apenas categorias e produtos ativos no compositor; preservar a consulta global de produtos usada noutros ecrãs, agora também com `per_page=100`; manter o contrato dos recursos e a validação de encomendas no backend.

**Ask First:** Alterar o limite acima de 100, introduzir paginação visível na interface, mudar a ordenação administrativa ou alterar dados/categorias de produção.

**Never:** Buscar todos os produtos para depois filtrar a categoria no navegador do compositor; alterar artigos, categorias ou encomendas existentes; remover a consulta por identificador de produto usada pelo modal; alterar a paginação por omissão de recursos não relacionados (encomendas, utilizadores, cupões ou lojas).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Categoria com mais de 15 artigos | Categoria ativa selecionada; 18+ artigos no catálogo total | O pedido usa `category_id` e `per_page=100`; todos os artigos ativos daquela categoria são mostrados | Mantém a mensagem de falha de catálogo se a API rejeitar a consulta |
| Categoria ativa sem artigos | Categoria devolvida por `GET /categories`, sem produtos ativos | O separador continua disponível e apresenta o estado “Não há artigos disponíveis” | Não cria artigo nem bloqueia as restantes categorias |
| Chamador não declara paginação | `GET /products` sem `per_page` | A API de produtos devolve até 100 artigos em vez de 15 | A paginação explícita continua a ter precedência |
| Categoria/produto inativo | Recurso devolvido com `active=false` | Não é disponibilizado para criar uma nova encomenda | Itens históricos não são alterados |

</frozen-after-approval>

## Code Map

- `src/features/orders/api.ts` -- contratos, normalização e pedidos do catálogo operacional.
- `src/features/orders/hooks/use-order-queries.ts` -- chaves e hooks React Query para categorias e produtos por categoria.
- `src/features/orders/components/order-composer-page.tsx` -- seleção de categoria e grelha de artigos na criação/edição de encomendas.
- `tests/unit/use-create-order.test.ts` -- verificação dos parâmetros enviados à API e normalização do catálogo.
- `/home/oem/Workspace/salgados-api/app/Repositories/BaseRepository.php` -- paginação base da API Laravel.
- `/home/oem/Workspace/salgados-api/app/Repositories/ProductRepository.php` -- lista pública de produtos, incluindo o filtro `category_id` já suportado.
- `/home/oem/Workspace/salgados-api/tests/Feature/ProductApiFlavorTest.php` -- padrão de testes autenticados para o endpoint de produtos.

## Tasks & Acceptance

**Execution:**

- [x] `src/features/orders/api.ts` e `src/features/orders/hooks/use-order-queries.ts` -- acrescentado recurso/hook de categorias, suporte para categoria opcional e paginação explícita de 100.
- [x] `src/features/orders/components/order-composer-page.tsx` -- separadores construídos a partir das categorias ativas e grelha carregada pela categoria selecionada, com estados de carregamento e erro.
- [x] `tests/unit/use-create-order.test.ts` -- cobertos os parâmetros `per_page=100`, a ausência/presença de `category_id` e a normalização de categorias.
- [x] `/home/oem/Workspace/salgados-api/app/Repositories/BaseRepository.php` e `app/Repositories/ProductRepository.php` -- introduzida predefinição específica de 100 para produtos; restantes recursos mantêm 15.
- [x] `/home/oem/Workspace/salgados-api/tests/Feature/ProductApiFlavorTest.php` -- comprovados paginação padrão de 100, tamanho explícito e filtro por categoria.

**Acceptance Criteria:**

- Given 18 produtos ativos distribuídos por categorias, when o operador abre uma nova encomenda, then a categoria “Minis Porções” apresenta os seus cinco artigos, sem depender de quais artigos aparecem na primeira página global.
- Given uma categoria é selecionada, when a consulta é enviada, then contém `category_id` dessa categoria e `per_page=100`.
- Given um consumidor usa `GET /products` sem `per_page`, when existem até 100 artigos elegíveis, then recebe todos numa só página; given `per_page=15`, then a API respeita 15.
- Given uma categoria ou um produto está inativo, when o compositor é aberto, then não pode ser usado para iniciar um novo item.
- Given outros ecrãs continuam a usar a consulta global de produtos, when fazem a consulta, then recebem no máximo 100 produtos e não alteram os seus contratos normalizados.

## Spec Change Log

## Design Notes

O backend já aplica `where('category_id', $cid)` em `ProductRepository::publicList()` quando recebe `category_id`; a falha é o painel não usar esse contrato e a omissão de `per_page`. A alteração deve reutilizar esse filtro, não criar uma rota nova. A paginação de 100 será específica ao catálogo de produtos: aumentar a predefinição global mudaria sem necessidade os limites de outros recursos administrativos.

O modal de configuração continua a carregar o detalhe do produto por ID. Assim, dados como variações e sabores permanecem confirmados pela API mesmo que a lista de uma categoria seja atualizada em segundo plano.

## Verification

**Commands:**

- `pnpm test -- tests/unit/use-create-order.test.ts` -- esperado: testes de parâmetros e normalização aprovados.
- `pnpm lint` -- esperado: sem erros ESLint.
- `pnpm build` -- esperado: build Next.js concluído.
- `php artisan test --filter=ProductApiFlavorTest` -- executar em `/home/oem/Workspace/salgados-api`; esperado: paginação e filtro público de produtos aprovados.

## Suggested Review Order

**Consulta por categoria**

- A entrada cria consultas paginadas e acrescenta o filtro apenas quando há categoria.
  [api.ts:513](../../src/features/orders/api.ts#L513)

- As chaves isolam o cache de cada categoria e evitam resultados cruzados.
  [use-order-queries.ts:36](../../src/features/orders/hooks/use-order-queries.ts#L36)

- O compositor constrói separadores ativos e carrega só a categoria selecionada.
  [order-composer-page.tsx:475](../../src/features/orders/components/order-composer-page.tsx#L475)

- O catálogo carregado conserva detalhes para editar itens entre trocas de categoria.
  [order-composer-page.tsx:610](../../src/features/orders/components/order-composer-page.tsx#L610)

**Predefinição da API**

- A paginação base aceita um limite específico sem afetar os restantes recursos.
  [BaseRepository.php:16](../../../salgados-api/app/Repositories/BaseRepository.php#L16)

- A lista pública de produtos aplica 100 por omissão e reutiliza o filtro existente.
  [ProductRepository.php:16](../../../salgados-api/app/Repositories/ProductRepository.php#L16)

**Cobertura**

- Os pedidos do painel verificam categoria opcional e paginação explícita.
  [use-create-order.test.ts:261](../../tests/unit/use-create-order.test.ts#L261)

- A API verifica limite padrão, substituição explícita e cinco artigos numa categoria.
  [ProductApiFlavorTest.php:17](../../../salgados-api/tests/Feature/ProductApiFlavorTest.php#L17)

