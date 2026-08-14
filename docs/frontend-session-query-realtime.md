# Política de sessão, Query e realtime

## Propriedade e ciclo de vida

`AuthProvider` é o owner da sessão no React. Ele registra um único `onAuthStateChange` durante o mount, cancela a inscrição no cleanup e entrega cada sessão ao `SessionLifecycle`. Não deve existir listener de autenticação em módulos singleton.

Ao trocar o `user.id`, ou depois que o logout Supabase foi confirmado, a ordem obrigatória é:

1. desconectar o Socket.IO e remover suas credenciais;
2. cancelar queries em andamento;
3. limpar integralmente o `QueryClient`;
4. somente então conectar o socket da nova identidade, quando houver.

A limpeza integral é intencional: atualmente todos os dados consultados dentro da aplicação autenticada podem conter projeções privadas. Dados públicos são refetched depois da troca, em vez de arriscar mistura entre identidades.

## Falha de logout

O logout tenta primeiro revogar globalmente as sessões no Supabase. Se a chamada remota falhar, o cliente executa `signOut({ scope: "local" })` para remover explicitamente a sessão persistida neste navegador. Somente depois dessa confirmação local a UI fica anônima e socket/cache são limpos. Nesse caso, a tela de login avisa que outras sessões podem permanecer ativas. Em um reload, `getSession()` retorna `null`, portanto a aplicação continua anônima.

Se tanto a tentativa global quanto a remoção local falharem, a operação é bloqueante: usuário, socket e cache permanecem autenticados, nenhuma navegação ocorre e a tela solicita nova tentativa. Assim, a UI nunca declara logout enquanto uma sessão persistida ainda pode ser recuperada.

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

`MatchVoting` não faz polling enquanto o Socket.IO está conectado: eventos `match:vote` e `match:finished` invalidam o detalhe imediatamente, e o reconnect invalida todos os matches ativos. Durante desconexão do Socket.IO, a query usa polling de 15 segundos como fallback temporário. Voltar o foco à janela também refaz a query do match, independentemente do estado realtime.
