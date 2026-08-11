# Contrato de erros da API

Toda falha HTTP produz um envelope JSON estável:

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "League not found"
}
```

Erros de validação acrescentam `issues`, contendo somente caminho e mensagem do schema. Respostas nunca incluem stack, query SQL, constraint, tabela ou detalhes do driver.

## Status e códigos

| HTTP | Código público | Uso |
|---|---|---|
| 400 | `BAD_REQUEST` | Regra ou valor inválido reconhecido pelo domínio |
| 400 | `VALIDATION_ERROR` | Params, query ou body rejeitado pelo Zod |
| 401 | `UNAUTHENTICATED` | Token ausente, inválido ou identidade não autenticada |
| 403 | `FORBIDDEN` | Identidade autenticada sem autorização |
| 404 | `NOT_FOUND` | Recurso inexistente ou ocultado por política de privacidade |
| 409 | `CONFLICT` | Estado incompatível, duplicidade ou concorrência esperável |
| 503 | `SERVICE_UNAVAILABLE` | Integração opcional indisponível/configuração ausente |
| 500 | `INTERNAL_ERROR` | Falha inesperada ou de infraestrutura |

`AppError` exige status explícito e deriva o código público correspondente. Não use `Error` genérico para rejeições conhecidas do domínio.

## PostgreSQL

- `23505` (unique): `409 CONFLICT`.
- `23503` (foreign key): `409 CONFLICT`.
- `23514` (check): `400 BAD_REQUEST`.
- timeout, conexão encerrada, indisponibilidade e demais falhas não são convertidos em sucesso nem mascarados como regra de negócio: são registrados nos logs estruturados e retornam `500 INTERNAL_ERROR` sem detalhes internos.

O código da aplicação deve preferir detectar regras conhecidas antes da query e lançar `AppError`. O mapeamento SQL é a última barreira para concorrência, cargas inválidas e violações que só o banco pode decidir.
