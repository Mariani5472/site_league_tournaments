# Estratégia de migrations

## Fonte canônica

`api/migrations/*.js`, executada por `node-pg-migrate`, é a única fonte canônica de evolução do schema. Toda nova tabela, coluna, constraint, índice, extensão ou configuração estrutural deve nascer como uma nova migration incremental nesse diretório. Migrations já aplicadas não devem ser reescritas.

`api/supabase/migrations/20260805210000_initial_schema.sql` é uma baseline legada para projetos Supabase vazios. Ela não é um segundo histórico e não deve receber novas migrations incrementais. Enquanto permanecer no repositório, mudanças canônicas que alterem o estado final também precisam regenerar essa fotografia no mesmo pull request. O CI compara colunas, defaults, constraints, índices e RLS dos dois bancos e falha diante de divergência.

Crie mudanças com:

```bash
cd api
npm run migrate:create -- nome-da-mudanca
npm run migrate:up
```

Implemente `up` e `down`, valide sobre uma cópia descartável e nunca use SQL manual em produção como substituto para uma migration versionada.

## Banco novo

Configure `DATABASE_URL` apontando para PostgreSQL vazio e execute:

```bash
cd api
npm ci
npm run migrate:up
```

Esse é o fluxo oficial para PostgreSQL local e Supabase novo. A CLI do Supabase pode gerenciar conexão e ambientes, mas o schema da aplicação é aplicado pelo `node-pg-migrate` usando a connection string PostgreSQL com permissão de DDL e SSL exigido pelo ambiente.

## Upgrade de banco existente

1. Faça backup e teste a restauração em outro banco.
2. Aponte `DATABASE_URL` para uma cópia do banco existente.
3. Execute `npm run migrate:up` e os testes/smoke checks.
4. Em janela controlada, execute o mesmo comando no banco alvo.
5. Confirme `/health`, logs e fluxos críticos.

`node-pg-migrate` registra o histórico em `public.pgmigrations` e aplica somente migrations pendentes. Qualquer erro retorna código diferente de zero; CI e deployment devem parar imediatamente. Nunca marque manualmente uma migration como aplicada.

## Verificação da baseline legada

Para reproduzir o CI, crie dois bancos vazios, aplique `npm run migrate:up` no primeiro, a baseline SQL no segundo com `psql -v ON_ERROR_STOP=1` e rode:

```bash
cd api
npm run schema:compare -- \
  postgresql://usuario:senha@host:5432/schema_canonical \
  postgresql://usuario:senha@host:5432/schema_baseline
```

O comando ignora apenas a tabela operacional `pgmigrations`. Diferenças em colunas, tipos, nulabilidade, defaults, constraints, índices ou RLS fazem o processo falhar.
