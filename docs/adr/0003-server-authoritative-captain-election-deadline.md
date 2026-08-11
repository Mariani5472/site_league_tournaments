# ADR 0003 — Deadline autoritativo da eleição de capitães

- Status: Aceito
- Data: 2026-08-11

## Contexto

A eleição de capitães dependia de um cliente chamar `finalizeCaptains` depois do cronômetro. Sem clientes conectados, a lobby podia permanecer indefinidamente com uma eleição vencida. O relógio do navegador também não é uma fonte confiável para uma transição de domínio.

## Decisão

Adotar uma estratégia híbrida, baseada no deadline persistido em `lobbies.captain_vote_ends_at`:

- o backend calcula e persiste o deadline com seu relógio ao abrir a eleição;
- leituras e mutações relevantes executam uma finalização lazy quando o deadline venceu;
- um worker periódico busca eleições vencidas, inclusive quando não há clientes ativos;
- a finalização abre uma transação, bloqueia a linha da lobby com `FOR UPDATE`, revalida estado e deadline e inicializa o draft na mesma transação;
- eventos Socket.IO são emitidos somente depois do commit.

O timer periódico é apenas um gatilho. A fonte de verdade é o PostgreSQL, portanto restart não perde deadlines. Em múltiplas instâncias, todas podem varrer eleições vencidas: o lock e a revalidação tornam a operação idempotente.

## Alternativas consideradas

- Somente finalização lazy: correta quando existe atividade, mas não atende à finalização sem cliente ativo.
- Timer em memória por lobby: tem baixa latência, porém perde agendamentos em restart e exige coordenação adicional em scale-out.
- Fila/job scheduler externo: apropriado para escala maior, mas adiciona infraestrutura sem necessidade atual.

## Consequências

Reconnect e reads observam o estado reconciliado. Chamadas simultâneas não criam dois drafts. O intervalo do worker pode acrescentar poucos segundos à transição sem clientes, enquanto qualquer read/mutation elimina essa espera. O relógio é injetável nos serviços e workers para testes determinísticos.
