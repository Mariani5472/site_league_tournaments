# Política de sessão, Query e realtime

## Propriedade e ciclo de vida

`AuthProvider` é o owner da sessão no React. Ele registra um único `onAuthStateChange` durante o mount, cancela a inscrição no cleanup e entrega cada sessão ao `SessionLifecycle`. Não deve existir listener de autenticação em módulos singleton.

Ao fazer logout ou trocar o `user.id`, a ordem obrigatória é:

1. desconectar o Socket.IO e remover suas credenciais;
2. cancelar queries em andamento;
3. limpar integralmente o `QueryClient`;
4. somente então conectar o socket da nova identidade, quando houver.

A limpeza integral é intencional: atualmente todos os dados consultados dentro da aplicação autenticada podem conter projeções privadas. Dados públicos são refetched depois da troca, em vez de arriscar mistura entre identidades.

`SocketSessionOwner` é o único responsável por credenciais, connect, disconnect e reconnect. Os hooks de liga/lobby possuem apenas listeners e rooms da tela e continuam obrigados a executar `off` e `leave` no cleanup.

## Defaults do TanStack Query

- `staleTime`: 30 segundos.
- `gcTime`: 5 minutos.
- Queries falhas: uma tentativa adicional.
- Mutations: sem retry automático, evitando repetir comandos.
- Reconnect de rede: refetch de queries stale/ativas.
- Foco da janela: sem refetch automático; Socket.IO e invalidações explícitas fazem a reconciliação.

Queries particulares podem sobrescrever esses valores quando documentarem a razão, como configurações praticamente estáticas.

## Invalidações

Eventos Socket.IO invalidam somente as query keys do recurso/liga indicada no payload. Mutations invalidam detail e coleções afetadas. O prefixo raiz `queryKeys.leagues.all` não deve ser usado para mutations comuns; limpeza ampla fica reservada à troca/logout da sessão.

No reconnect, hooks ativos entram novamente nas rooms e invalidam suas projeções para reconciliar eventos que possam ter ocorrido durante a desconexão.
