# Homologação antes do redesign

Data: 2026-08-05.

## Segurança e domínio

- IDOR de `leagueId → lobbyId → matchId`: bloqueado por validações de associação e teste automatizado.
- Liga privada: usuário externo recebe `403`; confirmado por integração e requisições autenticadas observadas nos logs.
- Voto de não participante: rejeitado; teste automatizado explícito.
- Resolução por admin de outra liga: rejeitada; teste automatizado explícito.
- Socket.IO: ingresso em rooms de liga/lobby exige associação; outsider não entra. Hooks removem listeners com a mesma referência e deixam a room no cleanup.
- CORS: origens exatas por ambiente, compartilhadas por HTTP e Socket.IO; origem não permitida recebe `403`.
- Logs: `Authorization` e cookies são redigidos.

## Interface

- Landing, login e redirect de rota protegida verificados em 1440×900, 768×1024 e 390×844.
- Nenhuma largura apresentou overflow horizontal.
- Console do navegador sem warnings ou erros.
- Ausência de sessão deixou de aparecer como erro de autenticação na tela de login.

## Operação

- 17 testes de integração passam em PostgreSQL real.
- Todos os quatro serviços do Compose ficam `healthy`.
- Backup custom-format restaurado em `fpl_restore_check`: 17 usuários e 1 liga; banco temporário removido após a verificação.
- Seed de desenvolvimento executado com sucesso e pode ser repetido.

## Pendente para homologação humana

O teste com vários usuários reais requer contas de teste válidas no Supabase. O seed cria perfis locais, não identidades externas. Executar com owner, admin, dois jogadores e outsider em sessões/navegadores separados, cobrindo criação/entrada de liga, lobby, ready, início, alteração de voto, maioria, cancelamento, logout e atualização entre abas.

## Dependências

A API não possui advisories conhecidos após atualizações compatíveis. O frontend permanece com advisories reportados na linha atual do React Router; a aplicação usa SPA client-side e não habilita RSC/SSR, reduzindo a superfície dos avisos ligados a esses modos. Reavaliar quando houver versão corrigida compatível e não usar `npm audit fix --force` sem teste de regressão.
