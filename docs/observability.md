# Observabilidade operacional

## Correlation ID e logs

Cada request recebe `requestId`. Um `x-request-id` recebido é preservado somente quando possui de 1 a 100 caracteres alfanuméricos ou `._:-`; valores ausentes/inválidos são substituídos por UUID. O mesmo ID volta no header da resposta.

`AsyncLocalStorage` mantém o contexto durante service, repository e emissão realtime. Depois da autenticação, logs incluem `userId`; sinais incluem também `leagueId`, `lobbyId` e a operação/evento quando disponíveis. Não registramos email, nickname ou payload completo. Authorization, cookies e campos de token permanecem redacted.

Falhas de query PostgreSQL são registradas com o mesmo contexto, duração, nome/código da falha e sem SQL ou parâmetros. Isso conecta a entrada HTTP ao erro de banco sem registrar valores potencialmente pessoais.

Todo sinal Socket.IO emitido pelo backend recebe `_meta.correlationId`. Assim, o request HTTP, o log de domínio e a invalidação recebida pelo cliente podem ser correlacionados. Workers sem request geram um correlation ID próprio.

## Health

- `GET /health/live`: liveness; confirma que o processo Express responde e não consulta dependências.
- `GET /health/ready`: readiness; retorna sucesso somente quando o PostgreSQL responde.
- `GET /health`: alias compatível de readiness para deploys existentes.

Liveness deve reiniciar processos travados. Readiness deve retirar temporariamente a instância do tráfego sem provocar restart durante uma indisponibilidade do banco.

## Métricas

`GET /metrics` expõe formato Prometheus:

- `http_requests_total`: volume e erros por método/status;
- `http_request_duration_seconds_sum/count`: duração média e degradação por método;
- `socket_connections_active`: conexões realtime autenticadas atuais;
- `realtime_events_total`: volume dos principais sinais de domínio por evento.

Labels são limitadas a método, status e nomes de eventos definidos pela aplicação, evitando cardinalidade por usuário/UUID. IDs ficam somente nos logs correlacionados.
