# ADR 0005 — Aceitação dos times não equivale a prontidão

- Status: Aceito
- Data: 2026-08-11

## Decisão

`team_selection_completed` representa exclusivamente que a composição dos times foi concluída ou aceita. `lobby_players.is_ready` representa exclusivamente a confirmação individual de que o jogador está pronto para iniciar.

Random, balanced e player picks seguem a mesma regra: toda atribuição, reroll ou conclusão de draft mantém ou redefine `is_ready=false`. Depois de `team_selection_completed=true`, cada jogador precisa executar explicitamente a ação de ready. A partida só pode iniciar quando todos estiverem prontos.

## Razões

Consenso coletivo sobre equilíbrio/composição e disponibilidade individual para começar são decisões diferentes. Separá-las evita início inesperado após o sexto voto e torna o estado exibido igual em todos os métodos.

## UX

Após a seleção, a interface informa que aceitar os times não confirma prontidão, mostra a contagem atual e apresenta a ação “Confirmar prontidão”. O frontend apenas representa `team_selection_completed`, `readyCount` e `currentPlayer.isReady` retornados pelo backend.
