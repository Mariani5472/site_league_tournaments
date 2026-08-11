# Estratégia de testes do frontend

## Princípios

Os testes verificam comportamento observável: conteúdo, navegação, permissões e ações do usuário. Não usamos snapshots amplos, detalhes internos do React nem meta de cobertura percentual.

O harness em `web/src/test/renderApp.tsx` fornece `MemoryRouter`, `QueryClient` isolado e `AuthContext`. Cada teste cria seu próprio cache, e o setup executa cleanup após cada caso. Queries e mutations não fazem retry no ambiente de teste.

## Regressões iniciais

- AuthProvider: login, `/auth/sync`, logout, sync parcial falhando, troca de conta, cache e unsubscribe.
- Rotas protegidas: loading, redirect anônimo e conteúdo autenticado.
- LeaguePage: loading, erro recuperável, coleções vazias e requests somente para admin.
- Lobby: times aceitos versus ready, bloqueio durante seleção, ready e troca de time.
- TeamSelection: instrução e contagem de prontidão.
- MatchVoting: loading, voto atual, mudança de voto e ausência de controles administrativos sem permissão.

Services externos são mockados na fronteira do componente. Componentes filhos são substituídos apenas quando o teste pertence à página e precisa observar composição/permissão, não detalhes visuais desses filhos.

## Execução

Localmente, em `web`: `npm test`. O workflow `Application tests` executa `npm ci`, testes, build e lint em todo push/PR relevante.
