# Segurança das operações de plataforma

`platform_roles` é a única fonte de autorização global. Nesta primeira versão, o catálogo aceita
`super_admin`, mas o vínculo é separado de `league_members`: ser owner ou admin de uma liga não
concede acesso a `/ops`.

Todas as rotas sob `/ops` aplicam autenticação e consulta server-side do vínculo global ativo. A
tabela possui RLS habilitado sem políticas para impedir acesso direto pelo cliente. O cadastro e a
edição de perfil também não aceitam campos de role global.

## Bootstrap e recuperação

O primeiro `super_admin` deve ser inserido por um operador de banco autorizado, com
`created_by = null`, durante o bootstrap do ambiente. Depois disso, concessões e revogações usam a
API protegida. A trigger do banco impede remover o último vínculo ativo mesmo fora da API.

## Operações sensíveis

Conceder ou revogar `super_admin` exige MFA (`aal2`) e autenticação recente. A janela padrão é de
900 segundos e pode ser ajustada com `OPS_REAUTH_MAX_AGE_SECONDS`. O backend usa o evento mais
recente do claim `amr` do JWT validado; a emissão ou renovação automática do token não conta como
reauth. Sem evidência `amr`, a operação é negada. `OPS_REQUIRE_MFA=false` existe somente para
ambientes controlados; produção deve manter o padrão habilitado.

Um operador não pode conceder ou revogar a própria role. A combinação dessa regra com a proteção
do último administrador reduz erros irreversíveis e exige revisão por outro super admin.

## Auditoria

Concessões e revogações exigem uma justificativa explícita e gravam um registro em
`platform_audit_logs` na mesma transação da alteração. O registro contém somente actor, ação,
alvo, justificativa, correlation ID e a metadata allowlisted `{ role }`; payloads HTTP, tokens,
segredos, email e outros dados pessoais não são copiados. Justificativas com formato aparente de
credencial são rejeitadas.

A tabela é append-only por trigger, possui RLS sem policies de cliente e não tem endpoints de
edição ou exclusão. `GET /ops/audit` exige super admin, MFA e reautenticação recente, aceita cursor
e limite, além de filtros por `actorId`, `action`, `targetType`, `targetId`, `from` e `to`. A
ordenação estável é `created_at DESC, id DESC`. O `correlationId` retornado é o mesmo request ID
presente nos logs técnicos da operação.
