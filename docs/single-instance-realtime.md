# Restrição single-instance do realtime

## Estado atual

A API suporta exatamente uma instância. `SocketAccess` mantém grants e o índice usuário → sockets na memória do processo. Remover um membro ou excluir uma liga revoga corretamente todas as conexões presentes nessa instância, mas não existe adapter, pub/sub ou índice compartilhado capaz de alcançar sockets de outro processo.

O `render.yaml` fixa `numInstances: 1`, `INSTANCE_COUNT=1` e `REALTIME_REVOCATION_MODE=local`. Na inicialização, `validateTopology()` recusa `INSTANCE_COUNT > 1`; o valor `distributed` também é recusado porque ainda não há implementação compatível. Não habilite autoscaling no painel do Render, pois o campo `scaling` teria precedência sobre `numInstances`.

Após sincronizar o Blueprint, confira no painel/API do Render que autoscaling está desabilitado e o número manual de instâncias é 1. Essa verificação faz parte da revisão de qualquer mudança de infraestrutura.

## Gate para scale-out

Escala horizontal só pode ser habilitada em uma mudança única que:

1. adicione um adapter compartilhado do Socket.IO e um canal autenticado de revogação de membership/liga;
2. mantenha grants ou revalide autorização em armazenamento compartilhado;
3. trate reconnect durante e depois da revogação;
4. prove com duas instâncias que uma remoção processada na instância A expulsa o socket conectado na B e impede novo join;
5. altere `validateTopology()` para aceitar `distributed` somente quando toda a infraestrutura necessária estiver configurada;
6. só então altere `numInstances` ou adicione `scaling` no Blueprint.

Escala vertical (trocar CPU/memória da única instância) permanece segura e não exige essa estratégia.
