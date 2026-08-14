# ADR 0005 — Fonte de verdade da classificação

## Contexto

O schema possuía uma tabela `standings` com contadores de vitórias, derrotas e partidas, mas nenhum fluxo de runtime lia ou atualizava esses valores. A classificação exposta pela API já era calculada a partir de partidas finalizadas e do resultado persistido no snapshot de cada participante.

Manter contadores sem mecanismo de atualização criava uma segunda fonte de verdade aparente e sujeita a divergência.

## Decisão

`matches` finalizadas e os respectivos registros de `match_players`, especialmente `result` e `nickname_snapshot`, são a única fonte de verdade da classificação. O endpoint agrega esses snapshots em leitura.

A tabela legada é removida por migration. Para evitar perda silenciosa, a migration aborta se encontrar qualquer linha nela. O rollback recria a estrutura, a unicidade por liga/usuário e o RLS, mas não inventa dados que nunca foram canônicos.

## Consequências

- Não existem contadores independentes para reconciliar.
- Correções administrativas de partida continuam refletidas pela mesma fonte transacional.
- O custo da agregação deve ser medido com histórico representativo antes de introduzir cache ou materialização; qualquer projeção futura será explicitamente derivada e reconstruível.
