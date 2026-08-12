# Estratégia de migrations

## Fonte canônica

`api/migrations/*.js`, executada por `node-pg-migrate`, é a única fonte canônica de evolução do schema. Toda nova tabela, coluna, constraint, índice, extensão ou configuração estrutural deve nascer como uma nova migration incremental nesse diretório. Migrations já aplicadas não devem ser reescritas.

`api/supabase/migrations/20260805210000_initial_schema.sql` é uma baseline legada para projetos Supabase vazios. Ela não é um segundo histórico e não deve receber novas migrations incrementais. Enquanto permanecer no repositório, mudanças canônicas que alterem o estado final também precisam regenerar essa fotografia no mesmo pull request. O CI compara colunas, defaults, constraints, índices e RLS dos dois bancos e falha diante de divergência. Projetos criados por essa baseline precisam adotar o histórico canônico uma única vez antes de executar `migrate:up`.

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

## Adoção segura de banco legado sem `pgmigrations`

Não execute `migrate:up` diretamente quando as tabelas já existem e `public.pgmigrations` está ausente ou vazia. Faça a adoção primeiro, sempre em uma cópia restaurada e depois em janela controlada:

1. Identifique o último arquivo de migration já representado pelo schema legado (`cutoff`). Para a baseline Supabase versionada, use o HEAD que foi comprovado equivalente pelo CI no commit da adoção.
2. Crie um banco de referência vazio e aplique migrations somente até o cutoff. Para o cutoff imediatamente anterior ao HEAD, execute `npm run migrate:up` e `npm run migrate:down` uma vez; para cutoffs mais antigos, use uma cópia do repositório naquele commit e confirme o último registro de `pgmigrations`.
3. Compare a cópia legada com a referência: `npm run schema:compare -- "$REFERENCE_DATABASE_URL" "$DATABASE_URL"`. Qualquer diferença bloqueia a adoção e deve ser investigada; não corrija o histórico manualmente.
4. Faça backup do banco alvo e valide a restauração.
5. Execute a adoção com as duas URLs apontando para bancos distintos:

```bash
DATABASE_URL=postgresql://.../copia_legada \
REFERENCE_DATABASE_URL=postgresql://.../referencia_cutoff \
npm run migrate:adopt -- 1786469400000_strengthen-domain-constraints
```

O comando repete internamente a comparação estrutural, obtém advisory lock, exige histórico vazio e registra em uma única transação todos os nomes até o cutoff, sem executar o `up` dessas migrations. Depois execute `npm run migrate:up`; somente migrations posteriores ao cutoff serão aplicadas. Compare o resultado com uma instalação limpa em HEAD e valide `/health` e os fluxos críticos.

Nunca escolha um cutoff apenas pela data ou porque algumas tabelas existem. Se o banco já possuir qualquer linha em `pgmigrations`, o comando falha deliberadamente; histórico parcial exige investigação específica.

## Verificação da baseline legada

Para reproduzir o CI, crie dois bancos vazios, aplique `npm run migrate:up` no primeiro, a baseline SQL no segundo com `psql -v ON_ERROR_STOP=1` e rode:

```bash
cd api
npm run schema:compare -- \
  postgresql://usuario:senha@host:5432/schema_canonical \
  postgresql://usuario:senha@host:5432/schema_baseline
```

O comando ignora apenas a tabela operacional `pgmigrations`. Diferenças em colunas, tipos, nulabilidade, defaults, constraints, índices ou RLS fazem o processo falhar. O workflow `Database schema` também restaura um schema representativo da versão anterior sem histórico, adota seu cutoff, aplica as migrations restantes até HEAD e compara o resultado com uma instalação limpa.
