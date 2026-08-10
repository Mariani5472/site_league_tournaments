# ADR 0001 — Owner canônico da liga

- Status: Aceito
- Data: 2026-08-10

## Contexto

O schema mantém `leagues.owner_id` e também o papel `owner` em `league_members`. A aplicação atual usa ambos: o primeiro identifica o proprietário da entidade e o segundo participa da matriz de autorização. Sem uma garantia no PostgreSQL, SQL manual ou um bug poderia criar dois owners, nenhum owner ou apontar `owner_id` para um membro com outro papel.

## Decisão

`leagues.owner_id` é a única fonte canônica de identidade do owner. A linha correspondente em `league_members` é uma projeção obrigatória para autorização e deve ter `role = 'owner'`.

O banco reforça essa decisão com:

1. índice parcial único `unique_owner_per_league`, que impede mais de uma linha `owner` por liga;
2. constraint triggers `DEFERRABLE INITIALLY DEFERRED`, que exigem no commit exatamente uma linha owner e correspondência com `leagues.owner_id`;
3. preflight na migration, que lista os IDs inconsistentes e aborta antes de instalar qualquer objeto;
4. transferência no service dentro de uma única transação, sob lock da liga.

Triggers diferíveis são necessários porque criação e transferência possuem estados intermediários: a liga é inserida antes do membro inicial; na transferência, o owner anterior é rebaixado antes da promoção e da atualização de `owner_id`. Apenas o estado no commit precisa satisfazer a invariante.

## Alternativas consideradas

- Somente índice parcial: impede dois owners, mas permite zero owner ou divergência com `owner_id`.
- FK simples: garante que `owner_id` seja membro, mas não que possua papel owner nem que seja o único.
- Remover `owner` de `league_members` e derivá-lo em todas as consultas: elimina duplicação, porém exige uma remodelagem ampla da autorização. Pode ser reconsiderado futuramente; o custo e o risco não se justificam para corrigir a invariante atual.

## Consequências

SQL acidental incompatível falha com `23505` ou `23514`. Criação e transferência precisam ocorrer em transação. Cargas e migrations devem preservar a projeção owner. A baseline Supabase contém os mesmos índices, funções e triggers e sua equivalência é verificada pelo CI.
