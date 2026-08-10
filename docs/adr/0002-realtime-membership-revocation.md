# ADR 0002 — Revogação de membership no realtime

- Status: Aceito
- Data: 2026-08-10

## Contexto

Socket.IO consultava membership somente no evento de entrada em uma room. Uma conexão que já estivesse em rooms de liga ou lobby continuava recebendo eventos após a remoção do usuário da liga.

## Decisão

Manter no processo da API um índice `userId → socketIds` e, para cada socket, os grants de liga e de lobby com sua liga proprietária. Após o commit da remoção de membro, todas as conexões desse usuário são retiradas da room da liga e das rooms de suas lobbies antes da emissão de atualização. Após excluir uma liga, todos os grants associados são removidos.

A entrada e o reconnect continuam consultando membership no PostgreSQL. O índice é apenas um mecanismo de revogação ativa e nunca concede acesso.

## Alternativas consideradas

- Revalidar membership antes de toda emissão: aumenta consultas e latência proporcionalmente a eventos e destinatários, além de exigir emissão individualizada.
- Desconectar o socket inteiro: simples, mas interrompe rooms válidas de outras ligas e piora múltiplas abas.
- Expulsar somente da room da liga: deixaria rooms de lobby acessíveis.

## Consequências

A solução é simples e de custo proporcional apenas a conexões do usuário na revogação. Todas as abas são tratadas sem perder outras ligas. Em implantação com múltiplas instâncias, o índice e a expulsão precisam migrar para um adapter compartilhado do Socket.IO, como Redis, antes de habilitar scale-out horizontal.
