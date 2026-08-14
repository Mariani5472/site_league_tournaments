# Observabilidade operacional

## Correlation ID e logs

Cada request recebe `requestId`. Um `x-request-id` recebido é preservado somente quando possui de 1 a 100 caracteres alfanuméricos ou `._:-`; valores ausentes/inválidos são substituídos por UUID. O mesmo ID volta no header da resposta.

`AsyncLocalStorage` mantém o contexto durante service, repository e emissão realtime. Depois da autenticação, logs incluem `userId`; sinais incluem também `leagueId`, `lobbyId` e a operação/evento quando disponíveis. Não registramos email, nickname ou payload completo. Authorization, cookies e campos de token permanecem redacted.

Falhas de query PostgreSQL são registradas com o mesmo contexto, duração, nome/código da falha e sem SQL ou parâmetros. Isso conecta a entrada HTTP ao erro de banco sem registrar valores potencialmente pessoais.

Todo sinal Socket.IO emitido pelo backend recebe `_meta.correlationId`. Assim, o request HTTP, o log de domínio e a invalidação recebida pelo cliente podem ser correlacionados. Workers sem request geram um correlation ID próprio.

## Health

- `GET /health/live`: liveness; confirma que o processo Express responde e não consulta dependências.
- `GET /health/ready`: readiness; retorna sucesso somente quando o PostgreSQL responde. Indisponibilidade ou timeout retorna `503` com `status=not_ready` e `reason=database_unavailable`, sem detalhes internos.
- `GET /health`: alias compatível de readiness para deploys existentes.

Liveness deve reiniciar processos travados. Readiness deve retirar temporariamente a instância do tráfego sem provocar restart durante uma indisponibilidade do banco.

## Métricas

`GET /metrics` expõe formato Prometheus e é protegido em produção. Configure `METRICS_TOKEN` como segredo longo e aleatório; o scraper deve enviar `Authorization: Bearer <METRICS_TOKEN>`. Acesso anônimo ou com token incorreto recebe `401`. A API recusa inicialização em produção sem esse segredo. Em desenvolvimento, o endpoint permanece anônimo apenas quando `METRICS_TOKEN` não está definido; definir o token ativa a mesma proteção localmente.

Os endpoints públicos seguem uma política separada:

- `GET /health/live` permanece anônimo e não consulta dependências;
- `GET /health/ready` e o alias `GET /health` permanecem anônimos para healthchecks da plataforma e consultam PostgreSQL;
- nenhum endpoint de health retorna métricas, configuração ou credenciais.

As métricas disponíveis incluem:

- `http_requests_total`: volume e erros por método/status;
- `http_request_duration_seconds_sum/count`: duração média e degradação por método;
- `socket_connections_active`: conexões realtime autenticadas atuais;
- `realtime_events_total`: volume dos principais sinais de domínio por evento.
- `database_pool_connections`: conexões totais, ociosas e aguardando checkout; `waiting` maior que zero evidencia saturação;
- `database_pool_max_connections`: capacidade configurada do processo;
- `database_pool_errors_total`: erros de background emitidos pelo pool.

Os estados do pool são um conjunto fixo (`total`, `idle`, `waiting`). As demais labels são limitadas a método, status e nomes de eventos definidos pela aplicação, evitando cardinalidade por usuário/UUID. IDs ficam somente nos logs correlacionados.

## Pool PostgreSQL

Configure `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS` e `DB_STATEMENT_TIMEOUT_MS` em milissegundos. Valores ausentes ou inválidos usam defaults seguros: desenvolvimento `10/5000/30000/15000`; produção `5/5000/10000/10000`. A capacidade deve ser dividida entre todas as instâncias e permanecer abaixo da cota do provedor, reservando conexões para migrations e operação. Timeouts aparecem nos logs de query sem SQL/parâmetros; erros de clientes ociosos incrementam `database_pool_errors_total`.
