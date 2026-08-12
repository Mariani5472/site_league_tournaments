# FPL_LOL

Plataforma para criar ligas e organizar partidas de League of Legends entre amigos. A plataforma gerencia lobby, times, confirmação do resultado, histórico e classificação; a partida é jogada fora do sistema e não depende da API de partidas da Riot.

## Stack

- API: Node.js, TypeScript, Express, PostgreSQL, SQL manual, Socket.IO e Supabase Auth.
- Web: React, TypeScript, Vite, React Router, TanStack Query, Shadcn/UI e Socket.IO Client.
- Infra: Docker Compose, PostgreSQL e Adminer.

## Ambientes e configuração

### Desenvolvimento local (Docker Compose)

Requisitos: Docker Desktop com Compose e um projeto Supabase para autenticação.

1. Copie `api/.env.example` para `api/.env` e `web/.env.example` para `web/.env`.
2. Preencha URL e chave publicável do Supabase. Credenciais Riot não são necessárias. Não use `api/.env.production.example` neste fluxo.
3. Execute `docker compose up --build`.
4. Em outro terminal, execute `docker compose exec api npm run migrate:up`.
5. Abra `http://localhost:5173`. Adminer fica em `http://localhost:8080`.

As migrations incrementais em `api/migrations` são a fonte canônica do schema. Consulte [docs/migrations.md](docs/migrations.md) para criação de mudanças, banco novo, upgrade e verificação da baseline Supabase.

Releases de staging e produção aplicam migrations antes do deploy, bloqueiam a liberação em caso de falha e registram o SHA implantado. Configuração, operação e rollback estão em [docs/release-and-rollback.md](docs/release-and-rollback.md).

O Compose é exclusivo para desenvolvimento local. Ele sobrescreve explicitamente qualquer `DATABASE_URL` presente em `api/.env` com `postgresql://admin:admin@postgres:5432/lol_tournament`. Portanto, a API e comandos como `docker compose exec api npm run migrate:up` sempre usam o serviço `postgres`; uma URL remota deixada por engano em `api/.env` não é usada pelo container.

### Testes

Na pasta `api`: `npm run typecheck`, `npm run build` e `npm run migrate:up`.

Os testes críticos usam um PostgreSQL isolado, diferente dos bancos local e de produção. Crie um banco descartável, configure `DATABASE_URL` no ambiente do processo de teste, aplique as migrations e execute `npm run test:integration`. O comando executa testes de domínio, contratos HTTP com a aplicação Express real e transporte Socket.IO real. Nunca o aponte para produção, pois cada cenário limpa as tabelas. O workflow `api-tests.yml` usa `api_test` em um PostgreSQL efêmero e reproduz esse processo no CI.

Na pasta `web`: `npm run lint` e `npm run build`.

Use `docker compose exec api npm run seed:dev` para criar uma liga e quatro perfis locais idempotentes. Esses UUIDs não criam identidades no Supabase; para testar login completo, use contas de desenvolvimento correspondentes no projeto de autenticação.

### Produção e operação

- Não use `docker-compose.yml` em produção. Use `api/.env.production.example` apenas como referência e injete `NODE_ENV=production`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ORIGINS` e `LOG_LEVEL` pela plataforma de deploy ou gerenciador de segredos. O `render.yaml`, por exemplo, declara `DATABASE_URL` como valor externo (`sync: false`) e não fixa host local. Em produção, a API se recusa a iniciar sem `CORS_ORIGINS`.
- `CORS_ORIGINS` aceita origens exatas separadas por vírgula e é compartilhado pelo Express e Socket.IO. Não use `*` com autenticação.
- Logs HTTP são estruturados e removem `Authorization` e cookies. Use `LOG_LEVEL=info` normalmente e `warn` quando a plataforma de observabilidade já registrar acessos.
- `/health` verifica API e PostgreSQL. O Compose também possui healthchecks para PostgreSQL, API, web e Adminer.
- Em `SIGTERM`/`SIGINT`, a API interrompe o worker, fecha HTTP e Socket.IO, aguarda operações em andamento e encerra o pool PostgreSQL. `SHUTDOWN_TIMEOUT_MS` define o limite interno (25 segundos por padrão); Compose e Render concedem 30 segundos antes do encerramento externo. Reproduza a verificação isolada com `docker compose run --rm api npx tsx --test tests/shutdown.test.ts`.
- Faça backup com `pg_dump -Fc` e restaure primeiro em outro banco com `pg_restore`; valide migrations, contagens e acesso antes de substituir qualquer banco.
- Segredos não devem entrar no repositório. A chave Supabase usada aqui é publicável; operações administrativas exigiriam uma chave separada e nunca devem ser expostas ao frontend.

## Arquitetura e fluxo

Os módulos da API seguem controller → service → repository. As regras e autorização ficam no service; repositories usam queries parametrizadas. REST é a fonte da verdade e Socket.IO apenas sinaliza invalidações nas rooms `league:{id}` e `lobby:{id}`.

O contrato público de falhas, incluindo códigos HTTP e tradução segura de erros PostgreSQL, está documentado em [docs/error-contract.md](docs/error-contract.md).

Owners e admins criam e iniciam lobbies. A lobby precisa estar cheia, com times equilibrados e todos prontos. O início e o snapshot de `match_players` ocorrem na mesma transação. Depois da partida, apenas os participantes podem votar nos times 1 ou 2; um voto pode ser alterado até o encerramento.

Cada liga possui exatamente um owner canônico. A promoção de outro membro para owner transfere a propriedade em uma transação, atualiza `leagues.owner_id` e transforma o owner anterior em admin. O owner não pode ser removido antes dessa transferência.

Lobbies seguem `waiting → in_game → finished` ou `waiting → cancelled`. Cancelamento é lógico e preserva a lobby para consulta; exclusão física acontece apenas por cascata ao excluir a liga. IDs aninhados são validados e o banco impede associar uma partida a uma lobby de outra liga.

Políticas de entrada são exclusivas: ligas públicas `open` aceitam entrada direta; `request` exige solicitação e aprovação; `invite_only` não permite autoentrada, mas owner/admin pode adicionar o usuário diretamente. Aprovações bloqueiam a liga e a solicitação na mesma transação, impedindo aprovação duplicada ou consumo concorrente da última vaga.

A maioria absoluta é `floor(participantes / 2) + 1`. Sem maioria, a votação permanece aberta. Owner ou admin pode resolver uma disputa antes da finalização, obrigatoriamente com justificativa. A finalização bloqueia a partida, grava vencedor/forma/data e marca vitória ou derrota no snapshot em uma única transação. O `UPDATE ... WHERE status = 'in_game'` impede aplicação duplicada.

A classificação é calculada a partir dos snapshots de partidas finalizadas, ordenada por vitórias, derrotas, aproveitamento e nickname. Assim, o histórico é a fonte da verdade e não há contadores independentes para reconciliar.

## Riot e limitações conhecidas

A tabela de conta Riot foi preservada apenas como metadado opcional de perfil para ambientes que já a utilizavam. Nenhuma liga, lobby, partida, voto ou classificação exige conta ou credencial Riot. Campos antigos de sincronização de partidas são removidos pela migration nova.

A API inicia normalmente sem `RIOT_DEVELOPMENT_API_KEY` e `RIOT_REGION`. O cliente Riot é criado somente durante uma tentativa de vinculação quando ambas estão configuradas. Sem configuração, o frontend oculta o formulário; contas já vinculadas continuam visíveis e podem ser desvinculadas.

Não há correção administrativa de uma partida já finalizada; a resolução administrativa é permitida somente enquanto a votação está aberta. A autenticação HTTP completa continua dependendo de um projeto Supabase configurado; os testes de domínio e autorização interna usam PostgreSQL isolado e não criam usuários no Supabase.
