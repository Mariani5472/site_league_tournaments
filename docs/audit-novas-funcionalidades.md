# FPL_LOL — Auditoria de novas funcionalidades e Super Admin

Data da revisão: 2026-08-19  
Escopo inspecionado: `api/src`, `api/migrations`, `api/supabase/migrations`, `api/tests`, `web/src`, `docs/audit.md`, `docs/audit-1.md` e `docs/audit-frontend.md`.  
Regra desta fase: análise apenas; nenhuma funcionalidade, endpoint ou migration foi implementado.

## 1. Executive Summary

O FPL_LOL já é um produto funcional, não um protótipo vazio. O loop liga → lobby → times → ready → partida → voto → resultado → standings está representado no backend e no frontend, com locks, transações, snapshots de participantes, Socket.IO como mecanismo de invalidação e PostgreSQL como fonte de verdade. Capacidades que audits anteriores tratavam como futuras — dashboard acionável, perfil público seguro, busca de jogadores, convites `invite_only`, paginação, detalhe de partida, tema e onboarding — já existem no código atual.

As melhores próximas funcionalidades não são uma rede social nem uma integração profunda com Riot. São extensões pequenas dos dados confiáveis já existentes:

1. fechar o acompanhamento de solicitações de entrada para o solicitante;
2. oferecer “jogar novamente” sem reinscrição automática de participantes;
3. enriquecer standings com forma recente e sequências calculadas do histórico real;
4. permitir um aviso fixado e, depois, agendamento/RSVP para grupos que combinam partidas;
5. criar notificações persistentes somente para ações que não podem ser perdidas;
6. preparar operação segura antes de lançamento público.

A lacuna mais importante para 500 usuários amanhã seria operacional. Hoje não há papel global confiável, suspensão/banimento, estado operacional de liga, revogação coordenada de sessões, console `/ops` nem trilha de auditoria. Um painel visual sem esses fundamentos seria perigoso. A primeira versão de Ops deve ser pequena: autorização server-side, busca e inspeção paginadas, suspensão reversível de usuário/liga, revogação de sessão e audit log append-only.

Recomendação central: completar o loop e a operação antes de adicionar amplitude social. Chat, friends, marketplace, moeda, achievements genéricos e clone da Riot são excesso de escopo.

## 2. Current Product Capabilities

### Existing Capabilities

| Capability | Backend | Frontend | Completa? | Potencial não explorado |
| --- | --- | --- | --- | --- |
| Autenticação | Supabase Auth, sync local, middleware HTTP/Socket | login, cadastro, confirmação, recovery/reset, sessão expirada | Sim para o escopo atual | MFA/reauth apenas para operadores futuros |
| Perfil próprio | nickname, avatar, banner, data de criação; limpeza com `null` | visualização e edição separadas, fallbacks | Sim | bio curta não justifica nova tabela agora |
| Perfil de jogador | projeção sem email/PUUID, stats e dados públicos | `/players/:userId` dentro da área autenticada | Sim | forma recente e record por liga |
| Descoberta de jogadores | busca por nickname, cursor, limit e rate limit | `/players`, debounce e load more | Sim | ação contextual de convidar já pode ser ampliada |
| Ligas | create, mine, discover, detail, update, delete, capacidade | descoberta, overview, tabs e settings | Sim | regras, aviso fixado e lifecycle operacional |
| Membership e roles | owner/admin/player/spec, transferência e remoção transacionais | membros, alteração de role e saída por `/members/me` | Majoritariamente | papel `spec` ainda precisa de contrato explícito |
| Join requests | create/list/update/delete, capacidade no aceite | administração de requests | Parcial | solicitante precisa ver/cancelar seu pending sem inferir por erro |
| Convites `invite_only` | pending/accepted/rejected/cancelled, deduplicação, aceite transacional, realtime | busca/envio, inbox, aceitar/recusar | Sim | expiração e histórico administrativo só quando houver volume |
| Lobbies | waiting/in_game/finished/cancelled, criação por policy, auto-start, leave/release presence | fases, ações, realtime e feedback de conexão | Sim, com riscos concorrentes residuais | agendamento/RSVP e rematch |
| Formação de times | random, balanced, player picks, consenso, capitães e draft | fluxo interativo | Sim | não adicionar formulários manuais de gameplay |
| Ready/start | ready individual, bloqueios de start e auto-start para lobby 10 | feedback de fase e bloqueios | Sim | corrigir concorrências restantes antes de novas regras |
| Partidas | snapshot, votação idempotente, maioria, resolução admin, detalhe | voto, histórico e `/matches/:matchId` | Sim | rematch e compartilhamento simples |
| Standings | calculados de matches/match_players; sem tabela duplicada | posição, record e win rate | Sim | últimos 5, streak e mudança de posição derivável apenas com janela definida |
| Dashboard | endpoint agregado sem fan-out, ações pendentes, ligas/matches recentes | resumo acionável e onboarding | Sim | incluir convite/request própria quando o contrato existir |
| Paginação | cursor/limit em listas crescentes | infinite/load more e deduplicação | Sim nas listas principais | manter padrão em Ops e notifications |
| Realtime | rooms, revogação de membership, correlation IDs, invalidações | refetch por eventos/reconnect | Sim para instância única documentada | disconnect imediato em ban/suspensão futura |
| Observabilidade | logs estruturados, métricas, readiness/liveness, pool configurável | estados de erro | Sim para escala atual | painel Ops deve apontar para observabilidade, não copiá-la |
| Tema/i18n/acessibilidade | — | pt-BR tipado, Intl, light/dark/system, async states, 403/404 | Sim como base | tradução en-US completa pode esperar demanda |
| Super Admin | inexistente | inexistente | Não | baseline necessário antes de lançamento público |

## 3. Core Product Loop

```text
descobrir/criar liga
        ↓
entrar por open, request ou convite
        ↓
ver próxima ação no dashboard
        ↓
criar/entrar em lobby
        ↓
formar times → ready → iniciar
        ↓
jogar → votar/ resolver
        ↓
resultado → standings → histórico
        ↓
jogar novamente
```

O código cobre até histórico. A transição menos assistida é histórico → nova partida. O segundo ponto fraco é organização antes da lobby: hoje a plataforma funciona melhor quando o grupo já combinou tudo fora dela.

## 4. Product Gaps

- O solicitante de entrada não tem um estado próprio claro e persistente na experiência principal.
- Não existe atalho seguro de partida finalizada para uma nova lobby.
- Standings usam dados corretos, porém aproveitam pouco o histórico para comunicar momento competitivo.
- Não existe mecanismo proporcional de organização: aviso fixado primeiro; agenda/RSVP depois.
- Toast realtime não cobre eventos ocorridos quando o usuário estava offline.
- `spec` existe no domínio, mas não possui uma promessa de produto suficientemente clara.
- Não há estados operacionais de usuário/liga nem ferramentas globais seguras.
- Correções excepcionais de partida não têm workflow operacional auditável.

## 5. Existing Capabilities Not Fully Used

1. `match_players.result`, `finished_at` e snapshots permitem últimos 5, streak atual e record por liga sem Riot.
2. O detalhe de partida e o CTA pós-jogo permitem originar uma nova lobby com configuração sugerida.
3. O player discovery já fornece o fundamento para convites e ligas em comum; friends seria redundante.
4. O dashboard agregado pode absorver convites, request própria e lobby agendada sem fan-out.
5. Correlation IDs e eventos Socket.IO formam uma base útil para auditabilidade e desconexão operacional.
6. O status `cancelled` de match/lobby existe, mas operações globais precisam de casos de uso explícitos, não edição genérica.

### NF-00 — Estado e cancelamento da solicitação própria

Category: LEAGUE MANAGEMENT / ONBOARDING  
Problem: depois de solicitar entrada, o jogador não consegue consultar o próprio estado; o CTA continua dependente de memória ou de um erro `409`.  
Current capability: criação e cancelamento autorizado para o próprio solicitante já existem, mas a listagem é exclusiva de owner/admin e a UI não guarda o identificador da request.  
Proposal: endpoint/projeção `mine` por liga que retorne no máximo a request relevante e permita cancelá-la; refletir pending/approved/rejected no CTA e no dashboard.  
User value: 5  
Frequency: 3  
Product fit: 5  
Implementation cost: 2  
Maintenance cost: 1  
Risk: 2  
Dependencies: contrato de erro/status e invalidação realtime já existentes.  
Backend impact: leitura restrita a `request.user.id`, sem reutilizar a listagem administrativa.  
Frontend impact: estados solicitar, pendente/cancelar, aprovada e rejeitada; loading inicial separado de mutation.  
Database impact: nenhum.  
Security considerations: nunca permitir consultar requests de outro usuário; resposta mínima sem dados administrativos.  
Priority: P1  
Recommendation: implementar antes de novas features; fecha um fluxo que já está quase completo.

## 6. User Identity Opportunities

Priorizar record global confiável, record por liga, últimos jogos e forma recente. Data de entrada, avatar/banner, ligas públicas e histórico já existem. Uma bio curta tem baixo impacto no loop e pode esperar. Badges só devem nascer de fatos estáveis — por exemplo, campeão de season quando seasons existirem — e não de gamificação arbitrária.

### NF-01 — Forma recente e sequências

Category: USER IDENTITY / COMPETITIVE FEATURES  
Problem: perfil e standings mostram totais, mas não comunicam momento competitivo.  
Current capability: partidas finalizadas preservam participante, time, resultado e data.  
Proposal: exibir últimos 5 (`W W L W W`) e streak atual, global e por liga quando aplicável.  
User value: 4  
Frequency: 4  
Product fit: 5  
Implementation cost: 2  
Maintenance cost: 1  
Risk: 2  
Dependencies: somente histórico confiável existente.  
Backend impact: projeções SQL com ordenação estável; evitar N+1.  
Frontend impact: células/badges textuais, nunca somente cor.  
Database impact: nenhum inicialmente; calcular on read.  
Security considerations: respeitar visibilidade das ligas nos perfis.  
Priority: P2  
Recommendation: implementar antes de Elo/MMR ou achievements.

## 7. Player Discovery Opportunities

Busca, perfil seguro, paginação e ligas públicas/em comum já estão implementados e devem permanecer autenticados. “Perfil público” significa projeção apresentável a outros jogadores, não rota anônima. Não expor email, auth metadata, Riot PUUID ou memberships privadas. A próxima melhoria proporcional é ação contextual “convidar para uma liga elegível” no resultado/perfil, reaproveitando o fluxo de convite existente.

### NF-02 — Convite contextual pelo perfil

Category: PLAYER DISCOVERY / LEAGUE MANAGEMENT  
Problem: descobrir e convidar ainda são passos separados.  
Current capability: player search seguro e convite persistente já existem.  
Proposal: no perfil/resultado, listar apenas ligas `invite_only` em que o ator é owner/admin e o alvo ainda não é membro/convidado.  
User value: 3  
Frequency: 2  
Product fit: 4  
Implementation cost: 2  
Maintenance cost: 2  
Risk: 2  
Dependencies: convite existente e projeção de elegibilidade.  
Backend impact: endpoint/projeção estreita; autorização repetida no comando final.  
Frontend impact: dialog contextual, feedback 403/409.  
Database impact: nenhum.  
Security considerations: não revelar ligas privadas que o ator não administra.  
Priority: P3  
Recommendation: quick win depois de fechar requests próprias.

## 8. League Features

As features com melhor relação valor/custo são regras textuais e um aviso fixado. Avatar/banner de liga tem valor de identidade moderado; cores customizáveis devem ser evitadas porque quebram consistência e contraste.

### NF-03 — Regras e aviso fixado da liga

Category: LEAGUE MANAGEMENT / ADMINISTRATION  
Problem: regras e recados dependem de memória ou Discord e não ficam no contexto da liga.  
Current capability: descrição única, sem conteúdo operacional destacado.  
Proposal: `rules` em Markdown sanitizado simples e um anúncio fixado com autor/data. Começar por texto simples; sem rich text complexo.  
User value: 4  
Frequency: 3  
Product fit: 4  
Implementation cost: 2  
Maintenance cost: 2  
Risk: 2  
Dependencies: autorização owner/admin e sanitização.  
Backend impact: update explícito e projeção.  
Frontend impact: seção colapsável de regras e banner discreto.  
Database impact: colunas ou tabela pequena para anúncio; histórico só se surgir necessidade.  
Security considerations: limitar tamanho e sanitizar Markdown/links.  
Priority: P2  
Recommendation: anúncio fixado é mais proporcional que chat.

### NF-04 — Identidade visual da liga

Category: LEAGUE CUSTOMIZATION  
Problem: ligas têm pouca identidade visual entre si.  
Current capability: nome e descrição.  
Proposal: avatar e, opcionalmente, banner com o mesmo pipeline/fallback do perfil. Não permitir temas ou CSS por liga.  
User value: 3  
Frequency: 2  
Product fit: 3  
Implementation cost: 3  
Maintenance cost: 2  
Risk: 3  
Dependencies: política de upload/URLs e remoção segura.  
Backend impact: validação e DTO público.  
Frontend impact: header e fallbacks responsivos.  
Database impact: duas colunas opcionais.  
Security considerations: imagens remotas, tracking e conteúdo abusivo; preferir storage controlado antes de escala pública.  
Priority: P3  
Recommendation: avatar antes de banner; sem customização de cores.

## 9. Match Features

Detalhe, times, participantes, vencedor, data, resolution e votos agregados já existem; voto individual não é exposto. O melhor fechamento é rematch. Uma timeline “textual” só deve refletir fatos persistidos (início, resolução e fim); sem eventos de gameplay, seria decorativa.

### NF-05 — Jogar novamente

Category: MATCH MANAGEMENT / RETENTION  
Problem: após o resultado, repetir a sessão exige navegar e recriar tudo manualmente.  
Current capability: match aponta para lobby/league e preserva participantes/configuração.  
Proposal: owner/admin cria uma nova lobby com tamanho/configuração sugeridos; participantes anteriores recebem sugestão/convite para entrar e precisam aceitar/entrar e marcar ready novamente.  
User value: 5  
Frequency: 4  
Product fit: 5  
Implementation cost: 3  
Maintenance cost: 2  
Risk: 3  
Dependencies: não existir outra waiting lobby na liga; policy de criação; presença atual dos jogadores.  
Backend impact: comando explícito e idempotente, reaproveitando `create` do domínio.  
Frontend impact: CTA no detalhe/pós-jogo com conflitos claros.  
Database impact: opcional `rematch_of_match_id` para rastreabilidade; não copiar votes/results.  
Security considerations: não inserir jogadores silenciosamente nem reservar vagas sem consentimento.  
Priority: P2  
Recommendation: alta prioridade de produto, depois de estabilidade concorrente da lobby.

## 10. Competitive Features

Posição, jogos, vitórias, derrotas e win rate são confiáveis. Forma e streak adicionam leitura esportiva por baixo custo. “Movimentação de posição” só é correta se houver snapshots de standings por período; inferir a posição anterior a partir do estado atual seria enganoso. Elo/MMR não resolve um problema demonstrado e introduz debates de fórmula, resets e fairness.

### NF-06 — Standings enriquecidos

Category: COMPETITIVE FEATURES  
Problem: a tabela é correta, mas pouco expressiva.  
Current capability: standings on read a partir de partidas finalizadas.  
Proposal: últimos 5 e streak; manter posição/record/win rate. Adiar movimentação até existir snapshot temporal explícito.  
User value: 4  
Frequency: 4  
Product fit: 5  
Implementation cost: 2  
Maintenance cost: 2  
Risk: 2  
Dependencies: NF-01.  
Backend impact: query agregada/window functions com testes de empates.  
Frontend impact: tabela responsiva e labels acessíveis.  
Database impact: nenhum até métricas mostrarem custo.  
Security considerations: sem novos dados sensíveis.  
Priority: P2  
Recommendation: calcular on read; materializar somente após medir.

## 11. Statistics Opportunities

Métricas válidas hoje: total de partidas, record, win rate, atividade por período, streak atual/maior, forma recente e jogador mais ativo. “Melhor win rate” exige mínimo de partidas para não premiar 1–0. “Partidas por semana” é útil para saúde da liga, não como ranking individual. Não existem dados confiáveis para KDA, CS, champions, dano ou mastery.

Política recomendada:

- on read para últimos 5, streak e agregados por liga na escala atual;
- índices sobre `matches(league_id, finished_at/id)` e `match_players(user_id/match_id)` conforme plano real;
- materialização somente se métricas mostrarem latência/custo, com job idempotente e fonte canônica ainda sendo matches.

## 12. Notifications

Toast realtime é adequado para confirmação imediata enquanto a aba está aberta, mas inadequado para convite, aprovação, lobby agendada e voto pendente que podem ocorrer offline. E-mail para todos os eventos criaria configuração, deliverability e ruído prematuros.

### NF-07 — Inbox mínima de notificações

Category: NOTIFICATIONS / RETENTION  
Problem: ações importantes podem ser perdidas fora da sessão.  
Current capability: eventos Socket.IO e dashboard cobrem estado atual, sem histórico de entrega/leitura.  
Proposal: inbox persistente apenas para convite, request decidida, lobby agendada/aberta e voto pendente; deduplicar por evento/entidade e permitir marcar como lida. O estado de domínio continua sendo a fonte de verdade.  
User value: 4  
Frequency: 3  
Product fit: 4  
Implementation cost: 4  
Maintenance cost: 3  
Risk: 3  
Dependencies: catálogo de eventos e política de retenção.  
Backend impact: criação pós-commit, listagem cursor e read state.  
Frontend impact: contador e inbox, sem duplicar toasts.  
Database impact: tabela `notifications` com dedupe key e expiração/retention.  
Security considerations: payload mínimo, autorização por destinatário, evitar texto com PII.  
Priority: P3  
Recommendation: primeiro colocar convites/request/votos no dashboard; persistir inbox quando perda offline for comprovada.

E-mail deve ser opt-in e inicialmente reservado a recovery/auth ou lobby agendada. Não enviar cada evento realtime.

## 13. Sharing

Copiar link interno da liga e da partida é um quick win autenticado. Um card de resultado compartilhável pode ser P4. Página anônima de liga pública não é necessária para o loop atual e exigiria consentimento/projeções específicas. Se criada, deve omitir membros por padrão ou exigir uma preferência explícita de exposição.

### NF-08 — Compartilhamento seguro de links

Category: SHARING  
Problem: usuários não têm ação uniforme para compartilhar contexto.  
Current capability: rotas estáveis de liga e match, ambas autenticadas.  
Proposal: “Copiar link” com indicação de que login/membership pode ser exigido; usar Web Share API quando disponível.  
User value: 3  
Frequency: 3  
Product fit: 3  
Implementation cost: 1  
Maintenance cost: 1  
Risk: 1  
Dependencies: nenhuma.  
Backend impact: nenhum.  
Frontend impact: CTA reutilizável e feedback.  
Database impact: nenhum.  
Security considerations: compartilhar URL não concede autorização.  
Priority: P3  
Recommendation: quick win; não tornar dados privados públicos para fazê-lo.

## 14. Integrations

Discord é onde muitos grupos já combinam partidas; um webhook unilateral agrega mais que chat interno. Começar com poucos eventos e segredo armazenado somente no backend. Public API, bot bidirecional e webhooks genéricos podem esperar.

### NF-09 — Webhook Discord por liga

Category: INTEGRATIONS / ORGANIZATION  
Problem: administradores repetem manualmente avisos de lobby e resultado no Discord.  
Current capability: eventos de domínio/realtime já identificam liga, lobby e match.  
Proposal: webhook opcional para lobby aberta, partida finalizada e lobby agendada; retry limitado, timeout e disable automático após falhas persistentes.  
User value: 4  
Frequency: 4  
Product fit: 4  
Implementation cost: 4  
Maintenance cost: 4  
Risk: 4  
Dependencies: eventos pós-commit confiáveis e secret storage.  
Backend impact: outbound worker simples; nunca bloquear transação/HTTP.  
Frontend impact: settings com teste de conexão e status.  
Database impact: configuração criptografada/segredo fora de respostas.  
Security considerations: SSRF, rotação, redaction, rate limit e autorização owner.  
Priority: P3  
Recommendation: validar demanda antes; preferível a chat.

## 15. Retention Features

Retenção saudável vem de utilidade: próxima ação, convite, lobby pronta, voto pendente, sequência e rematch. Não usar streak de login, moeda ou notificações artificiais.

### NF-10 — Lobby agendada com RSVP

Category: ORGANIZATION / RETENTION  
Problem: o produto começa quando todos já estão presentes; grupos que combinam horário dependem integralmente de ferramenta externa.  
Current capability: lobby representa presença imediata e libera vaga ao sair da página.  
Proposal: entidade de evento agendado separada da lobby ativa; admin define data/timezone e capacidade, jogadores respondem sim/não. No horário, uma lobby pode ser criada e participantes ainda precisam entrar.  
User value: 4  
Frequency: 3  
Product fit: 4  
Implementation cost: 5  
Maintenance cost: 4  
Risk: 4  
Dependencies: notifications e semântica de timezone/cancelamento.  
Backend impact: novo domínio, não sobrecarregar `lobbies.waiting`.  
Frontend impact: calendário/lista, RSVP e estados atrasado/cancelado.  
Database impact: schedules + responses.  
Security considerations: autorização, spam e exposição de horários.  
Priority: P3  
Recommendation: big bet validável; começar com aviso fixado e medir demanda.

## 16. Features Not Recommended

| Feature | Classificação | Motivo |
| --- | --- | --- |
| Chat interno | OUT OF SCOPE | Discord resolve melhor; moderação, retenção e realtime de mensagens desviam do core. |
| Friends/follow | OUT OF SCOPE | busca + perfil + ligas em comum + convite cobrem o caso real. |
| Feed social global | OUT OF SCOPE | exige privacidade/moderação e inventaria eventos retroativos. |
| Marketplace/moeda | OUT OF SCOPE | sem economia ou problema de usuário associado. |
| KDA/CS/champions/damage | OUT OF SCOPE | plataforma não possui fonte Riot de partida confiável. |
| Elo/MMR | P4 | fórmula e resets aumentam conflito; record/forma atendem o estágio atual. |
| Achievements genéricos | P4 | gamificação prematura e manutenção de regras. |
| Favoritos | P4 | navegação, dashboard e ligas recentes já reduzem o custo de acesso. |
| Export CSV | P4 | baixo uso provável; implementar somente sob demanda de administradores. |
| Imagem compartilhável | P4 | melhora divulgação, não o loop; link simples vem primeiro. |
| Página pública anônima | P4 | valor incerto e risco de privacidade; perfil “público” deve seguir autenticado. |
| CRUD/SQL console em Ops | OUT OF SCOPE | ignora invariantes e amplia drasticamente o blast radius. |
| Microservices/Kafka/CQRS | OUT OF SCOPE | monólito modular é proporcional e mais operável. |

### Seasons

Seasons podem preservar vencedores históricos e permitir reset competitivo, mas alteram matches, standings, filtros, liga ativa, datas e migração do histórico. Devem ser P4 até ligas reais pedirem ciclos. Membership pode permanecer na liga; matches e standings precisam de `season_id`; uma única season ativa deve ser garantida. Não resetar/apagar histórico.

## 17. Super Admin Overview

Usar `/ops`, deixando explícito que a área é operacional e distinta da administração de uma liga. O console não deve ser um editor de tabelas. Cada botão chama um caso de uso explícito, com autorização backend, motivo, confirmação proporcional, transação, idempotência, correlation ID e audit log.

Escopo inicial recomendado:

- busca/inspeção paginada de usuários e ligas;
- suspensão/reativação de usuário;
- suspensão/reativação de liga;
- revogação de sessões e desconexão realtime;
- cancelamento de lobby travada;
- audit log consultável.

Ban, transferência de ownership e correção de match vêm depois. Hard delete de usuário não pertence à primeira versão.

## 18. Platform Authorization Model

Criar uma fonte server-side dedicada, conceitualmente:

```text
platform_roles
- user_id (FK users, unique por papel ativo ou PK composta)
- role: super_admin | moderator | support
- created_at
- created_by
- revoked_at
```

Para a primeira versão, somente `super_admin` pode ser suficiente. Claims Supabase podem acelerar checks, mas revogação e freshness precisam ser resolvidas; uma tabela consultada/cached server-side é mais auditável. Se claims forem usadas, o backend ainda deve validá-las e atualizar tokens após mudança. Nunca confiar em `profile.role`, React, botão oculto ou localStorage.

Permissões:

- PLAYER: usa produto e age nas ligas onde é membro;
- LEAGUE ADMIN: administra uma liga, sem autoridade global;
- LEAGUE OWNER: autoridade máxima apenas da liga;
- PLATFORM MODERATOR: futura moderação reversível e limitada;
- PLATFORM SUPER ADMIN: operações globais sensíveis e gestão de papéis.

Nenhuma role de liga implica role de plataforma.

## 19. Super Admin Dashboard

O dashboard Ops deve mostrar filas acionáveis, não números decorativos:

- usuários/ligas suspensos com término próximo;
- lobbies `waiting` ou matches `in_game` anormalmente antigos;
- falhas recentes de operações administrativas;
- volume de usuários/ligas apenas como contexto;
- links para métricas/logs existentes, em vez de replicar observabilidade.

“Usuário ativo” precisa de definição (por exemplo, ação autenticada nos últimos 30 dias) e dado de última atividade que hoje não existe de forma adequada. Não exibir a métrica até definir e persistir o sinal.

## 20. User Management

`/ops/users` deve listar nickname, status e criação, com busca por nickname/UUID e paginação. Email só aparece no detalhe quando necessário para suporte. Detalhe: memberships, roles por liga, partidas recentes, estado operacional e histórico administrativo.

Ações explícitas:

```text
POST /ops/users/:id/suspend
POST /ops/users/:id/unsuspend
POST /ops/users/:id/ban
POST /ops/users/:id/unban
POST /ops/users/:id/revoke-sessions
POST /ops/leagues/:leagueId/members/:memberId/remove
```

Remover membership deve chamar o serviço de domínio existente, inclusive revogação de rooms. Não editar linhas diretamente.

## 21. User Suspension and Ban

Modelo conceitual em `users` ou tabela 1:1 de estado operacional:

```text
status: active | suspended | banned
suspended_until
moderation_reason
banned_at
moderated_by
updated_at
```

Suspensão exige motivo e duração explícita (1/7/30 dias ou timestamp), é reversível e bloqueia novas ações autenticadas. Um job não é obrigatório para expirar: middleware pode tratar `suspended_until <= now()` como ativo, enquanto manutenção posterior normaliza o estado.

Ban deve:

1. persistir estado e audit log na mesma transação local;
2. impedir novos requests/sockets no middleware;
3. revogar sessões via Supabase Admin API;
4. desconectar todos os sockets do usuário e revogar rooms;
5. preservar perfil mínimo, matches, votes e standings históricos.

Falha parcial da Admin API precisa aparecer como operação incompleta/retriável, não ser escondida. A service-role key permanece somente no backend.

### NF-11 — Moderação reversível de usuário

Category: MODERATION / PLATFORM OPERATIONS  
Problem: impedir abuso exige intervenção manual no banco/Auth e não deixa trilha.  
Current capability: autenticação e sockets, sem estado global.  
Proposal: suspend/unsuspend e revoke sessions; ban/unban na fase seguinte.  
User value: 5 (operacional)  
Frequency: 2  
Product fit: 5  
Implementation cost: 5  
Maintenance cost: 4  
Risk: 5  
Dependencies: platform roles, audit log e Supabase Admin API.  
Backend impact: middleware, services explícitos, socket registry e compensação/retry.  
Frontend impact: dialogs com motivo e status.  
Database impact: estado operacional e logs.  
Security considerations: reauth/MFA, proteção contra auto-ban/último admin e least privilege.  
Priority: P1 antes de lançamento público; P3 enquanto uso for privado  
Recommendation: entregar suspensão antes de hard ban.

## 22. User Deletion Strategy

Não oferecer hard delete na primeira versão de Ops. Usuário participa de snapshots, votos, ownership, memberships, requests e audit logs; apagar em cascade compromete história e responsabilização.

Estratégia futura:

- ban para impedir acesso;
- workflow separado de exclusão solicitada;
- transferir ownership obrigatório;
- anonimizar email/nickname/avatar/banner e remover Riot link;
- preservar IDs pseudonimizados em snapshots históricos;
- revogar sessão e, por último, remover identidade Supabase quando seguro;
- reautenticação, dupla confirmação e audit log.

## 23. League Management

`/ops/leagues` deve listar nome, owner, status operacional, visibility, join policy, membros/capacidade, criação e última atividade definida. Busca cursor por nome/UUID/owner. Detalhe mostra membros, lobbies/matches recentes e audit trail.

Ações explícitas: suspend, reactivate, archive, transfer ownership e remoção de membro. Edição de metadata deve ser excepcional, campo fechado e auditado; o caminho normal pertence ao owner.

## 24. League Suspension / Archive / Delete

- `active`: fluxo normal.
- `suspended`: visível a owner/admin e Ops; bloqueia join/request/invite, criação/entrada/start de lobby e mutations competitivas; histórico permanece legível.
- `archived`: encerramento voluntário/read-only; não representa punição e pode ser solicitado pelo owner.

Delete global é último recurso. Exigir motivo, digitação do nome, reauth, confirmação de impacto e log. Preferir archive/soft delete. Se hard delete existir, decidir antes o destino de matches e snapshots; cascade silencioso não é aceitável.

### NF-12 — Lifecycle operacional de liga

Category: LEAGUE MANAGEMENT / MODERATION  
Problem: hoje uma liga apenas existe ou é apagada.  
Current capability: visibility e join policy, que não representam estado operacional.  
Proposal: active/suspended/archived com comandos explícitos e guards centrais.  
User value: 4  
Frequency: 2  
Product fit: 4  
Implementation cost: 4  
Maintenance cost: 3  
Risk: 4  
Dependencies: platform auth e audit log.  
Backend impact: guard compartilhado nos casos de uso; leitura histórica preservada.  
Frontend impact: status textual e telas read-only.  
Database impact: status, timestamps e actor/reason em log.  
Security considerations: owner não pode reativar suspensão de plataforma.  
Priority: P1 antes de lançamento público  
Recommendation: suspend primeiro; archive pode vir na trilha de produto.

## 25. Lobby Operations

`/ops/lobbies` é ferramenta de diagnóstico: busca por ID/liga/status/data, participantes e fase. A primeira ação é cancelar uma lobby travada usando o boundary transacional do domínio, emitir `LOBBY_DELETE`, invalidar league rooms e auditar. Não permitir arrastar jogadores, alterar ready ou editar times arbitrariamente.

Definir “travada” por evidência (idade + status + ausência de progresso), não somente por duração. Cancelamento de waiting pode apagar como já ocorre; histórico operacional fica no audit log.

## 26. Match Operations

`/ops/matches` mostra snapshot, status, participantes, times, resultado, resolution e votos agregados. Nunca votos individuais.

Correção de resultado é uma operação avançada: lock da match, validar finished, reverter/recalcular `match_players.result`, gravar novo winner/resolution, audit log com before/after e idempotency key. Como standings são on read, a correção se propaga sem tabela materializada. Cancelar match também precisa neutralizar resultados e atualizar lobby coerentemente.

Não disponibilizar isso até testes cobrirem concorrência, repetição e rollback.

## 27. Session Revocation

Revogar sessão combina três camadas:

1. Supabase Admin API no backend;
2. middleware HTTP/Socket checando estado operacional local;
3. desconexão dos sockets existentes por user room/registry.

Somente revogar refresh tokens pode deixar access tokens válidos por um período; o estado local deve bloquear imediatamente. Resultado da operação deve compartilhar correlation ID com audit log e log técnico, sem armazenar tokens.

## 28. Audit Log

`platform_audit_logs` deve ser append-only:

```text
id
actor_user_id
action
target_type
target_id
reason
metadata (allowlist, sem payload bruto)
correlation_id
created_at
```

Ações mínimas: USER_SUSPENDED/UNSUSPENDED, USER_SESSION_REVOKED, LEAGUE_SUSPENDED/REACTIVATED, LOBBY_CANCELLED. Depois: USER_BANNED/UNBANNED, LEAGUE_ARCHIVED/DELETED/OWNER_TRANSFERRED e MATCH_RESULT_CORRECTED/CANCELLED.

`/ops/audit` usa cursor e filtros por actor, target, action e período. Exibe quem, o quê, alvo, quando e motivo. Audit log de negócio não substitui logs técnicos; ambos compartilham correlation ID.

### NF-13 — Audit log operacional

Category: PLATFORM OPERATIONS / SECURITY  
Problem: ações globais seriam impossíveis de reconstruir e responsabilizar.  
Current capability: logs estruturados/correlation IDs, mas não ledger persistente de decisões.  
Proposal: log append-only gravado junto da mutation local.  
User value: 5 (operacional)  
Frequency: 3  
Product fit: 5  
Implementation cost: 3  
Maintenance cost: 3  
Risk: 3  
Dependencies: taxonomia de ações e platform roles.  
Backend impact: helper transacional e consultas filtradas.  
Frontend impact: `/ops/audit`.  
Database impact: nova tabela/índices e política de retenção.  
Security considerations: metadata allowlist, sem tokens/secrets/PII desnecessária.  
Priority: P1 junto da primeira mutation Ops  
Recommendation: nenhuma ação destrutiva global sem isso.

## 29. Operations Security

- Autorização sempre no backend e deny-by-default em `/ops`.
- Rate limit separado para busca e mutations.
- MFA obrigatório para super admins quando suportado pelo Supabase.
- Reauth recente para ban, ownership transfer, delete e correção de resultado.
- CSRF não é o vetor principal com bearer token, mas XSS e roubo de sessão exigem CSP, dependências cuidadosas e nenhum token em logs.
- Service-role key somente no servidor.
- Confirmação proporcional e motivo obrigatório.
- Idempotency key em ações que atravessam PostgreSQL + Supabase/Socket.
- Não permitir que um operador remova/bana o último super admin; limitar autoações.
- Listas retornam mínimo necessário; email apenas no detalhe autorizado.
- Testes negativos garantem que owner/admin de liga não acessa Ops.

## 30. Moderator vs Super Admin

Não separar no primeiro commit se houver um único operador. Modele a permissão para permitir evolução, mas lance `super_admin` apenas. Quando houver equipe/volume:

- moderator: suspender usuário/liga, cancelar lobby, consultar reports;
- support: leitura limitada e revoke session, se necessário;
- super_admin: gerir roles globais, ban, ownership transfer e operações destrutivas.

Separar cedo demais cria matriz sem usuários reais; misturar implicitamente roles de liga cria vulnerabilidade.

## 31. Minimum Ops Before Public Launch

1. role global server-side e middleware isolado;
2. busca/inspeção paginada de usuários e ligas;
3. suspensão/reativação de usuário;
4. suspensão/reativação de liga;
5. revogação Supabase + bloqueio local + disconnect Socket.IO;
6. motivo obrigatório e audit log;
7. proteção do último super admin e testes negativos;
8. runbook para falha parcial/retry;
9. acesso MFA para operadores.

Hard delete, correction de match e moderator separado não são baseline.

## 32. Quick Wins

| Feature | Valor | Esforço | Observação |
| --- | --- | --- | --- |
| Estado/cancelamento da request própria | Alto | Baixo/médio | fecha um fluxo já existente |
| Forma recente e streak | Alto | Baixo | usa dados atuais |
| Copiar link de liga/match | Médio | Baixo | não altera privacidade |
| Aviso fixado simples | Alto | Baixo/médio | mais proporcional que chat |
| Convite contextual em perfil | Médio | Baixo/médio | reaproveita invites |
| Incluir convites no dashboard | Alto | Baixo/médio | antes de criar inbox completa |
| Definir comportamento de `spec` | Alto para clareza | Baixo | pode resultar em remoção da role |

## 33. Big Bets

- Operations Console: necessário para lançamento público, alto risco e alto valor operacional.
- Lobby agendada + RSVP: pode mudar organização/retention, mas requer validação com usuários.
- Notifications inbox: útil quando eventos offline forem frequentes; não começar por e-mail.
- Discord webhook: alto fit com grupos, mas segurança/operabilidade outbound elevam custo.
- Seasons: profundidade competitiva futura, dependente de uso recorrente e pedido real.

## 34. Feature Scoring Matrix

Escalas: valor/frequência/fit 1–5 (maior é melhor); custo/manutenção/risco 1–5 (maior é mais caro/arriscado).

| Feature | Problema | Valor | Frequência | Product fit | Complexidade | Manutenção | Risco | Prioridade |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Request própria/cancelamento | fluxo de entrada opaco | 5 | 3 | 5 | 2 | 1 | 2 | P1 |
| Forma/streak | competição pouco expressiva | 4 | 4 | 5 | 2 | 1 | 2 | P2 |
| Standings enriquecidos | ranking básico | 4 | 4 | 5 | 2 | 2 | 2 | P2 |
| Rematch | retorno manual ao loop | 5 | 4 | 5 | 3 | 2 | 3 | P2 |
| Regras/aviso fixado | comunicação fora de contexto | 4 | 3 | 4 | 2 | 2 | 2 | P2 |
| Convite contextual | descoberta desconectada do invite | 3 | 2 | 4 | 2 | 2 | 2 | P3 |
| Copiar link | sharing inconsistente | 3 | 3 | 3 | 1 | 1 | 1 | P3 |
| Notifications inbox | eventos offline perdidos | 4 | 3 | 4 | 4 | 3 | 3 | P3 |
| Lobby agendada/RSVP | organização externa | 4 | 3 | 4 | 5 | 4 | 4 | P3 |
| Discord webhook | trabalho manual de anúncio | 4 | 4 | 4 | 4 | 4 | 4 | P3 |
| Avatar/banner de liga | baixa identidade | 3 | 2 | 3 | 3 | 2 | 3 | P3 |
| Seasons | falta de ciclos formais ainda não provada | 3 | 2 | 4 | 5 | 5 | 5 | P4 |
| Result image | sharing visual | 2 | 2 | 2 | 3 | 2 | 2 | P4 |
| Chat/friends/feed | duplicação de rede social | 1 | 2 | 1 | 5 | 5 | 5 | OUT OF SCOPE |

## 35. Super Admin Matrix

| Capability | Por que existe | Risco | Backend | Frontend | Prioridade |
| --- | --- | --- | --- | --- | --- |
| Platform role/middleware | raiz de confiança | Alto | tabela/claim validado e deny-by-default | route guard apenas complementar | OPS 0 |
| Audit log | responsabilização | Médio | append-only transacional | filtros/read-only | OPS 0/2 |
| User/league search | localizar alvo sem SQL | Médio | cursor, filtros, minimum fields | tables/details | OPS 1 |
| User suspension | conter abuso reversivelmente | Alto | status, middleware, session/socket | dialog + motivo | OPS 2 |
| League suspension | preservar histórico e conter atividade | Alto | guards de domínio | read-only/status | OPS 2 |
| Revoke sessions | corte de acesso | Alto | Supabase Admin + local block | ação explícita | OPS 2 |
| Cancel stuck lobby | recuperação operacional | Médio | caso de uso existente/adaptado | detalhe + confirmação | OPS 3 |
| Ban/unban | bloqueio duradouro | Muito alto | coordenação e retry | reauth + motivo | OPS 3 |
| Transfer ownership | continuidade administrativa | Muito alto | transação/invariantes | confirmação forte | OPS 3 |
| Correct/cancel match | corrigir estado excepcional | Muito alto | recalcular resultados idempotente | before/after | OPS 3 |
| Delete league | abuso/extremo | Muito alto | soft delete/retention | nome + reason + reauth | OPS 4 |
| Delete/anonymize user | compliance/solicitação | Muito alto | workflow dedicado | fluxo separado | OPS 4 |

## 36. Dependency Map

```text
Match history
├── Recent form / streak
│   └── Enriched standings
└── Match detail
    └── Rematch

Player discovery
└── Safe player profile
    └── Existing league invitations
        └── Contextual invite

Pinned announcement
└── Validate scheduling demand
    └── Scheduled lobby + RSVP
        └── Persistent notifications
            └── Optional Discord webhook

Platform role
├── Ops route isolation
├── Read-only search
└── Audit log
    ├── User suspension + session/socket revoke
    ├── League suspension
    └── Advanced actions
        ├── Ban
        ├── Ownership transfer
        └── Match correction
```

## 37. Prioritized Product Roadmap

### Phase A — Close existing loops

- request própria/pending/cancel;
- convites e voto pendente no dashboard;
- contrato explícito para spectator;
- estabilizar concorrências restantes de ready/team/cancel.

### Phase B — Competitive payoff

- últimos 5 e streak;
- standings enriquecidos;
- rematch com opt-in.

### Phase C — League organization

- regras e aviso fixado;
- medir demanda por agendamento;
- se validado, scheduled lobby + RSVP.

### Phase D — Delivery and integrations

- inbox mínima quando eventos offline justificarem;
- webhook Discord opcional;
- sharing visual somente depois.

### Phase E — Competitive expansion

- avaliar seasons com dados reais de retenção;
- somente então campeão histórico/badges derivados.

## 38. Super Admin Roadmap

### OPS 0 — Authorization foundation

- platform role server-side;
- middleware e `/ops` isolado;
- MFA/reauth policy;
- taxonomia de ações e audit writer.

### OPS 1 — Read-only operations

- busca paginada de usuários/ligas;
- detalhes mínimos;
- inspeção de lobby/match;
- nenhum dado sensível em listas.

### OPS 2 — Safe moderation

- suspend/unsuspend user;
- suspend/reactivate league;
- revoke sessions + disconnect sockets;
- audit UI e runbook de falha parcial.

### OPS 3 — Advanced administration

- ban/unban;
- transfer ownership;
- cancel stuck lobby;
- correct/cancel match com testes transacionais.

### OPS 4 — Destructive/compliance workflows

- archive/soft delete de liga;
- anonymization/account deletion;
- hard delete somente com política de retenção aprovada.

## 39. Must Have Before Public Launch

- Minimum Ops da seção 31;
- request/invite/entry sem estados ambíguos;
- política clara para `spec`;
- concorrências críticas de lobby testadas;
- rate limits e paginação nas novas buscas Ops;
- backup/restore e rollback já documentados, exercitados para mudanças Ops;
- termos operacionais internos para motivo, retenção e acesso a email;
- testes end-to-end negativos de autorização global;
- monitoramento de falhas Supabase Admin e disconnect Socket.IO.

## 40. Can Wait Until Real Usage

- seasons, campeão histórico e badges;
- notification inbox completa e email de produto;
- Discord bot bidirecional/public API;
- página pública anônima;
- moderator/support separados;
- match correction no painel;
- hard delete/anonymization automatizada;
- activity feed, export CSV e imagem compartilhável;
- materialização de standings/stats.

## 41. Final Recommendations

1. Não reconstruir o que já existe. Player discovery, perfis seguros, invites, dashboard, match detail e paginação estão implementados.
2. Entregar primeiro request própria/cancelamento e resolver a semântica de spectator.
3. Usar histórico real para forma, streak e standings mais esportivos; não inventar telemetria Riot.
4. Fechar o loop pós-jogo com rematch opt-in, sem reservar vagas ou copiar jogadores silenciosamente.
5. Preferir anúncio fixado a chat; validar agendamento antes de construir calendário/notificações.
6. Tratar Discord webhook como integração de valor potencial, não dependência do core.
7. Antes de abertura pública, construir a fundação Ops. Uma tela Super Admin sem autorização, revogação e audit log não deve ser lançada.
8. Fazer ações globais explícitas, reversíveis quando possível, transacionais, idempotentes e auditadas. Nunca expor CRUD genérico ou SQL.
9. Manter o monólito modular e PostgreSQL como fonte de verdade; a escala projetada não justifica troca de stack ou microservices.
10. Reavaliar P3/P4 com uso real. A melhor evolução agora é reduzir trabalho manual e tornar a competição legível, não aumentar o número de features.

### Decisão sobre spectator

Antes de novas features, definir: spectator não entra em time, não marca ready, não vota, não conta na capacidade competitiva e pode apenas ler lobby/match se a liga permitir. Se esse comportamento não tiver usuário real, remover `spec` do produto é melhor que manter uma role nominal sem função.

### Decisão sobre activity feed

Não criar feed agora. Se audit/event records de domínio passarem a existir prospectivamente, uma timeline curta da liga poderá projetar eventos reais (entrada, lobby criada, resultado). Não sintetizar retroativamente nem reutilizar audit logs privados de Ops como feed público.

### Pergunta de controle

Se 500 usuários começassem amanhã, faltariam ferramentas para localizar, suspender e desconectar abusadores, preservar evidência e bloquear ligas problemáticas sem SQL. Não faltariam chat, moeda, marketplace ou um ranking matematicamente sofisticado. Esse contraste deve guiar o backlog.
