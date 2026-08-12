# Release e rollback

## Gate de release

O workflow `Release` é o único caminho versionado para liberar a API. O `render.yaml` desativa o auto-deploy para que nenhum commit contorne o gate. Configure environments protegidos `staging` e `production` no GitHub; produção deve exigir aprovação obrigatória. Em cada environment, cadastre os secrets `DATABASE_URL`, `RENDER_DEPLOY_HOOK_URL`, `RENDER_API_KEY` e `RENDER_SERVICE_ID`, além da variável `HEALTH_URL` sem barra final. Os valores são isolados por environment apesar de terem os mesmos nomes.

Ao disparar o workflow, escolha staging ou produção e informe um commit SHA ou tag. O pipeline resolve esse ref para um SHA imutável, executa `npm run migrate:up` no banco selecionado e somente então aciona o deploy desse mesmo SHA. Falha de instalação ou migration encerra o job antes do Render. O pipeline aguarda o status `live`, testa `/health` e registra SHA, environment e ID do deploy no histórico de Deployments do GitHub.

O workflow `Database schema` é a prova reproduzível anterior ao staging: cria schema do zero, simula upgrade da versão anterior e executa `down`/`up` da migration mais recente. Pull requests com migration devem passar por esse gate.

## Regras para migrations

Deploy sem interrupção exige mudanças expand/contract: primeiro adicione estruturas compatíveis, migre/backfill dados e só remova o contrato antigo em uma release posterior. Toda migration deve implementar `down`, mas rollback automático de schema é proibido em produção porque código antigo pode coexistir brevemente e migrations destrutivas podem perder dados.

## Rollback da aplicação

1. No histórico de Deployments do GitHub, identifique o último SHA saudável e o ID Render correspondente.
2. Dispare `Release` para o environment afetado, com `release_kind=rollback` e esse SHA em `release_ref`.
3. O pipeline reaplica apenas migrations pendentes (normalmente nenhuma), implanta o código antigo, valida `/health` e registra o rollback como uma nova deployment.
4. Confirme logs e fluxos críticos. Se o código anterior não for compatível com o schema atual, não libere tráfego: avance com uma migration corretiva compatível.

## Recuperação de banco

Reversão de aplicação não reverte dados. Em corrupção ou migration destrutiva, interrompa releases, preserve logs e restaure o backup pré-release em um banco novo. Valide migrations, contagens e smoke tests nesse banco antes de trocar `DATABASE_URL` e executar o rollback da aplicação. `npm run migrate:down` só pode ser usado em staging/cópia descartável após revisão explícita; nunca como resposta automática a falha de deploy.

Teste o runbook trimestralmente em staging: restaure um backup em banco temporário, execute o fluxo de upgrade, faça rollback para o SHA anterior e anexe os links dos dois Deployments ao registro do exercício.
