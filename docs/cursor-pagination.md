# Paginação por cursor

As coleções crescentes de descoberta de ligas, membros, solicitações de entrada e partidas aceitam os parâmetros `limit` e `cursor`.

- `limit` é opcional, usa 50 por padrão e aceita no máximo 100 itens;
- a resposta tem o formato `{ "items": [...], "nextCursor": "uuid | null" }`;
- a ordenação é determinística por `id DESC`;
- para continuar, repita os mesmos filtros e envie `nextCursor` como `cursor`;
- `nextCursor: null` indica o fim da coleção.

Os endpoints paginados são `GET /leagues/discover`, `GET /leagues/:leagueId/members`, `GET /leagues/:leagueId/requests` e `GET /leagues/:leagueId/matches`.
