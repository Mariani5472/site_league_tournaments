# FPL_LOL

Plataforma para criar ligas e organizar partidas de League of Legends entre amigos. A plataforma gerencia lobby, times, confirmação do resultado, histórico e classificação; a partida é jogada fora do sistema e não depende da API de partidas da Riot.

## Stack

- API: Node.js, TypeScript, Express, PostgreSQL, SQL manual, Socket.IO e Supabase Auth.
- Web: React, TypeScript, Vite, React Router, TanStack Query, Shadcn/UI e Socket.IO Client.
- Infra: Docker Compose, PostgreSQL e Adminer.

## Configuração

Requisitos: Docker Desktop com Compose e um projeto Supabase para autenticação.

1. Copie `api/.env.example` para `api/.env` e `web/.env.example` para `web/.env`.
2. Preencha URL e chave publicável do Supabase. Credenciais Riot não são necessárias.
3. Execute `docker compose up --build`.
4. Em outro terminal, execute `docker compose exec api npm run migrate:up`.
5. Abra `http://localhost:5173`. Adminer fica em `http://localhost:8080`.

O banco local usa `admin/admin`, database `lol_tournament`, host `postgres` dentro do Compose.

## Desenvolvimento e validação

Na pasta `api`: `npm run typecheck`, `npm run build` e `npm run migrate:up`.

Os testes críticos usam um PostgreSQL isolado. Crie um banco de teste, configure `DATABASE_URL` para ele, aplique as migrations e execute `npm run test:integration`. Nunca aponte esse comando para o banco de produção, pois a suíte limpa suas tabelas entre cenários.

Na pasta `web`: `npm run lint` e `npm run build`.

## Arquitetura e fluxo

Os módulos da API seguem controller → service → repository. As regras e autorização ficam no service; repositories usam queries parametrizadas. REST é a fonte da verdade e Socket.IO apenas sinaliza invalidações nas rooms `league:{id}` e `lobby:{id}`.

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
