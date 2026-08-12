# Auditoria arquitetural — Fase 1

Data: 11 de agosto de 2026  
Branch/commit analisado: `audit-v1` / `b4864aa479e0efe48dafbc70dbfb3ac80e14248c`

## 1. Resumo executivo

O projeto evoluiu de um protótipo com regras dispersas para um monólito modular coerente, com Express, PostgreSQL, React e Socket.IO.
As invariantes centrais de ligas, ownership, lobbies e partidas hoje têm transações, locks e, nos casos estáveis, proteção no banco.
A suíte atual cobre contratos de domínio, HTTP real, PostgreSQL, Socket.IO real e comportamentos críticos do frontend; isso é uma força incomum em projeto de portfólio.
Autorização de recursos privados, IDs aninhados, revogação realtime e isolamento de cache entre contas foram efetivamente implementados.
As migrations incrementais são declaradas canônicas e a CI compara sua estrutura com a baseline Supabase.
O fluxo de eleição de capitães deixou de depender de cliente ativo e usa deadline persistido, worker recuperável e operação idempotente.
A arquitetura controller → service → repository está presente, embora `LobbiesService` concentre 693 linhas e múltiplos subdomínios.
Não foi encontrada race condition aberta que permita exceder capacidade ou finalizar uma partida duas vezes nos fluxos cobertos.
O maior risco imediato é operacional: o Compose importa `api/.env`, podendo fazer a API local usar um PostgreSQL remoto enquanto sobe um PostgreSQL local.
Também não existe CD: deploy, migration de produção, rollback e versionamento de release são procedimentos manuais e não demonstrados.
O processo não trata `SIGTERM`; servidor HTTP, worker e pool podem ser interrompidos durante operação ou transação.
O índice de autorização Socket.IO é apenas em memória, portanto a revogação não funciona de forma global ao escalar para mais de uma instância.
Há dois defeitos novos verificáveis: clientes reutilizados do pool podem receber wrappers de query empilhados e payloads Socket.IO inválidos chegam ao PostgreSQL sem schema.
O frontend tem boa base de sessão/query, mas ainda usa polling redundante, possui cobertura estreita de formulários/UX e gera bundle inicial grande sem code splitting.
O repositório contém uma `.pnpm-store` inteira versionada, além de mojibake no próprio `.gitignore`, o que prejudica higiene e apresentação.
Como portfólio, o projeto já comprova nível Pleno forte em backend/full stack, especialmente SQL, concorrência e testes.
Para produção pública, ainda não está pronto sem corrigir configuração de ambientes, rate limiting, lifecycle do processo e processo de release/backup validado.

## 2. Evolução desde audit.md

Esta classificação foi refeita a partir da implementação e dos testes atuais; o status textual de `docs/audit.md` não foi usado como evidência.

| Item original | Status atual | Evidência | Risco residual |
|---|---|---|---|
| Sync do perfil após autenticação | RESOLVIDO | `AuthProvider.acceptSession` chama `/auth/sync`; `auth.service.ts` cria/recupera o usuário; testes em `AuthProvider.test.tsx` e `http.integration.test.ts` | Falha do logout remoto pode deixar sessão Supabase recuperável após reload. |
| Criação de liga e owner não atômica | RESOLVIDO | `LeaguesService.create` usa um único client/transação; migration `1784562600000_enforce-league-ownership.js`; teste “league and initial owner are created atomically” | Trigger deferred aumenta complexidade das migrations, mas fecha a invariante. |
| Capacidade concorrente de liga | RESOLVIDO | Liga é lida `FOR UPDATE`; count e insert usam o mesmo executor em members/requests; testes de entrada e aprovação concorrentes | Escritas externas precisam respeitar constraints e ownership; limite numérico é garantido, capacidade corrente não é constraint declarativa. |
| Aprovação duplicada de join request | RESOLVIDO | `LeagueJoinRequestsService.approve` serializa liga e request e atualiza status na transação; teste da última vaga | Sem risco residual material no modelo de instância única do banco. |
| Políticas open/request/invite_only incompletas | RESOLVIDO | `LeaguesService.join`, schemas e testes de domínio exercitam os três caminhos | A comunicação da política no frontend ainda não tem cobertura E2E. |
| Owner único/coerência de `owner_id` | RESOLVIDO | Índice único parcial, triggers deferred e transferência transacional; ADR 0001; testes de segundo owner, divergência e rollback | Mecanismo é sofisticado e exige que baseline e incremental permaneçam equivalentes. |
| Remoção/troca do último owner | RESOLVIDO | `LeagueMembersService.update/remove` bloqueia liga e membros; transferência é atômica; banco rejeita estado incoerente | Mensagens e permissões têm apenas cobertura de integração, não propriedade/model checking. |
| Listagem privada de membros vazava dados | RESOLVIDO | `LeagueMembersService.list` verifica membership antes do repository de lista; testes HTTP distinguem membro, outsider e liga inexistente | Endpoint público de descoberta deve continuar sem projeção de membros. |
| IDs `leagueId → lobbyId → matchId` não validados | RESOLVIDO | Services verificam associação; FK composta em `1784562200000_match-lobby-association.js`; testes de nested IDs | Handlers Socket ainda aceitam string sem validação UUID antes da consulta. |
| Última vaga e participação simultânea em lobbies | RESOLVIDO | Lock da lobby e índice parcial de lobby ativa em `domain-integrity`; teste concorrente | Índice representa uma regra de produto rígida; mudança futura deve ser migration explícita. |
| `leaveLobby` parcial/racing | RESOLVIDO | `LobbiesService.leave` usa lock da lobby, limpeza e cancelamento no mesmo client; eventos pós-commit; testes de duas saídas, rollback e corrida com start | Serviço grande dificulta revisão futura desse protocolo. |
| Ready, change team e cancel sem serialização | RESOLVIDO | Métodos transacionais bloqueiam lobby antes da decisão; repositories recebem executor | Nem todos têm um teste concorrente dedicado; a segurança deriva do lock comum e testes de estado. |
| Semântica waiting/in_game/finished/cancelled | RESOLVIDO | Check constraint e transitions no service; README documenta cancelamento lógico | Não existe retenção/arquivamento de lobbies canceladas. |
| Aceitação de times confundida com ready | RESOLVIDO | ADR 0005; random, balanced e draft deixam `is_ready=false`; backend exige ready explícito; testes dos três modos | UX crítica está coberta apenas por componentes isolados. |
| Deadline de capitães dependia do cliente | RESOLVIDO | `CaptainElectionService`, deadline persistido, lazy finalization e `CaptainElectionWorker`; ADR 0003; teste com clock e concorrência | Worker usa timer local e log não estruturado; shutdown não é coordenado. |
| Start/snapshot e votação/finalização suscetíveis a duplicidade | RESOLVIDO | `MatchesService` usa transações e lock da match; snapshot na transação; testes simultâneos e de maioria | Não há correção pós-finalização, decisão de produto documentada no README. |
| Resolução administrativa e standings | RESOLVIDO | Autorização por liga e snapshot final; testes de admin externo e classificação | Query de standings recalcula agregados a cada leitura e merece medição com volume. |
| Constraints de domínio estáveis ausentes | RESOLVIDO | `1786469400000_strengthen-domain-constraints.js` adiciona Riot único, status, draft team e limites de lobby; ADR 0004 | Tradução HTTP é genérica por SQLSTATE, sem código específico por constraint. |
| Duas trilhas de migrations divergentes | PARCIAL | `docs/migrations.md` e `database-schema.yml` elegem/aplicam incremental e comparam baseline | Banco Supabase já existente pode não ter histórico `pgmigrations`; upgrade real não é exercitado em CI nem automatizado no deploy. |
| Contrato de erros inconsistente | RESOLVIDO | `AppError`, Zod e `error.middleware.ts` mapeiam 400/401/403/404/409/500 e 23505/23503/23514 sem SQL/stack | Socket retorna erro genérico para falhas inesperadas e não valida input; códigos de constraint são pouco específicos. |
| Revogação de membership não expulsava sockets | RESOLVIDO | `SocketAccess` indexa user→sockets, remove rooms de liga/lobbies e é chamado após commit; testes multiaba/reconnect/delete | Só é correto com uma instância de API; não há adapter/índice distribuído. |
| Handlers Socket async sem ack uniforme | RESOLVIDO | `runSocketAction` produz ack ou `socket:error`; teste injeta erro de banco e monitora unhandled rejection | Falhas inesperadas não são logadas dentro do wrapper e não carregam correlation ID de entrada. |
| Lifecycle/cache frontend implícito | RESOLVIDO | `SessionLifecycle`, `SocketSessionOwner`, unsubscribe do Supabase, defaults globais e query keys; testes de logout/troca/reconnect | `signOut` limpa estado antes de confirmar logout Supabase; polling de match permanece. |
| Ausência de testes HTTP/Socket/frontend | RESOLVIDO | 48 cenários API (33 domínio, 10 HTTP, 5 Socket) e 17 testes frontend; jobs CI separados | Frontend usa mocks extensos e não cobre formulários, acessibilidade, viewport ou fluxo browser completo. |
| Riot era dependência obrigatória | RESOLVIDO | Cliente é criado apenas no fluxo configurado; API sobe sem env Riot; frontend consulta configuração e oculta vínculo | Código opcional amplia superfície de manutenção e não tem testes dedicados. |
| Typo `weboscket`, mojibake e socket morto | PARCIAL | Diretório atual é `websocket` e arquivo de match vazio foi removido | `.gitignore` ainda contém mojibake e existe typo `league-members.repostitory.ts`. |
| Observabilidade insuficiente | PARCIAL | Pino, ALS, requestId, DB error log, métricas e live/ready estão implementados e documentados | `/metrics` público, contexto Socket incompleto, wrapper DB empilha, worker/server usam console e métricas são por processo. |

## 3. Arquitetura atual

O caminho HTTP real é `route → authMiddleware → controller → schema Zod → service → repository → PostgreSQL`. Controllers são finos; services concentram autorização, estado e transações; repositories concentram SQL parametrizado. `FindOptions`/`QueryOptions` permitem passar o mesmo `PoolClient` e solicitar lock sem acoplar todo repository à transação. O middleware da conexão converte resultados do banco de snake_case para camelCase, mantendo `Row`/schema físico como fronteira.

O monólito modular é proporcional ao produto. Separá-lo em serviços distribuídos pioraria atomicidade e operação sem resolver um problema atual. Auth identifica/sincroniza; Users representa identidade local; Profile edita dados do próprio usuário. Essa divisão é defensável, embora Users tenha API mínima e nomes genéricos.

As regras críticas estão majoritariamente no backend e reforçadas por índices/checks/FKs. Socket.IO sinaliza invalidações; REST permanece fonte da verdade. O frontend organiza pages/components/hooks/services por domínio e centraliza query keys.

Inconsistências concretas:

- `LobbiesService` tem 693 linhas e coordena membership, ready, seleção aleatória/balanceada, eleição e draft. O problema não é estético: mudanças em um protocolo exigem entender todos os outros e tornam testes unitários difíceis.
- `league-members.repostitory.ts` tem typo; alguns repositories usam `SELECT *`, fragilizando projeções quando o schema cresce.
- A transformação camelCase é global e recursiva em qualquer JSON retornado; isso deve ser contrato explícito, pois pode alterar chaves de payload JSON que não representem colunas.
- Services instanciam dependências por default em construtores, com alguma injeção para testes. Não há container, e ele não é necessário no tamanho atual.
- Não foi localizada dependência circular relevante. Acoplamentos cross-module (lobby→member, match→lobby/member e revogação→SocketAccess) seguem necessidades concretas do domínio.

## 4. Backend por módulo

### Auth

- **Responsabilidade:** validar identidade Supabase e garantir perfil local idempotente em `/auth/sync`.
- **Pontos fortes:** identidade deriva do token; nickname collision é tratado; possui contrato HTTP.
- **Problemas/riscos:** chamada externa não define timeout/retry explícito; disponibilidade do Supabase impacta autenticação. O sync não deve virar endpoint público de criação genérica.
- **Testabilidade:** authenticator substituível apenas em `NODE_ENV=test`, adequada para HTTP real sem depender de Supabase.
- **Recomendação:** definir timeout operacional e métricas de falha/latência da autenticação antes de uso real.

### Users

- **Responsabilidade:** persistência da identidade local e lookup por id/email.
- **Pontos fortes:** não há rota pública de enumeração/criação; teste regressivo confirma isso.
- **Problemas/riscos:** `SELECT *` e comentário TODO genérico; módulo pequeno se sobrepõe conceitualmente a Profile, mas hoje separa identidade de apresentação de forma útil.
- **Testabilidade:** coberto indiretamente por auth/profile e domínio.
- **Recomendação:** manter separado; adicionar projeções explícitas apenas quando houver campo sensível.

### Profile

- **Responsabilidade:** leitura/edição do perfil do usuário autenticado.
- **Pontos fortes:** schemas próprios e usuário alvo vem de `request.user`, evitando mass assignment/IDOR.
- **Problemas/riscos:** avatar URL é entrada remota sem política explícita de hosts/tamanho; o navegador é quem carrega o recurso.
- **Testabilidade:** contratos de sync/profile e erros SQL são cobertos; UI do formulário não.
- **Recomendação:** validar comportamento de formulário e definir política de avatar antes de permitir conteúdo arbitrário em produção.

### Riot

- **Responsabilidade:** metadado opcional de conta e integração condicional.
- **Pontos fortes:** inicialização lazy; nenhuma regra de liga depende dela; unicidade por user no banco.
- **Problemas/riscos:** superfície opcional sem testes específicos e dependência externa sem política de timeout observável.
- **Testabilidade:** baixa comparada aos módulos centrais.
- **Recomendação:** ou adicionar poucos testes de configuração/desvinculação, ou remover a feature se não fizer parte da demonstração.

### Leagues

- **Responsabilidade:** CRUD, descoberta, join direto, autorização base e ownership.
- **Pontos fortes:** create+owner e updates compostos são transacionais; body tem schema próprio; CORS/REST não substituem autorização.
- **Problemas/riscos:** listas não são paginadas; exclusão depende de cascades e revogação em memória após commit.
- **Testabilidade:** bons testes de atomicidade, políticas e nested access.
- **Recomendação:** paginação quando houver volume demonstrável; manter regra de ownership próxima desta transação e do member service.

### League Members

- **Responsabilidade:** listar, adicionar, trocar role/owner e remover membros.
- **Pontos fortes:** lista privada verifica membership antes de buscar dados; capacidade e ownership usam lock de liga; SocketAccess revoga após commit.
- **Problemas/riscos:** nome de arquivo com typo; `SELECT *`; `LeagueMembersService` ainda contém protocolos de autorização e transferência que exigem cuidado conjunto com Leagues.
- **Testabilidade:** concorrência, rollback, autorização e DB invariant estão bem cobertos.
- **Recomendação:** corrigir naming e explicitar projeções; não dividir transferência entre services porque isso enfraqueceria atomicidade.

### League Requests

- **Responsabilidade:** criar/cancelar/listar e aprovar/rejeitar solicitações conforme política.
- **Pontos fortes:** aprovação bloqueia liga e request no mesmo executor; última vaga tem teste concorrente.
- **Problemas/riscos:** listagem pode crescer sem paginação; códigos 409 são genéricos.
- **Testabilidade:** caminhos de política, duplicidade, privilégio e capacidade cobertos.
- **Recomendação:** paginação e códigos de domínio somente quando o cliente precisar distinguir conflitos.

### Lobbies

- **Responsabilidade:** ciclo completo da lobby, jogadores, times, ready, seleção, eleição, draft e start.
- **Pontos fortes:** a lobby é ponto de serialização; transações reutilizam client; leave é atômico; eleição tem deadline persistido; eventos são pós-commit.
- **Problemas/riscos:** 693 linhas no service; worker sem lifecycle/log estruturado; alguns fluxos têm apenas teste sequencial; complexidade do draft e seleção compartilha estado no mesmo agregado.
- **Testabilidade:** forte integração, clock injetável e rollback; baixa testabilidade unitária por tamanho/acoplamento.
- **Recomendação:** extrair orquestradores de seleção/draft mantendo uma única transação e lock da lobby. O ganho é reduzir área de regressão, não criar camadas abstratas.

### Matches

- **Responsabilidade:** leitura, votação, maioria, finalização, resolução administrativa e standings.
- **Pontos fortes:** match bloqueada para mudança/finalização; voto único e alterável; snapshot é fonte de standings; dupla finalização testada.
- **Problemas/riscos:** standings é agregação em leitura; polling frontend continua a cada 15s; nenhum benchmark com histórico grande.
- **Testabilidade:** votação, autorização, admin externo, maioria e standings cobertos.
- **Recomendação:** medir `EXPLAIN ANALYZE` e payload antes de materializar/cachear; hoje não há evidência para complexidade adicional.

## 5. Concorrência e consistência

| Fluxo | Transação | Lock | Invariante DB | Teste concorrente | Status |
|---|---|---|---|---|---|
| Criar liga + owner | Sim | Transação de inserts | Trigger deferred + owner único | Sim/rollback | Forte |
| Join open/capacidade | Sim | Liga `FOR UPDATE` | membro único, max_players válido | Sim | Forte |
| Criar membro administrativo | Sim | Liga e membros `FOR UPDATE` | membro único, owner único | Cobertura de capacidade/roles | Forte |
| Aprovar request | Sim | Liga + request `FOR UPDATE` | request pending único e membro único | Sim, última vaga | Forte |
| Transferir ownership | Sim | Liga + membros | índice parcial + triggers deferred | Sim/rollback/segundo owner | Forte |
| Join lobby/última vaga | Sim | Lobby `FOR UPDATE` | player único e lobby ativa única por user | Sim | Forte |
| Change team | Sim | Lobby `FOR UPDATE` | team 1/2 | Não dedicado concorrente | Adequado, teste adicional útil |
| Ready/unready | Sim | Lobby `FOR UPDATE` | status/checks | Não dedicado concorrente | Adequado |
| Leave lobby | Sim | Lobby `FOR UPDATE` | FKs/checks | Sim: duas leaves, start e rollback | Forte |
| Cancel lobby | Sim | Lobby `FOR UPDATE` | status válido | Não dedicado concorrente | Adequado |
| Seleção random/balanced | Sim | Lobby + players | consenso/selection checks | Maioria coberta; sem stress | Adequado |
| Eleição/finalização de capitães | Sim | Lobby `FOR UPDATE` | deadline/estado persistido | Sim com clock/chamadas simultâneas | Forte |
| Picks do draft | Sim | Lobby `FOR UPDATE` | pick/order/team checks | Sequência snake coberta | Adequado |
| Start + snapshot | Sim | Lobby e escrita de match/snapshot | match único por lobby + FK composta | Corrida leave/start | Forte |
| Voto/alteração/finalização | Sim | Match `FOR UPDATE` | voto único por jogador/match | Sim, dois votos finais | Forte |
| Resolução administrativa | Sim | Match `FOR UPDATE` | status/winner checks | Autorização coberta, não corrida dedicada | Adequado |
| Standings | Leitura consistente por statement | Snapshot finalizado | resultado/team checks | Resultado funcional | Adequado; medir volume |

O padrão correto é serializar pelo agregado cuja decisão muda: liga para capacidade/owner, lobby para membership/seleção/start e match para votação/finalização. As queries críticas observadas recebem o mesmo executor. Em geral, emits ficam depois do `COMMIT`; esse padrão deve permanecer parte do review de qualquer fluxo novo.

## 6. Banco e migrations

As migrations incrementais em `api/migrations` formam uma trilha ordenada e a baseline `api/supabase/migrations/20260805210000_initial_schema.sql` é verificada estruturalmente por CI. PKs UUID, FKs, uniques, checks e índices parciais cobrem as invariantes centrais. A FK composta liga match à mesma league da lobby. Ownership usa índice único parcial e triggers deferred para permitir transferência atômica sem estado intermediário inválido no commit.

Pontos positivos: preflight/normalização antes das constraints está documentado nos ADRs; falha de migration interrompe CI; aplicação repetida é testada; voto, match por lobby, membership, request pending e lobby ativa têm unicidade adequada.

Riscos:

- A equivalência estrutural não prova upgrade de um banco real com histórico anterior. Um Supabase criado por baseline pode não ter a tabela/histórico `pgmigrations`; `node-pg-migrate up` tentará migrations antigas sobre tabelas existentes.
- Não existe etapa de migration no `render.yaml` ou workflow de release. A fonte canônica está definida, mas o caminho de produção é manual.
- `standings` existe no schema enquanto o README afirma cálculo por snapshot; se a tabela não for escrita/lida no fluxo atual, é modelo legado que confunde a fonte da verdade.
- `SELECT *` aparece em vários repositories, acoplando o contrato retornado a colunas futuras.
- A transformação camelCase aplicada no driver inteiro, inclusive JSON aninhado, não é verificada por teste de contrato dedicado.

Não é recomendado substituir os triggers de ownership agora: eles resolvem uma duplicação histórica real. Uma remodelagem seria justificável apenas numa quebra de schema planejada.

## 7. Segurança

**Fortes:** token HTTP e Socket é validado no Supabase; `request.user` vem do token; params/body HTTP usam Zod; autorização vive no service; leagues privadas, members, requests, lobbies e matches têm regressões de IDOR; Helmet, body limit, CORS exato em produção e redaction de authorization/cookie estão presentes. SQL é parametrizado e o middleware não expõe stack/SQL em produção.

**Abertos:** não há rate limiting por IP/usuário em HTTP nem limite de joins/reconnect Socket. Em deploy público gratuito, abuso pode consumir CPU, conexões do pool e quota Supabase. `/metrics` é público e expõe topologia operacional/volume; deve ficar privado ou protegido. Os handlers `join:league`/`join:lobby` recebem strings sem Zod UUID, permitindo input inválido alcançar o banco. Avatar URL aceita recurso remoto arbitrário; não é SSRF do backend, mas permite tracking/conteúdo inesperado no browser.

O header de request ID recebido é aceito por formato, não por proxy confiável. Isso permite poluição/correlação ambígua de logs, embora não dê acesso a dados. Health liveness pode ser público; readiness pode revelar apenas `ok/not_ready`, risco baixo. Não foram encontrados endpoints administrativos intencionalmente públicos nem mass assignment evidente.

## 8. Socket.IO / realtime

Handshake autenticado, autorização por room, ack uniforme e testes com cliente real estão implementados. `SocketAccess` trata múltiplas conexões do mesmo user e revoga liga e lobbies imediatamente após remoção/exclusão. Reconnect revalida membership; hooks do frontend rejoinam e invalidam queries. A arquitetura é deliberadamente “evento como sinal de refetch”, portanto perda de evento não corrompe domínio.

Limites:

- `userSockets`/`grantsBySocket` são mapas do processo. Com duas instâncias, uma remoção na instância A não expulsa socket conectado à B. Antes de horizontal scaling, usar adapter/bus compartilhado ou revalidar antes de emissões sensíveis.
- `runSocketAction` converte erro inesperado, mas não registra o erro nem inicia ALS/correlation context para a ação recebida.
- Payloads de join não têm schemas/limites UUID antes do repository.
- Métricas e contagem de sockets são por processo; adequadas para uma instância, incompletas agregadas.
- O cliente ainda dispara finalização de capitães ao expirar o contador; hoje é redundante, não fonte de verdade.

## 9. Frontend

A organização por módulos é clara. Query keys estão centralizadas; defaults (`staleTime` 30s, retry 1, sem focus refetch) são razoáveis. `SessionLifecycle` desconecta socket, cancela e limpa cache em troca/logout. O Supabase listener é removido no unmount, e `SocketSessionOwner` explicita propriedade da conexão.

Estados loading/error/empty existem nos fluxos testados de liga e votação. Permissões locais controlam apresentação, enquanto segurança real permanece na API. Sockets invalidam cache e reconnect força reconciliação.

Problemas concretos:

- `MatchVoting` mantém `refetchInterval: 15000` além das invalidações Socket, criando tráfego permanente por aba/partida.
- O bundle Vite é monolítico; páginas não usam lazy imports. A medição de build deve ser registrada e code splitting aplicado às rotas se o chunk continuar acima do warning do Vite.
- `AuthProvider.signOut` limpa sessão/cache antes de confirmar `supabase.auth.signOut`; se o logout remoto falhar, a UI fica anônima mas um reload pode recuperar a sessão.
- Testes de LeaguePage/components mockam hooks/services; não provam formulários, erros de mutation, navegação completa ou integração query+router+API.
- Não há testes de acessibilidade, teclado, viewport mobile/tablet ou browser E2E.
- `DangerZone.tsx` ainda tem `console.log` em vez de uma ação completa/feedback; deve ser classificado conforme a feature estiver exposta.
- `TeamSelection.tsx` concentra lógica temporal em uma linha compactada, reduzindo legibilidade e review.

## 10. Testes

Cobertura observada:

- **Unit:** quase inexistente no backend; aceitável porque regras estão fortemente cobertas com PostgreSQL real, mas casos puros poderiam ficar mais rápidos.
- **Integração/domínio/PostgreSQL:** 33 cenários, incluindo capacidade, ownership, rollback, leave/start, draft, clock, votação e autorização.
- **HTTP:** 10 cenários com app Express real, Zod, auth, statuses e SQLSTATE.
- **Socket.IO:** 5 cenários com client real, handshake, autorização, DB error, multiaba, revogação e reconnect.
- **Frontend behavior:** 17 testes em seis arquivos, cobrindo sessão, protected layout, LeaguePage, ready/acceptance e voting.
- **Migrations/CI:** banco vazio e segunda execução; comparação incremental/baseline.

Qualidade: a suíte backend privilegia comportamento observável e concurrency real, uma força. Testes limpam estado e a CI serializa o arquivo de integração. O frontend usa harness Router+QueryClient+Auth, mas mocks amplos diminuem confiança em wiring. Não há teste de upgrade de snapshot antigo, seed, backup/restore, worker em processo reiniciando, shutdown, rate limit, formulários, acessibilidade ou E2E multiusuário. Também não há cobertura/threshold — corretamente não se deve perseguir percentual, mas relatórios podem ajudar a localizar arquivos sem regressão.

## 11. Observabilidade

Pino/pino-http, ALS, requestId, redaction e métricas Prometheus text format formam uma base proporcional. `/health/live` não toca dependência; `/health/ready` consulta PostgreSQL; essa semântica é correta. Labels de métricas usam método/status/evento, sem UUID, portanto cardinalidade é segura.

Falhas verificadas:

- `connection.ts` substitui `client.query` toda vez que `pool.connect()` entrega um client. Como PoolClient é reutilizado, ele pode ser embrulhado novamente, duplicando transformação/logs e aumentando custo a cada checkout.
- O worker usa `console.error` e o servidor `console.log`, fora do logger estruturado.
- Ação Socket recebida não ganha requestId/ALS; correlation existe principalmente em HTTP e emits.
- `/metrics` é público.
- Não há graceful shutdown do HTTP server, Socket.IO, worker ou `db.end()`.
- Pool não explicita `max`, `connectionTimeoutMillis`, `idleTimeoutMillis` ou statement timeout; defaults podem não combinar com Supabase/Render free tier.
- Não há alerta/SLO. Isso é aceitável antes de tráfego real; adicionar tracing distribuído agora não tem retorno, pois há um único processo e banco.

## 12. CI/CD e produção

**CI:** `npm ci`, migrations, typecheck e 48 cenários API rodam com PostgreSQL 17. Frontend executa `npm ci`, 17 testes, build e lint. Outro workflow compara schemas. É uma base boa e reproduzível. Faltam audit de dependências, teste de imagem Docker e validação do Compose; são incrementos úteis, não bloqueadores de código.

**CD:** não existe workflow de release. `render.yaml` descreve a API, mas não aplica migrations, não versiona imagem, não define rollback nem environment approval. O frontend não possui configuração de deploy versionada na raiz atual. Secrets dependem do painel.

O Dockerfile da API é multi-stage, instala somente produção e executa como `node`, ponto forte. O Dockerfile web é exclusivamente dev (`vite --host`, `npm install`, root) e não representa uma imagem de produção. No Compose, API usa target development e volume, adequado localmente.

Problema grave de configuração: Compose sobe `postgres`, mas injeta todo `api/.env`. Se esse arquivo contiver `DATABASE_URL` do Supabase, a API e migrations podem operar no remoto e ignorar `lol_postgres`. O Compose deveria sobrescrever explicitamente a URL local; produção deve usar env separado. `render.yaml` usa `/health` (readiness), correto para retirar instância sem banco.

## 13. Performance e escalabilidade

Não há evidência de gargalo atual, portanto recomendações devem ser guiadas por medição. Pontos concretos para teste:

- Listas de ligas, membros, requests, matches e standings não têm paginação. Uma liga aceita até 500 membros; payload, sort e render crescerão linearmente.
- Standings agrega snapshots de matches finalizadas em cada leitura; medir com milhares de partidas e `EXPLAIN (ANALYZE, BUFFERS)` antes de cache/materialização.
- Polling de match a cada 15s multiplica requests por abas apesar de Socket.IO.
- Worker busca eleições vencidas periodicamente; verificar query/index do deadline e lote antes de ampliar número de lobbies.
- Pool sem limite adaptado pode exceder conexões do Supabase ao escalar instâncias.
- SocketAccess faz varredura de todos os grants em `revokeLeague`; aceitável no single-instance/hobby, O(n sockets) em ligas excluídas.
- Bundle inicial web deve ser medido no CI; route splitting tem ganho provável sem mudar arquitetura.

Load test de maior valor: 50–200 usuários tentando join/ready/vote em lobbies distintas e na mesma última vaga, medindo p95, erros do pool e locks. Segundo: standings com histórico grande. Não há justificativa atual para Redis, Kafka ou microservices.

## 14. Qualidade do repositório

A árvore é compreensível, lockfiles existem e `.env`/`dist`/`node_modules` são ignorados. Contudo, `.pnpm-store/v11/projects/...` está versionada com uma cópia completa do frontend, configs e lockfile. Isso infla o repo, duplica código em buscas e pode confundir scanners/review. A regra atual ignora apenas três arquivos de banco da store, não o diretório.

Há mojibake em comentários do `.gitignore`, typo `league-members.repostitory.ts`, packages chamados genericamente `app`, comentário TODO sem ticket e `console.log` em UI/seed/server. O diretório websocket foi corrigido. Não foram observados `node_modules`, builds ou `.env` versionados pela consulta realizada. A tabela `standings` e arquivos Supabase auxiliares merecem confirmação de uso para remover dead schema/code somente em ticket próprio.

## 15. Portfólio e empregabilidade

O projeto prova:

- **Forte:** Node/TypeScript, SQL manual, PostgreSQL, transações, locks, invariantes, autorização multi-tenant, Socket.IO, testes de integração e CI.
- **Boa evidência:** React modular, TanStack Query, sessão/cache, Docker, migrations, ADRs e observabilidade básica.
- **Evidência parcial:** cloud (configs Render/Supabase, sem release reproduzível), performance (índices sem benchmark), UX/acessibilidade e operação de incidentes.
- **Sem evidência suficiente:** CD, rollback automatizado, backup restaurado em pipeline/runbook executado, load testing e ambiente de demonstração monitorado.

O README explica domínio e decisões, mas como peça de recrutamento começa pela instalação e não apresenta demo, screenshots/GIF, diagrama curto, status da CI, highlights técnicos ou decisões de concorrência em formato visual. O nome visível `FPL_LOL`, o repo `site_league_tournaments` e o produto “ligas” deveriam ser alinhados. Uma demo online com credenciais/seed seguras, vídeo curto do fluxo de 10 jogadores e seção “problemas difíceis resolvidos” aumentaria mais o valor de portfólio do que novas features.

## 16. Backlog recomendado

| ID | Prioridade | Categoria | Título | Problema | Impacto | Solução recomendada | Critérios de aceite |
|---|---|---|---|---|---|---|---|
| A1 | ALTO | DEVOPS | Isolar DATABASE_URL local do ambiente Supabase | Compose importa `api/.env` e não força a URL de `postgres` | Comando local/teste pode alterar banco remoto e o container PostgreSQL fica inutilizado | Sobrescrever URL local no Compose e separar templates dev/prod | `docker compose up` conecta apenas a `postgres`; migration local não alcança host externo; README documenta ambientes |
| A2 | ALTO | DEVOPS | Criar release com migration canônica e rollback operacional | Não existe CD nem etapa de migration no Render | Código pode subir antes do schema e produção não tem rollback reproduzível | Workflow/manual gate que aplica migration antes do tráfego, registra versão e define rollback | Deploy de staging parte de banco vazio e upgrade; falha de migration impede release; versão e rollback são documentados/testados |
| A3 | ALTO | OBSERVABILITY | Implementar graceful shutdown coordenado | SIGTERM não fecha HTTP, Socket, worker ou pool | Deploy pode interromper requests/transações e manter lifecycle inconsistente | Parar aceite, worker e sockets, aguardar limite e chamar `db.end()` | Teste/processo demonstra encerramento por SIGTERM sem novos ticks, com conexões fechadas e timeout de segurança |
| A4 | ALTO | SECURITY | Adicionar rate limiting para HTTP e ações Socket | API pública não limita abuso, joins ou reconnect | Exaustão de CPU/pool/quota Supabase em instância free | Limites simples por IP/user e por evento, com exceção controlada para health | 429/ack definido; limites configuráveis; testes de burst; métricas de rejeição; usuários normais não afetados |
| A5 | ALTO | DATABASE | Tornar upgrade Supabase compatível com histórico de migrations | Baseline aplicada diretamente pode não possuir `pgmigrations` | `migrate:up` pode tentar recriar tabelas em produção | Definir adoção/baseline do histórico e testar snapshot representativo antigo → HEAD | CI restaura snapshot anonimizado/schema legado, marca baseline de modo seguro, aplica novas migrations e compara schema |
| A6 | ALTO | OBSERVABILITY | Impedir rewrap de PoolClient reutilizado | `wrapClient` substitui `query` a cada checkout | Logs/transformações duplicam progressivamente e degradam diagnóstico/performance | Marcar client embrulhado via Symbol/WeakSet ou instrumentar Pool sem mutação repetida | Mesmo client obtido N vezes gera um log por erro e uma transformação; teste cobre callback e Promise |
| A7 | ALTO | SOCKET | Definir estratégia de revogação realtime multi-instância | Grants de sockets existem somente em memória | Ao escalar API, membro removido pode continuar recebendo evento em outra instância | Manter single-instance explicitamente ou adicionar adapter/broadcast de revogação antes de escalar | Config impede escala silenciosa ou teste com duas instâncias comprova revogação/reconnect global |
| A8 | MÉDIO | SECURITY | Proteger endpoint de métricas | `/metrics` é público | Expõe volume/estado operacional e facilita reconhecimento | Rede privada, token de scrape ou serviço separado | Acesso anônimo recebe 401/404 fora da rede; scraper autorizado funciona; health continua público |
| A9 | MÉDIO | SOCKET | Validar payloads Socket.IO antes do PostgreSQL | IDs arbitrários chegam aos repositories | Erros 22P02, ruído de logs e custo desnecessário | Schemas Zod para cada evento, limites e ack `VALIDATION_ERROR` | UUID inválido não executa query; ack determinístico; testes cobrem league/lobby e payload grande |
| A10 | MÉDIO | OBSERVABILITY | Correlacionar e registrar ações Socket recebidas | `runSocketAction` não cria contexto nem loga falha inesperada | Não é possível reconstruir operação realtime de entrada | Gerar/aceitar correlation ID confiável, ALS por ação e log seguro | Ack e logs compartilham ID; incluem user/event sem token/PII; teste verifica erro inesperado |
| A11 | MÉDIO | ARCHITECTURE | Extrair protocolos de seleção e draft do LobbiesService | Service de 693 linhas mistura subfluxos com transações | Revisões e mudanças têm área de regressão alta | Extrair orquestradores coesos mantendo lock/transação/executor no boundary do caso de uso | Service reduz responsabilidades; nenhum SQL volta ao service; testes concorrentes permanecem verdes |
| A12 | MÉDIO | DATABASE | Configurar pool e timeouts por ambiente | Pool usa apenas connectionString | Pode exceder cota Supabase ou esperar indefinidamente | Configurar max, connect/idle e statement timeout conforme tier; observar saturação | Envs documentadas; readiness diferencia indisponibilidade; teste de timeout; métrica/log de pool sem alta cardinalidade |
| A13 | MÉDIO | FRONTEND | Tornar logout consistente quando Supabase falha | Cache/UI são limpos antes de confirmar logout remoto | Reload pode autenticar novamente, confundindo usuário | Definir política: retry/erro bloqueante ou limpar sessão local Supabase de forma garantida | Teste simula `signOut` falho e estado/reload têm resultado explícito; mensagem é exibida |
| A14 | MÉDIO | PERFORMANCE | Remover polling redundante de MatchVoting | Cada aba consulta match a cada 15s além do realtime | Tráfego permanente e wakeups desnecessários | Usar socket invalidation + refetch em reconnect/focus, com fallback polling apenas se desconectado | Teste comprova atualização por evento/reconnect e ausência de polling quando conectado |
| A15 | MÉDIO | PERFORMANCE | Paginar coleções que podem crescer | Endpoints/listas retornam conjuntos completos; liga permite 500 membros | Payload, query e render crescem linearmente | Cursor/limit para members, requests, matches e descoberta, preservando UX | Limite máximo; ordem estável; metadata/cursor; testes sem duplicação/perda |
| A16 | MÉDIO | TEST | Adicionar testes de formulário, acessibilidade e navegação browser | Testes frontend mockam hooks e não exercitam fluxos completos | Regressões de wiring, teclado e mobile passam na CI | Testing Library para forms/erros e poucos E2E críticos em browser | Login→liga→lobby/voto, erro de mutation, teclado e viewports definidos rodam deterministicamente na CI |
| A17 | MÉDIO | DEVOPS | Validar imagem e Compose na CI | CI testa Node diretamente, não artefato/container | Dockerfile ou healthcheck podem quebrar sem sinal | Build/smoke da imagem API e profile Compose isolado | Imagem sobe non-root, readiness passa, migrations aplicam e shutdown funciona |
| A18 | MÉDIO | PERFORMANCE | Medir standings e concorrência sob carga | Agregação e locks são corretos, mas sem dados de latência | Não há limite operacional conhecido | Cenários k6/artillery e EXPLAIN com dataset representativo | p50/p95, pool/lock errors e plano são registrados; otimização só vira ticket se threshold falhar |
| A19 | BAIXO | CLEANUP | Remover `.pnpm-store` versionada | Store contém cópia integral do frontend | Repo inchado, buscas duplicadas e apresentação ruim | Ignorar diretório e removê-lo do índice Git | `git ls-files .pnpm-store` vazio; clone+`npm ci` funciona; nenhum arquivo fonte perdido |
| A20 | BAIXO | CLEANUP | Corrigir naming e mojibake residuais | `repostitory`, comentários corrompidos e packages `app` | Reduz clareza e impressão profissional | Renomear arquivo/imports, salvar UTF-8 e dar nomes aos packages | `rg` não encontra mojibake/typo; build/lint/test passam; lockfiles atualizados |
| A21 | BAIXO | DATABASE | Remover ou formalizar tabela standings legada | Schema possui `standings`, enquanto cálculo usa snapshots | Duas aparentes fontes de verdade confundem manutenção | Confirmar ausência de uso e migrar remoção, ou documentar finalidade real | Uma única fonte declarada; migration segura; schema compare e testes verdes |
| A22 | BAIXO | FRONTEND | Dividir bundle por rotas e registrar budget | App carrega páginas em um chunk inicial | First load maior, sobretudo celular | `React.lazy` por rota e budget simples de bundle | Rotas carregam sob demanda; fallback acessível; tamanho inicial abaixo do budget documentado |
| A23 | BAIXO | PORTFOLIO | Transformar README em vitrine verificável | README técnico não mostra demo/visual/CI | Recrutador não percebe rapidamente a profundidade | Adicionar demo, screenshots/GIF, diagrama, badges e highlights | Links funcionam; setup continua; seção resume concorrência, testes e decisões em menos de dois minutos |
| A24 | BAIXO | CLEANUP | Revisar código opcional Riot e projeções SELECT * | Feature pouco testada e repositories retornam todas as colunas | Superfície e contratos podem crescer acidentalmente | Decidir manutenção Riot e trocar `SELECT *` em fronteiras sensíveis por projeções | Decisão documentada; testes mínimos da opção escolhida; responses não mudam ao adicionar coluna |

## 17. Ordem recomendada de execução

### Agora

A1, A3, A4, A5 e A6. Eles reduzem risco de banco errado, deploy interrompido, abuso público, upgrade inviável e degradação silenciosa de logs/conexão. A8 e A9 cabem no mesmo hardening de exposição pública.

### Próxima fase

A2, A10, A11, A12, A13, A14, A16 e A17. Elevam release, diagnóstico, manutenção e confiança de frontend sem alterar o produto central. A7 deve ser decidido antes de configurar mais de uma instância.

### Portfólio

A19, A20 e A23, seguidos de A22. Primeiro limpe o repositório, depois apresente demo/arquitetura e então otimize a entrega visual com números.

### Futuro / escala

A15 e A18 quando houver dataset/tráfego representativo; A21 e A24 em uma janela de limpeza de schema. A7 pode ficar documentado como single-instance enquanto essa for uma restrição consciente, mas deixa de ser “futuro” no momento em que houver scale-out.

## 18. Avaliação profissional

| Área | Nota | Justificativa |
|---|---:|---|
| Backend Node/TS | 8,0 | Camadas claras, contratos e domínio robusto; lifecycle e service de lobby ainda precisam amadurecer. |
| SQL/PostgreSQL | 8,5 | SQL manual, FKs compostas, índices parciais, triggers deferred e migrations demonstram domínio real. |
| Concorrência | 8,5 | Locks por agregado, testes concorrentes/rollback e idempotência são evidências fortes. |
| Arquitetura | 7,5 | Monólito modular adequado e sem abstrações gratuitas; concentração em Lobbies e fronteira global de mapping são dívidas. |
| Segurança | 7,0 | AuthN/AuthZ/IDOR e respostas seguras são boas; rate limit, metrics e validação Socket faltam para internet pública. |
| Testes | 8,0 | Integração real e cenários difíceis são excelentes; frontend/E2E/migration upgrade ainda estreitos. |
| React | 7,0 | Estrutura, Query e lifecycle sólidos; formulários, acessibilidade, bundle e testes integrados têm pouca evidência. |
| Realtime | 7,5 | Rooms, revogação, ack e reconnect bem tratados em uma instância; scale-out e observabilidade inbound abertos. |
| Observabilidade | 6,5 | Boa base de logs/ALS/métricas/health, mas há rewrap, console, endpoint aberto e falta shutdown/alerta. |
| CI/CD | 6,5 | CI é forte; CD inexiste. A média não deve esconder essa diferença. |
| DevOps/Cloud | 5,5 | Docker API e configs existem, porém env local perigoso e release/rollback/migration cloud não são reproduzíveis. |
| Performance | 5,5 | Índices e limites básicos existem; sem benchmark/load test, polling e paginação continuam abertos. |
| Documentação | 8,0 | ADRs, contratos e runbooks são bons; faltam alinhamento de nomes e validação operacional demonstrada. |
| Apresentação de portfólio | 6,5 | Profundidade técnica alta, mas repo sujo e ausência de demo/visual escondem valor. |

**O que esse projeto atualmente prova sobre o nível do desenvolvedor?**

Ele prova capacidade de desenvolvedor Pleno forte, com sinais de Senior em backend transacional: identifica invariantes, escolhe pontos de serialização, combina aplicação e banco, testa races reais e documenta decisões. A evidência é especialmente convincente em PostgreSQL, autorização e Socket.IO. Ainda não prova maturidade Senior completa de produção porque configuração de ambientes, lifecycle do processo, release/migrations cloud, limites operacionais e observação sob carga não estão fechados. No full stack, prova boa competência React, mas o backend é claramente a parte mais madura. Corrigir os itens “Agora”, demonstrar um deploy reproduzível e apresentar o projeto melhor teria mais valor profissional do que adicionar novas funcionalidades.
