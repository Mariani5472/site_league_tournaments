# Auditoria arquitetural — Fase 0

Data da revisão: 2026-08-10  
Escopo: `api/src`, `api/migrations`, `api/supabase/migrations`, `api/tests` e `web/src`.  
Regra desta fase: nenhum comportamento foi alterado. Este documento registra o estado encontrado.

## Resumo executivo

A aplicação é um monólito modular com API Express/PostgreSQL/Socket.IO e SPA React/TanStack Query. A direção predominante é `route → middleware → controller → service → repository/PostgreSQL`; porém, os services frequentemente executam SQL diretamente, e algumas regras ainda estão divididas entre service, repository e constraints. REST é a fonte de verdade; Socket.IO sinaliza invalidações.

Há proteções importantes já implementadas: criação atômica de liga e owner, bloqueio da liga em entradas/aprovações, bloqueio da lobby na última vaga e no início, snapshot transacional de partidas, votação idempotente, finalização condicional única e FK composta `match(lobby_id, league_id)`. A suíte possui 19 testes de integração de domínio.

Os riscos mais relevantes ainda abertos são:

1. `POST /users` não exige autenticação e permite criar perfis locais com identidade fornecida pelo cliente.
2. A listagem de membros não valida que o solicitante pertence à liga, inclusive em liga privada.
3. A criação administrativa de membro não bloqueia capacidade, não é transacional e permite ao owner criar outro `owner` sem atualizar `leagues.owner_id`.
4. Saída, cancelamento, troca de time e ready são operações compostas fora de transação; podem competir com início ou outras alterações.
5. A autorização de rooms Socket.IO é verificada somente ao entrar; revogar/remover o membro não o expulsa da room já aberta.
6. Existem dois históricos de schema (`node-pg-migrate` e baseline Supabase) sem verificação automática de equivalência.
7. Não há testes automatizados do frontend, dos controllers HTTP completos, nem do transporte Socket.IO real.

## Mapa da API

```text
API
├── routes/index.ts
├── modules
│   ├── auth
│   ├── users
│   ├── profile
│   ├── riot
│   ├── leagues
│   ├── league-members
│   ├── league-requests
│   ├── lobbies
│   └── matches
├── controllers       (dentro de cada módulo)
├── services          (dentro de cada módulo)
├── repositories      (dentro de cada módulo)
├── database
│   ├── connection.ts
│   └── seed-development.ts
├── middlewares
│   ├── auth.middleware.ts
│   ├── socket.middleware.ts
│   └── error.middleware.ts
├── websocket
│   ├── socket.ts
│   ├── socket-handlers.ts
│   ├── emitter.ts
│   └── socket-events.ts
└── integrations
    ├── Supabase Auth
    └── Riot opcional
```

### Camadas e responsabilidades

| Camada | Responsabilidade observada | Observação |
|---|---|---|
| Routes | Montagem de endpoints e autenticação | Quase todas as rotas privadas usam `authMiddleware`; `/users` e `/riot/config` são públicas. |
| Controllers | Extrair params/body, executar Zod em parte das rotas e definir status HTTP | Vários controllers passam `request.body` sem schema; validação é inconsistente. |
| Services | Autorização, regras de negócio, transações, emissão de eventos | É a camada principal de domínio, mas `LobbiesService` também agrega projeções e muito SQL. |
| Repositories | CRUD e consultas SQL | Alguns fluxos transacionais ignoram repositories e executam SQL direto no service. |
| PostgreSQL | FKs, unicidade, checks, índices parciais e serialização por locks | Nem todas as invariantes de domínio têm representação no banco. |
| Middlewares | Token Supabase, CORS, erros, limites e logs | Bom limite de JSON e redaction; erros SQL só tratam explicitamente `23505`. |
| Sockets | Autenticar conexão, autorizar entrada em rooms e emitir sinais | Não transportam estado; autorização não é reavaliada após entrada. |

## Auditoria por módulo da API

### Auth

**Responsabilidade:** validar a sessão no Supabase e sincronizar uma linha correspondente em `public.users`.

**Regras e localização:**

- Token é validado com `supabase.auth.getUser`: middleware HTTP e middleware Socket.IO.
- Perfil local é criado uma vez; nickname deriva do e-mail e recebe sufixo quando já existe: service.
- `users.id` e `users.nickname` são únicos: banco.

**Invariantes:** uma identidade Supabase deve corresponder a no máximo um perfil local; nickname é único.

**Race conditions/erros:** duas sincronizações do mesmo usuário são toleradas. Duas identidades diferentes com o mesmo nickname-base podem decidir simultaneamente que o nome está livre; uma falha em `23505` e não tenta novamente com sufixo. E-mail ausente no token é aceito pelo tipo do middleware, mas `sync` pressupõe string.

**Testabilidade:** service instancia repository concreto; teste de integração cobre sincronização e colisão comum, mas não colisão simultânea de usuários diferentes nem falha do Supabase.

### Users

**Responsabilidade:** CRUD mínimo para criação de usuário local.

**Regras e localização:** idempotência por `id` no service; unicidade no banco.

**Invariantes:** deveria existir apenas perfil correspondente a uma identidade autenticada.

**Problema:** `POST /users` é público e aceita id, e-mail e nickname fornecidos pelo cliente.

**Impacto:** criação arbitrária de perfis, reserva de nicknames e possível colisão/impersonação da identidade que posteriormente chegar do Supabase.

**Decisão:** remover a rota ou exigir autenticação e derivar `id/email` exclusivamente do token.

**Status:** Pending — crítico.

### Profile

**Responsabilidade:** consultar perfil próprio ou público e atualizar nickname/avatar/banner do usuário autenticado.

**Regras e localização:** update força `request.user.id` no controller; unicidade de nickname no banco.

**Invariantes:** somente o dono atualiza seu perfil.

**Race conditions/erros:** concorrência em nicknames termina em erro genérico `23505`. O repository usa `COALESCE` em URLs, portanto enviar `null` não limpa avatar/banner apesar do contrato aceitar `null`. O update não usa `profile.schemas.ts` no controller e pode receber tipos inválidos.

**Testabilidade:** sem testes de atualização, limpeza de campos, validação de URL/tamanho ou conflito de nickname.

### Riot

**Responsabilidade:** metadado opcional de conta Riot; leitura, vínculo via API Riot e desvínculo.

**Regras e localização:** configuração lazy e credenciais opcionais no config/service; unicidade de `puuid` no banco.

**Invariantes:** uma conta Riot não pode pertencer a dois usuários; pretendido um vínculo por usuário.

**Problemas:** não existe constraint `UNIQUE(user_id)` em `riot_accounts`; a proteção é somente check-then-insert no service e sofre race. Erros de conta duplicada usam `Error`, resultando em HTTP 500 em vez de conflito de domínio. Dependência opcional aumenta superfície e quantidade de estados.

**Status:** Resolvido — índice único em `riot_accounts.user_id`; duplicidades legadas são normalizadas deterministicamente pela migration. Violações concorrentes são traduzidas de `23505` para `409`.

### Leagues

**Responsabilidade:** criar, descobrir, listar, visualizar, atualizar, entrar e excluir ligas.

**Regras e localização:**

- Liga e owner inicial: uma transação no service.
- Entrada direta apenas para `public/open`, capacidade sob `FOR UPDATE`: service.
- Visibilidade/join policy/capacidade: Zod e checks do banco.
- Atualização só por owner/admin e sem reduzir abaixo dos membros: transação no service.
- Exclusão só por owner: service; cascade no banco.

**Invariantes:** liga tem owner canônico, capacidade 2–500, políticas válidas, membro único.

**Race conditions/erros:** create e join estão protegidos. Delete faz autorização e delete em operações separadas, possibilitando mudança de ownership entre check e delete. `list` permite filtrar por `params.user_id`, o que merece revisão de intenção/autorização. Erros de permissão em remove usam status padrão do `AppError`, produzindo respostas inconsistentes.

**Testabilidade:** criação/entrada/update estão cobertos; delete concorrente e filtros de listagem não.

### League members

**Responsabilidade:** listar membros, adicionar diretamente, alterar cargos, transferir ownership e remover/sair.

**Regras e localização:** matriz de permissões em `ensureCanChangeRole`; transferência e remoção em transações; FK/unicidade no banco.

**Invariantes:** um owner canônico por liga; admins não promovem privilegiados; owner não é removido sem transferência.

**Problema:** `list` verificava apenas que a liga existia; não verificava membership do solicitante.

**Impacto:** qualquer usuário autenticado que conheça o UUID pode listar membros e avatares de liga privada.

**Decisão:** ligas privadas exigem membership antes de listar. Ligas públicas mantêm a listagem atual; qualquer projeção pública mais limitada deverá ser criada em endpoint explícito e separado.

**Status:** Resolvido — o service retorna `403` antes de consultar a lista para não membros de ligas privadas. Testes HTTP cobrem membro autorizado, não membro sem vazamento de dados e liga inexistente.

**Problema:** `create` não trava a liga, não confere `max_players`, emite evento antes do INSERT e permite ao owner adicionar outro membro com role `owner`.

**Impacto:** capacidade pode estourar; falha no INSERT pode emitir atualização fantasma; podem existir múltiplas linhas owner enquanto `leagues.owner_id` aponta para apenas uma.

**Decisão:** operação transacional com lock da liga, capacidade e conjunto fechado de roles; ownership somente pelo fluxo de transferência.

**Status:** Pending — crítico.

**Problema:** o banco não impunha owner único por liga nem coerência entre `leagues.owner_id` e `league_members(role='owner')`.

**Impacto:** qualquer bug/carga manual pode quebrar a principal invariante de autorização.

**Decisão:** `leagues.owner_id` é a fonte canônica; a linha `league_members(role='owner')` é uma projeção obrigatória. Índice parcial único e constraint triggers diferíveis tornam a projeção única e coerente. Ver ADR `docs/adr/0001-canonical-league-owner.md`.

**Status:** Resolvido — migration faz preflight dos dados, bloqueia segundo owner e valida exatamente um owner correspondente no commit.

### League requests

**Responsabilidade:** solicitar entrada, listar, aprovar/rejeitar e cancelar solicitações.

**Regras e localização:** políticas de entrada no service; pending único por índice parcial; aprovação/capacidade/estado sob lock na mesma transação.

**Invariantes:** apenas request aceita solicitação; invite-only bloqueia autoentrada; request é processada uma vez; aprovação não excede capacidade.

**Race conditions/erros:** aprovação está protegida. Criação faz checks fora de transação; índice impede pending duplicada, e aprovação revalida capacidade. Uma solicitação pode ser criada quando a capacidade acaba simultaneamente, permanecendo pending até rejeição. `ON CONFLICT DO NOTHING` na aprovação ainda marca request como approved caso o usuário já seja membro por outro fluxo; precisa de decisão semântica explícita.

**Testabilidade:** principais fluxos e concorrência de aprovação cobertos; criação concorrente com entrada direta/admin não.

### Lobbies

**Responsabilidade:** ciclo `waiting → in_game → finished/cancelled`, membership, times, ready, seleção de método, consenso/reroll, eleição de capitães, draft e início da partida.

**Regras e localização:** majoritariamente em `LobbiesService`; unicidade de waiting lobby e pares lobby/player no banco; associação liga/lobby validada no service; última vaga usa lock da lobby e lock advisory por usuário.

**Invariantes confirmadas:**

- No máximo uma lobby waiting por liga: índice parcial.
- Última vaga: lobby bloqueada com `FOR UPDATE`.
- Um jogador não entra simultaneamente em duas lobbies pelo fluxo `joinLobby`: advisory lock por usuário.
- Start único e snapshot consistente: lock da lobby + unique match/lobby + transação.
- Match pertence à mesma liga da lobby: FK composta.
- Votos de seleção/consenso/capitão são únicos por usuário: banco.

**Problema:** `leaveLobby` executa remoção, limpeza de votos/draft, reset do estado, contagem e cancelamento em várias transações implícitas.

**Impacto:** pode competir com start, voto, pick ou outra saída; falha intermediária deixa jogador removido com seleção parcialmente ativa, ou lobby vazia ainda waiting.

**Decisão:** toda saída/reset/cancelamento automático é executada em uma transação que adquire primeiro o lock da lobby. Remoção, limpeza de seleção, contagem, reset de ready e cancelamento usam o mesmo executor.

**Status:** Resolvido — coberto por testes de duas saídas concorrentes, corrida leave/start e rollback provocado durante a limpeza.

**Problema:** `changeTeam`, `setReady`, `setUnready` e `cancel` fazem check-then-update sem lock/transação.

**Impacto:** duas trocas simultâneas podem violar o balanceamento calculado; ready pode ocorrer enquanto alguém sai; cancel pode competir com start.

**Decisão:** serializar mutações pelo lock da lobby e condicionar updates ao status esperado.

**Status:** Pending — alto.

**Problema:** `create` depende do índice parcial para corrida, mas não converte especificamente a violação em “já existe lobby”; cai no handler genérico de `23505`.

**Impacto:** contrato HTTP pouco preciso, embora a invariante seja preservada.

**Status:** Pending — baixo.

**Problema:** aprovação do sorteio aleatório marca todos os jogadores `is_ready=true` automaticamente; balanceado deixa todos false.

**Impacto:** a semântica de “ready” muda conforme o modo; consenso sobre times vira implicitamente consentimento para iniciar no aleatório.

**Decisão:** `team_selection_completed` representa times aceitos/concluídos; `is_ready` é sempre uma ação individual explícita, em random, balanced e player picks.

**Status:** Resolvido — todos os métodos deixam os jogadores unready após formar/aceitar times. Backend exige ready individual antes do start; frontend explica a etapa e mostra a contagem. Decisão documentada no ADR 0005 e coberta por testes dos três métodos.

**Problema:** encerramento da votação de capitães depende de um cliente chamar `finalizeCaptains` após o cronômetro.

**Impacto:** sem cliente ativo, a eleição permanece materialmente pendente; relógios cliente/servidor podem produzir UX inconsistente.

**Decisão:** finalização lazy no primeiro read/mutation ou job agendado no backend; servidor continua sendo relógio autoritativo.

**Status:** Resolvido — deadline persistido calculado pelo backend, finalização lazy em reads/mutações e worker periódico recuperável. A transição usa transação e lock `FOR UPDATE`, é idempotente sob múltiplas instâncias e emite eventos apenas após commit. Decisão documentada em `docs/adr/0003-server-authoritative-captain-election-deadline.md`.

**Testabilidade:** `LobbiesService` ainda concentra SQL, relógio, aleatoriedade, autorização, projeção e eventos. `Math.random`, `new Date` e repositories concretos dificultam testes determinísticos/unitários. A suíte cobre concorrência principal, random, draft, duas saídas simultâneas, leave versus start e rollback da saída; ainda faltam trocas/ready simultâneos, cancel versus start, votos concorrentes de método/consenso e timeout real.

### Matches

**Responsabilidade:** snapshot, consulta, votação, resolução administrativa, finalização e standings.

**Regras e localização:** votação/authorization/transação no service; finalização condicional e resultados no repository usando o mesmo client; unicidades/checks/FKs no banco.

**Invariantes confirmadas:** somente participante vota; maioria absoluta; um voto por participante; voto pode mudar antes do fim; `UPDATE ... WHERE status='in_game'` impede dupla finalização; resultado e status da lobby são gravados na transação.

**Problemas resolvidos:** `matches.status` agora possui check para `in_game`, `finished` e `cancelled`.

**Problemas restantes:** `show` carrega detalhes antes de autorizar membership, sem vazamento na resposta, mas com trabalho desnecessário. `any` em `finished` e retornos SQL sem tipos reduzem garantia estática. Não existe mecanismo para partida abandonada sem voto/admin.

**Testabilidade:** fluxos críticos estão bem cobertos em integração; faltam testes HTTP/schema, rollback induzido e grandes volumes de standings.

## Banco de dados e migrations

**Responsabilidade:** integridade referencial, checks, índices, persistência transacional e suporte à concorrência.

**Invariantes existentes:** UUIDs, FKs com cascade, membro/jogador/voto únicos, pending único, waiting lobby única por liga, match único por lobby, FK composta match→lobby/league, checks de status/roles/modos/resultados.

**Problema:** existiam migrations incrementais em `api/migrations/*.js` e uma baseline final em `api/supabase/migrations/*.sql` sem fonte canônica declarada.

**Impacto:** mudanças futuras podem ser aplicadas em apenas uma trilha; local/teste e Supabase podem divergir silenciosamente.

**Decisão:** `api/migrations/*.js` é a fonte canônica e o único fluxo oficial de evolução. A baseline Supabase é uma fotografia legada temporária. O CI cria bancos vazios pelas duas estratégias e compara colunas, defaults, constraints, índices e RLS.

**Status:** Resolvido — estratégia e procedimentos documentados em `docs/migrations.md`; migration failure e divergência estrutural falham o workflow `database-schema.yml`.

**Problema:** constraints ausentes para owner único/coerente, `riot_accounts.user_id` único, `matches.status`, `lobby_draft_picks.team_number` e limite coerente de lobby.

**Impacto:** invariantes podem ser violadas fora do caminho feliz da aplicação.

**Status:** Resolvido — migration incremental adiciona unicidade de Riot, status de partida, time do draft e limite par de lobby entre 2 e 10. Dados recuperáveis são normalizados e ambiguidades fazem a migration falhar com segurança. Justificativas e limites deliberadamente não adicionados estão no ADR 0004.

**Operação:** pool não declara timeout, limite ou política SSL no código; depende integralmente da connection string/PG defaults. Healthcheck valida banco, o que é adequado, mas uma indisponibilidade do Supabase derruba health da API.

## Middlewares, erros e observabilidade

**Status de observabilidade:** correlation ID validado/gerado na entrada HTTP é propagado por contexto assíncrono até logs e sinais Socket.IO. Logs autenticados carregam `userId` e emissões carregam operação e IDs de liga/lobby sem PII textual. Liveness e readiness foram separadas, e `/metrics` expõe volume/duração HTTP, erros por status, sockets ativos e sinais realtime. Semântica e finalidade estão documentadas em `docs/observability.md`.

- `authMiddleware` valida token no Supabase a cada request; correto para revogação, mas adiciona dependência/latência externa em todas as chamadas.
- `errorMiddleware` padroniza `AppError`, Zod, `23505`, `23503` e `23514` no envelope `{ status, code, message }`, sem expor detalhes do PostgreSQL. Timeout/conexão continuam como `500 INTERNAL_ERROR` observável nos logs.
- `AppError` exige status explícito; fluxos de domínio conhecidos não usam mais `Error` genérico. O contrato está documentado em `docs/error-contract.md` e coberto pelos testes HTTP.
- Pino remove Authorization/cookie e registra erros inesperados. Não há correlation id propagado para eventos Socket.IO nem métricas de domínio.
- Não há rate limiting em login indireto, sync, endpoints de voto ou socket reconnect.

## Socket.IO

**Responsabilidade:** autenticar conexão, ingressar em rooms autorizadas e enviar sinais de invalidação.

**Invariantes:** token Supabase obrigatório; somente membro entra em room de liga/lobby.

**Problema:** autorização ocorria apenas no evento de join. Um usuário removido da liga continuava na room até sair/desconectar.

**Impacto:** continua recebendo IDs e eventos futuros da liga privada; embora REST revalide acesso, há vazamento de metadados e atividade.

**Decisão:** manter índice local `userId → sockets` e grants por conexão. Após commit de remoção, expulsar todas as abas das rooms da liga e de suas lobbies; na exclusão, revogar todos os grants da liga. Reconnect continua revalidando no PostgreSQL. Ver ADR `docs/adr/0002-realtime-membership-revocation.md`.

**Status:** Resolvido — revogação ativa implementada e coberta por cliente Socket.IO real, incluindo múltiplas conexões, lobby, exclusão e tentativa de reentrada.

**Problema:** handlers async não possuíam wrapper/callback de erro e negavam acesso silenciosamente.

**Impacto:** promises rejeitadas podem gerar erro não tratado; cliente não distingue ausência, proibição ou falha de banco.

**Status:** Resolvido — joins/leaves usam wrapper uniforme, ack `{ ok, error }`, fallback `socket:error` e captura de falhas inesperadas sem rejection não tratada.

**Decisão:** o arquivo vazio `matches.socket.ts` foi removido. Partidas não possuem comandos inbound próprios no transporte; mutations continuam no REST e os services emitem invalidações de match para rooms autorizadas de liga/lobby. `socket-handlers.ts` registra somente handlers inbound reais de liga e lobby.

**Impacto:** arquitetura nominal e comportamento divergem; manutenção pode presumir handler inexistente.

**Status:** Pending — baixo.

## Integrações

### Supabase

Usado apenas para Auth na API/WEB e PostgreSQL hospedado. O modelo `public.users` duplica parte da identidade de `auth.users` sem FK cross-schema. Sync é necessário antes dos fluxos. A baseline Supabase habilita RLS sem policies nas tabelas públicas, de modo que o acesso de aplicação deve ocorrer pela conexão PostgreSQL da API.

### Riot

Lazy initialization está correta: importar o módulo não cria cliente. UI consulta configuração pública e esconde vínculo quando desabilitado. Ainda há rotas, tabela, hooks e componentes opcionais, portanto a integração está isolada, não removida.

## Mapa do frontend

```text
WEB
├── routes/layouts
│   ├── landing e login públicos
│   └── dashboard, ligas, lobby e perfil protegidos
├── pages
│   ├── landing
│   ├── login
│   ├── dashboard
│   ├── leagues/settings
│   ├── lobby
│   └── profile
├── components
│   ├── UI compartilhada/Sidebar
│   └── componentes de leagues/lobbies/matches/profile
├── hooks
│   ├── auth
│   ├── queries/mutations de domínio
│   └── subscriptions Socket.IO
├── services
│   ├── Axios + bearer Supabase
│   ├── Socket.IO client
│   └── services por módulo
└── state/query
    ├── AuthContext/AuthProvider
    ├── TanStack Query
    └── queryKeys centralizadas
```

## Auditoria por área do frontend

### Autenticação e rotas

**Responsabilidade:** sessão Supabase, criação do perfil local, rotas públicas/protegidas e logout.

**Regras:** uma sessão só vira `user` após `/auth/sync`; ProtectedLayout protege UI; API continua sendo autoridade.

**Problemas:** `onAuthStateChange` do módulo socket é registrado globalmente e não expõe unsubscribe. Não há Error Boundary global. Se sync falhar após login válido, a sessão Supabase permanece ativa enquanto o contexto fica sem user, criando estado híbrido. Mensagens do Supabase/API são exibidas sem tradução consistente.

**Testabilidade:** nenhum teste de provider, confirmação por e-mail, expiração/refresh do token, logout ou falha parcial de sync.

### Pages

**Responsabilidade:** composição e navegação. Há estados de loading/erro/vazio nas páginas principais.

**Qualidade textual:** resolvido — fontes do frontend foram verificadas como UTF-8 válido e não contêm sequências mojibake nem caracteres de substituição.

**Problemas restantes:** `LeaguePage` dispara queries de membros/lobbies antes de a query da liga confirmar acesso. Settings decide permissão a partir de dados client-side e durante falhas pode redirecionar como se não fosse admin. Não há rota/página dedicada de detalhes da partida; votação fica acoplada à lobby.

**Testabilidade:** existe harness determinístico com Router, QueryClient e Auth, além de regressões de rotas protegidas, estados de `LeaguePage`, permissões, lobby/ready/seleção, votação e lifecycle de autenticação/cache. Componentes ainda dependem diretamente de hooks/services, isolados com mocks nos testes de comportamento.

### Components

**Responsabilidade:** CRUD de liga, ações de entrada, membros/requests, lobby/ready/times, seleção/draft, votação e perfil.

**Problemas:** componentes como `TeamSelection`, `MatchVoting` e `LoginPage` concentram muita lógica em JSX comprimido, dificultando branches de teste e acessibilidade. A contagem regressiva chama finalização automaticamente pelo cliente. Botões usam permissão derivada de cache; respostas 403 são a última barreira correta, mas a UI pode piscar ações indevidas durante refetch.

### Hooks e services

**Responsabilidade:** encapsular queries/mutations, anexar bearer token e reagir a sockets.

**Pontos positivos:** query keys estão centralizadas e incluem league/lobby IDs; interceptor normaliza mensagem; sockets invalidam queries em vez de replicar estado.

**Status da sessão/realtime:** resolvido. `AuthProvider` possui a inscrição Supabase e executa unsubscribe no cleanup; `SessionLifecycle` desconecta o socket, cancela queries e limpa o cache antes de logout/troca de identidade; `SocketSessionOwner` controla credenciais, connect e reconnect. As invalidações pelo prefixo raiz de ligas foram substituídas por keys específicas. Joins possuem ack e, após reconnect autorizado, os hooks invalidam as queries relacionadas para reconciliar eventos perdidos.

**Problemas restantes:** alguns fluxos dependem de polling (match a cada 15 s) apesar de eventos. Não há cancelamento/timeout Axios explícito.

### Estado/query

Não há store global além de AuthContext; estado servidor está corretamente no TanStack Query. A política global de `staleTime`, retry, reconnect, logout e troca de usuário está implementada no `AppProviders`/`SessionLifecycle` e documentada em `docs/frontend-session-query-realtime.md`. Testes cobrem logout, troca de conta e reconnect do socket.

## Matriz consolidada de invariantes

| Invariante | Garantia atual | Lacuna |
|---|---|---|
| Uma identidade → um perfil | unique PK + sync idempotente | `/users` público contorna origem confiável. |
| Um membro por liga | unique DB | Cadastro admin não protege capacidade. |
| Um owner por liga | lógica de transferência | Sem constraint; create member permite owner extra. |
| Capacidade da liga | lock em join/approval | Não em member create. |
| Uma waiting lobby por liga | índice parcial | Mensagem genérica em corrida. |
| Um jogador em uma lobby ativa | advisory lock no join | Não é constraint global; operações alternativas/manuais contornam. |
| Última vaga da lobby | lock da lobby | Protegida no join atual. |
| Times balanceados | checks do service | Troca concorrente não serializada. |
| Start único/snapshot | transação + locks + unique | Protegido. |
| Match pertence à liga da lobby | FK composta | Protegido. |
| Um voto por usuário | unique + upsert | Protegido. |
| Finalização única | lock + update condicional | Protegido. |
| Acesso privado | REST e join de room | Membros endpoint e sockets já conectados têm lacunas. |

## Cobertura e partes difíceis de testar

### Coberto hoje

Os testes de integração cobrem políticas de entrada, capacidade/concorrência da liga, requests, roles/ownership, update schema, última vaga/duas lobbies, estados básicos de lobby, seleção random, player picks, IDs aninhados, snapshot/votação/finalização simultânea, resolução administrativa, standings, IDOR principal, revogação realtime e auth sync. A suíte HTTP sobe a aplicação Express completa e cobre autenticação, Zod, contratos 400/401/403/404/409/500, profiles, ausência de `/users` público, ligas, members privados, requests, lobbies, matches e tradução de erros SQL.

### Não coberto ou insuficiente

- Casos HTTP menos frequentes, como todos os filtros de query, payload acima do limite e CORS por origem.
- Cadastro admin concorrente/capacidade/múltiplos owners.
- Leave/cancel/change-team/ready concorrentes e rollback intermediário.
- Relógio de capitães e ausência de clientes: coberto com clock injetável, worker sem clientes, concorrência no deadline e reconciliação lazy em read.
- Riot concorrente e indisponibilidade externa.
- Frontend: a base crítica está coberta e roda no CI; ainda faltam acessibilidade abrangente, navegação mobile e fluxos secundários de formulários/settings.
- Migração incremental versus baseline Supabase e upgrade de banco com dados reais no CI.

### Causas de baixa testabilidade

- Services criam dependências concretas internamente.
- SQL transacional está misturado a regra de domínio e emissão de eventos.
- `LobbiesService` tem responsabilidades demais.
- Tempo e aleatoriedade globais não são injetáveis.
- Socket continua sendo uma única conexão compartilhada, mas agora possui owner explícito; o listener global sem unsubscribe foi removido.
- Componentes grandes misturam renderização, timer, mutation e política.

## Decisões recomendadas para a próxima fase

Estas decisões não foram implementadas:

1. Fechar `/users` e corrigir authorization de members antes de novas features.
2. Tornar `league-members.create` e todas as mutações compostas de lobby transacionais.
3. Definir uma fonte única para ownership e reforçá-la no PostgreSQL.
4. Eleger uma única trilha canônica de migrations.
5. Criar testes HTTP e Socket.IO reais antes de refatoração estrutural.
6. Extrair de `LobbiesService` casos de uso/serviços de seleção, membership e lifecycle somente depois de congelar comportamento com testes.
7. Adotar uma política explícita de cache/logout/reconnect no frontend.

## Status da auditoria

**Concluída para o código presente em 2026-08-10.** Os problemas acima permanecem `Pending`; nenhuma correção funcional foi aplicada nesta fase.
