# Inventário de telas

Este inventário descreve o propósito e as variações funcionais de cada rota. A composição visual pode ser refeita, desde que ações, regras e estados continuem compreensíveis.

## Estrutura global autenticada

- Sidebar desktop e drawer mobile.
- Navegação: Início, Ligas, Jogadores, Convites e Perfil.
- Operações aparece condicionalmente para operador autorizado.
- Controle de tema claro/escuro/sistema.
- Ação de sair.
- Conteúdo principal com link de salto para teclado.

## Matriz de rotas

| Rota | Público | Objetivo | Entrada comum |
| --- | --- | --- | --- |
| `/` | Todos | Apresentar o produto | URL pública |
| `/login` | Visitante | Autenticar | Landing ou sessão expirada |
| `/register` | Visitante | Criar conta | Landing/login |
| `/forgot-password` | Visitante | Solicitar recuperação | Login |
| `/reset-password` | Link válido | Definir nova senha | E-mail do Supabase |
| `/session-expired` | Todos | Explicar perda de sessão | Interceptor de autenticação |
| `/main` | Autenticado | Central de atividade | Pós-login/sidebar |
| `/leagues` | Autenticado | Gerenciar e descobrir ligas | Sidebar/dashboard |
| `/leagues/:id` | Autenticado | Hub de uma liga | Lista/dashboard |
| `/leagues/:id/settings` | Owner/admin | Configurar liga | Header da liga |
| `/leagues/:leagueId/lobbies/:lobbyId` | Membro | Preparar partida e votar | Página da liga/dashboard |
| `/matches/:matchId` | Autorizado | Consultar partida | Dashboard/liga/lobby/perfil |
| `/players` | Autenticado | Encontrar jogadores | Sidebar |
| `/players/:userId` | Autenticado | Ver identidade pública | Busca/membros/ranking |
| `/invitations` | Autenticado | Responder convites | Sidebar |
| `/profile` | Autenticado | Ver e editar perfil próprio | Sidebar |
| `/ops` | Operador | Buscar entidades | Sidebar condicional |
| `/ops/users/:userId` | Operador | Investigar usuário | Diretório operacional |
| `/ops/leagues/:leagueId` | Operador | Investigar liga | Diretório operacional |
| `/forbidden` | Todos | Informar acesso negado | Guard de permissão |
| `*` | Todos | Informar página inexistente | URL inválida |

## Landing `/`

**Objetivo:** comunicar rapidamente o problema resolvido e converter para cadastro/login.

**Conteúdo atual:** hero, benefícios, demonstração conceitual do lobby, explicação do fluxo completo, features e avisos legais sobre Riot Games.

**Ações:** começar agora, ver recursos, entrar e criar conta.

**Considerações de redesign:** o visitante deve entender que são partidas entre amigos, que a partida ocorre fora da plataforma e que conta Riot não é obrigatória.

## Autenticação

### Login `/login`

- Campos: e-mail e senha.
- Controles: mostrar/ocultar senha, entrar, esqueci minha senha e criar conta.
- Estados: enviando, credenciais inválidas, e-mail não confirmado, falha de inicialização de perfil e erro genérico.

### Cadastro `/register`

- Campos: e-mail, senha e confirmação.
- Validação: obrigatórios, mínimo de 10 caracteres e senhas iguais.
- Sucesso: estado dedicado pedindo confirmação do e-mail.

### Recuperação `/forgot-password` e `/reset-password`

- Solicitação usa e-mail e sempre responde de forma neutra.
- Redefinição usa nova senha e confirmação implícita do link/sessão de recovery.
- Link inválido ou expirado precisa orientar nova solicitação.

## Início `/main`

**Com dados:** bloco introdutório, próximas ações, quatro métricas, ligas recentes e partidas recentes.

**Próximas ações possíveis:** entrar/retornar a lobby aguardando, votar em resultado e revisar solicitações administrativas.

**Sem ligas:** mensagem de início, criar liga e explorar ligas.

**Primeiro acesso:** onboarding em modal/painel, dispensável, com atalhos para criar, explorar e completar perfil.

**Estados:** skeleton inicial, atualização discreta em segundo plano, falha com tentar novamente e coleções internas vazias.

## Ligas `/leagues`

**Seções:** cabeçalho com criar liga; Minhas ligas; Descobrir ligas com busca.

**Card/list item:** nome, descrição, ocupação, visibilidade, política de entrada e papel atual quando houver.

**Busca:** atualiza após 300 ms sem digitação. Descoberta aceita carregar mais.

**Diálogo Criar liga:** nome, descrição, visibilidade, política de entrada e limite de membros. Defaults atuais: pública, entrada por solicitação e 10 membros.

**Estados por seção:** carregando, vazio, erro e carregando página seguinte.

## Liga `/leagues/:id`

### Header

- Avatar/banner, nome, descrição e badges.
- Para membro: papel atual e ação de sair, respeitando restrições.
- Para admin: acesso às configurações.

### Não membro

Exibe informações públicas e a ação coerente com a política: entrar imediatamente, solicitar entrada ou informar que é necessário convite. O conteúdo interno é substituído por uma mensagem de acesso exclusivo.

### Abas

| Aba | Conteúdo | Ações |
| --- | --- | --- |
| Visão geral | Papel, ocupação, próxima ação e contexto administrativo | Decidir requests e convidar quando aplicável |
| Classificação | Ranking e desempenho | Abrir perfil do jogador quando oferecido |
| Partidas | Histórico paginado | Abrir detalhe da partida |
| Lobbies | Lobbies e status | Criar, entrar ou abrir lobby |
| Membros | Pessoas e papéis | Alterar papel ou remover conforme hierarquia |

A aba está no parâmetro `?tab=`. Propostas devem preservar deep link, voltar/avançar e comportamento mobile.

## Configurações da liga `/leagues/:id/settings`

**Acesso:** owner e admin; demais voltam para a liga.

**Campos:** nome (3–50), descrição (até 500), avatar URL, banner URL, visibilidade, política de entrada, máximo de membros (2–128), política de criação de lobby e início automático.

**Feedback:** validação junto ao campo, estado salvando, toast de sucesso ou erro.

**Zona de perigo:** apenas owner. Exige confirmação com o nome exato da liga antes de excluir.

## Lobby `/leagues/:leagueId/lobbies/:lobbyId`

É a tela com maior densidade de estados. Deve ter hierarquia forte entre fase atual, próximo passo, bloqueios e ações pessoais.

**Blocos funcionais:** voltar à liga, identificação, indicador de fases, conexão realtime, progresso ready, escolha de formação, ações pessoais/administrativas, dois times e votação da partida.

**Ações do não participante:** entrar, se estiver aguardando e houver vaga.

**Ações do participante em espera:** ready/unready, trocar time e sair. Ready e troca ficam bloqueados durante formação de times.

**Ações administrativas:** cancelar enquanto aguarda; iniciar quando todos os requisitos estão completos; resolver resultado com justificativa.

**Criação:** quantidade par de 2 a 10 participantes; o default é 10.

**Formação 5x5:** votação de modo; confirmação/re-sorteio; eleição cronometrada de capitães; draft com turno; conclusão. Esse protocolo aparece somente em lobbies de 10 jogadores.

**Realtime:** conectado, conectando, desconectado ou falha ao entrar no canal. Quando desconectado, dados críticos ainda são revalidados por HTTP.

**Cancelamento:** ao receber status cancelado, volta para a liga.

## Detalhe da partida `/matches/:matchId`

**Conteúdo:** status, link para liga, horário, Time 1 versus Time 2, jogadores, vencedor, votos, método de decisão e justificativa administrativa quando existir.

**Variações:** em andamento; finalizada por maioria; finalizada por admin; cancelada/indisponível; usuário sem autorização.

## Jogadores `/players`

**Objetivo:** descobrir pessoas sem expor informação privada.

**Conteúdo:** busca por nickname e resultados com avatar, nickname, ligas públicas e quantidade de ligas públicas em comum.

**Ação:** abrir perfil público. Possui busca vazia, nenhum resultado, erro e carregar mais.

## Perfil público `/players/:userId`

**Conteúdo:** banner/avatar, nickname, data de entrada, estatísticas, forma recente, sequência, ligas públicas e partidas recentes.

**Privacidade:** não mostra e-mail, ligas privadas, requests ou convites.

## Meu perfil `/profile`

Reutiliza a apresentação pública e adiciona edição de nickname, avatar URL e banner URL. Inclui a seção de conta Riot: ausente, vinculada ou indisponível porque a integração não está configurada.

## Convites `/invitations`

Lista convites pendentes com nome da liga e autor do convite. Cada item permite aceitar ou rejeitar. Aceitar atualiza Minhas ligas. Estados: skeleton, vazio explicativo, erro com retry, mutation pendente e carregar mais.

## Operações `/ops`

### Diretório

Alterna entre usuários e ligas, com busca específica para cada tipo. Não deve se confundir visualmente com administração de uma liga.

### Detalhe do usuário

Identidade operacional, status da conta, criação, memberships, solicitações pendentes, convites pendentes e partidas recentes.

### Detalhe da liga

Owner, estado, política de entrada, contagens, membros, lobbies ativos, partidas ativas e lobbies recentes.

Na versão atual, a interface não suspende, edita nem exclui entidades nessa área.

## Telas de sistema

- **Sessão expirada:** explica o evento e oferece entrar novamente.
- **Acesso não permitido:** explica falta de permissão e volta ao início.
- **Página não encontrada:** explica URL inválida/removida e volta ao início.
- **Carregamento de rota:** fallback curto durante download de páginas lazy-loaded.
