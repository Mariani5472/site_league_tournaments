# ADR 0004 — Constraints para invariantes estáveis de domínio

- Status: Aceito
- Data: 2026-08-11

## Decisão

O PostgreSQL passa a impedir quatro estados que nunca são válidos no domínio:

- `riot_accounts.user_id` é único porque a integração representa no máximo um vínculo Riot por usuário;
- `matches.status` aceita somente `in_game`, `finished` ou `cancelled`, os estados compreendidos pela máquina de partidas;
- `lobby_draft_picks.team_number` aceita somente `1` ou `2`, pois o draft sempre produz exatamente esses dois lados;
- `lobbies.max_players` deve ser par e estar entre 2 e 10, igual ao contrato público e às regras de balanceamento/start.

Não foi criado trigger para relacionar `lobbies.max_players` com `leagues.max_players`: a capacidade da liga representa membros cadastrados, enquanto a lobby pode usar apenas parte deles. Também não restringimos `pick_number` porque números negativos identificam capitães e esse protocolo interno pode evoluir.

## Dados existentes

A migration preserva apenas a linha Riot verificada/mais recente quando encontra vínculos duplicados. Status legados de partidas são reconstruídos como `finished` quando existe resultado/timestamp de término e como `in_game` nos demais casos. Times inválidos de draft são recuperados a partir de `lobby_players` quando possível.

Lobby com limite inválido ou draft ainda ambíguo não é alterado silenciosamente: a migration falha com `23514`, permitindo correção explícita antes de uma nova execução.

## Contrato da API

O middleware traduz unique violation (`23505`) em `409 CONFLICT` e check violation (`23514`) em `400 BAD_REQUEST`, sem expor SQL. Schemas e services continuam responsáveis por mensagens específicas antes do banco; constraints são a última barreira para concorrência e caminhos alternativos.
