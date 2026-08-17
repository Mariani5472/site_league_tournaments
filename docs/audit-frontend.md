# FPL_LOL — Product, UX & Frontend Audit

Data da auditoria: 14 de agosto de 2026  
Escopo: `web/src`, contratos relevantes em `api/src`, migrations, testes e documentação  
Natureza: diagnóstico e roadmap; nenhuma implementação faz parte deste documento

## 1. Executive Summary

O FPL_LOL já possui um domínio mais maduro do que sua interface comunica. Concorrência de vagas, composição de times, ready check, votação, resolução administrativa, histórico e standings têm regras reais no backend. O frontend também tem bases corretas: módulos por domínio, TanStack Query, sessão isolada por usuário, Socket.IO usado como invalidação e code splitting por rota. O problema central não é falta de engenharia; é a distância entre capacidades técnicas e uma experiência de produto coerente.

Hoje a aplicação parece um produto em transição entre protótipo funcional e primeira versão utilizável. A landing tem boa primeira dobra, mas termina cedo, apresenta uma partida fictícia como se fosse atividade e não explica o ciclo completo. Login e cadastro compartilham um único formulário, aceitam seis caracteres e não cobrem recuperação, confirmação ou feedback de senha. Após autenticar, o dashboard resume ligas, mas não responde “o que precisa da minha atenção agora?”. A página de liga reúne quase todo o produto em uma única coluna, alterna português e inglês e contém operações importantes com contratos quebrados no frontend.

Não foi confirmado nenhum P0. Foram confirmados P1 que devem anteceder redesign amplo:

- sair de uma liga envia `user.id` para uma rota que espera `league_members.id`;
- mudança de papel envia uma string onde a API exige `{ role }`;
- a tela de configurações pode redirecionar um admin antes de a membership carregar;
- exclusão aparece em dois lugares: uma ação real sem confirmação e uma “Danger Zone” que apenas executa `console.log`;
- o solicitante não vê estado pendente nem consegue usar o cancelamento já suportado pelo backend;
- `invite_only` não possui convite, aceite ou recusa;
- o perfil de outro usuário reutiliza uma projeção que inclui e-mail;
- paginação existe na API, mas o frontend descarta `nextCursor`, tornando itens após a primeira página inacessíveis.

A prioridade recomendada é tornar o loop existente confiável antes de ampliar o produto: corrigir contratos, segurança/privacidade, idioma, estados assíncronos, navegação contextual e fluxos de league join. Depois, evoluir dashboard, perfil público e descoberta de jogadores a partir de endpoints explícitos e seguros. Dark mode e nova identidade devem ser implantados por tokens e componentes, não página por página.

Veredito: a base é convincente como engenharia, mas o frontend ainda não está pronto para um grupo real usar sem mediação do autor. O caminho para ficar pronto é principalmente integração, clareza e acabamento; não uma troca de stack.

## 2. Current Product Map

### Produto real

```text
PÚBLICO
/
└── /login                 login e cadastro no mesmo formulário

AUTENTICADO
/main                      dashboard
/leagues                   minhas ligas + descoberta
/leagues/:id               liga, lobbies, membros, requests, standings e partidas
/leagues/:id/settings      configurações da liga
/leagues/:leagueId/
  lobbies/:lobbyId         times, seleção, ready, início e votação
/profile                   edição do próprio perfil + Riot opcional

QUALQUER OUTRA ROTA
└── redirect silencioso para /main ou /
```

### Mapa recomendado, sem inflar navegação

```text
PÚBLICO
/
├── /login
├── /register
├── /forgot-password       se habilitado no Supabase
└── /reset-password

AUTENTICADO
/main                      início orientado a ações
/leagues
├── minhas
└── descobrir
/players                   busca autenticada
/players/:userId           perfil público seguro
/profile                   perfil próprio e edição
/leagues/:id
├── visão geral
├── classificação
├── partidas
├── lobbies
├── membros
└── administração          somente quando autorizado
/matches/:matchId          detalhe da partida

OPERAÇÕES DA PLATAFORMA
/ops                       console isolado de superadmin
├── usuários
├── ligas
└── audit log
```

Tabs internas devem ser usadas somente na liga, onde reduzem densidade. Não há justificativa para transformar cada item em uma rota de sidebar.

## 3. Current Frontend Architecture

### O que funciona

- `web/src/modules` separa dashboard, landing, leagues, lobbies, matches, profile e Riot por domínio.
- Pages usam hooks/services em vez de chamar Axios diretamente.
- `queryKeys.ts` centraliza identidades de cache por liga, lobby e partida.
- `AuthProvider` e `SessionLifecycle` limpam cache e rotacionam Socket ao trocar usuário.
- `useLeagueSocket` e `useLobbySocket` invalidam dados REST e refazem join após reconnect.
- `React.lazy` divide todas as pages por rota; o bundle inicial medido é 168,76 KiB gzip, abaixo do budget de 220 KiB.
- Componentes Shadcn/Radix oferecem boa base de foco, dialogs e controles.

### Fragilidades reais

- Páginas e componentes mantêm dezenas de strings e enums visíveis hardcoded.
- Serviços frontend não codificam integralmente os contratos da API; dois payloads/IDs já divergiram.
- Hooks de lista retornam apenas `items`, descartando paginação e metadata.
- Mutations repetem invalidações e toasts, com cobertura desigual de erro.
- `LeaguePage` coordena cinco queries e renderiza cinco subdomínios sem uma camada de composição de estados.
- `App.css`, `ProtectedRoute`, `useLinkRiotAccount` e três arquivos vazios de ações de lobby não são usados; são ruído, não motivo para reestruturação ampla.
- Existe tema `.dark` no CSS, porém não existe provider, seletor, inicialização por `prefers-color-scheme` ou persistência.

Recomendação arquitetural: preservar módulos e criar apenas fronteiras concretas — catálogo de mensagens, status metadata, contratos paginados, componentes de async state e páginas públicas de profile/match. Não introduzir Redux, Next.js ou um design system externo.

## 4. User Journeys

### Visitante: landing → cadastro → primeira entrada

O visitante entende que o produto organiza ligas e partidas 5x5. Os CTAs “Entrar”, “Criar conta” e “Começar agora” convergem para a mesma tela. Nessa tela, “Entrar” e “Criar minha conta” operam sobre os mesmos campos, sem confirmação de senha nem distinção clara entre os dois compromissos. Se o Supabase exigir confirmação de e-mail, ausência de sessão é tratada como erro, não como estado de sucesso aguardando confirmação.

O primeiro login cria/sincroniza um nickname a partir do e-mail, mas não apresenta onboarding nem explica essa escolha. O usuário chega ao dashboard sem saber se deve completar perfil, criar liga ou descobrir uma.

### Membro: descobrir → pedir entrada → acompanhar

A descoberta exclui ligas das quais o usuário já é membro e oferece busca com debounce, o que é correto. Ao abrir uma liga `request`, o botão envia o pedido. Depois, a interface não conhece a request do próprio usuário: continua dependendo de erro `409` para impedir duplicação e não mostra “aguardando aprovação”. O backend já permite excluir a request, mas não há botão de cancelamento.

### Admin: liga → request → lobby → partida

Admin/owner consegue ver requests, criar lobby e iniciar partida. O fluxo contém operações ricas de seleção random/balanced/player picks, mas sua apresentação muda entre português e inglês e não oferece uma linha de progresso persistente. Falhas de approve/reject e role update não têm `onError` local. A página de configurações pode expulsar o admin durante a carga de members.

### Participante: lobby → ready → jogar → votar

O backend e os componentes cobrem join, mudança de time, consenso de formação, ready, start e voto. A votação informa maioria, votos faltantes e voto atual — um ponto forte. Entretanto, a página continua com header “Waiting for players...” em qualquer status, separa status e ações sem uma narrativa única e não comunica desconexão/recovery. Após finalizar, não há CTA explícito para detalhe, classificação ou próxima partida.

## 5. User Journey Dead Ends

| Origem | Dead end | Próximo passo necessário |
| --- | --- | --- |
| Cadastro com confirmação de e-mail | Mensagem aparece como erro e não orienta retorno | Estado “verifique seu e-mail” + reenviar/voltar |
| Dashboard vazio | Explica, mas não contém CTAs no próprio empty state | Criar liga e descobrir ligas |
| Request enviada | CTA não muda e pedido não fica visível | Status pendente + cancelar |
| Liga `invite_only` | Informa que é restrita, mas ninguém consegue convidar | Fluxo mínimo de convite ou remover política da UI |
| Perfil | Edita URLs, mas não conecta a ligas ou partidas | Preview, histórico e ligas públicas |
| Partida no histórico | Card não é navegável | `/matches/:matchId` |
| Partida finalizada | Resultado aparece dentro da lobby | CTA para classificação/histórico/retorno à liga |
| Rota ou recurso inexistente | Redirect silencioso | Página 404/403/removed contextual |
| Danger Zone | Botão não produz resultado ou feedback | Remover até implementar confirmação real |

## 6. Page-by-Page Audit

### Page: Landing (`/`)

**Purpose:** explicar o produto e levar a login/cadastro.  
**Current state:** hero responsivo, três promessas reais e mock visual de partida.  
**What works:** headline clara; CTAs visíveis; sem overflow horizontal em 375 px; hierarquia e espaçamento desktop consistentes; comunica que Riot não é obrigatória.  
**Problems:** mock “Próxima partida” não é marcado como demonstração; não explica o ciclo votação → standings; termina sem CTA final/footer; “Do convite ao placar final” promete convite apesar de `invite_only` não possuir fluxo.  
**Missing states/functionality:** como funciona, prova visual de lobby/votação, autoria pessoal/GitHub e footer simples. FAQ só deve entrar após existirem dúvidas reais.  
**Recommendation:** manter hero, rotular preview como demonstração, adicionar cinco passos do loop, mostrar componentes próximos dos reais, CTA final e footer enxuto.  
**Priority:** P2.

### Page: Login/Register (`/login`)

**Purpose:** autenticar e criar conta.  
**Current state:** um formulário com dois botões.  
**What works:** labels de e-mail/senha, erros inline básicos, botão desabilitado durante submit e layout sem overflow em 375/1280 px.  
**Problems:** mínimo de seis caracteres; cadastro sem confirmação; sem mostrar/ocultar; sem `autocomplete`; login e cadastro não têm estados/expectativas separados; mensagens do Supabase podem aparecer em inglês; não há forgot/reset. No desktop, a regra global de `h1` vence a intenção visual e renderiza o título da coluna azul em preto.  
**Recommendation:** separar modos ou rotas, mínimo de 10 caracteres orientado a comprimento, confirmação apenas no cadastro, medidor textual simples, `autocomplete="email|current-password|new-password"`, toggle acessível e estados de confirmação. Política forte deve ser configurada também no Supabase; frontend sozinho não garante segurança.  
**Priority:** P1.

### Page: Dashboard (`/main`)

**Purpose:** responder “o que acontece e o que faço agora?”.  
**Current state:** quantidade de ligas, soma de membros e quatro atalhos.  
**What works:** visual mais acabado que telas internas; create/discover em destaque; erro e vazio básicos.  
**Problems:** “jogadores conectados” é soma de memberships, não usuários online e pode contar a mesma pessoa várias vezes; não há lobby aguardando, voto pendente, posição ou partida recente; empty state não apresenta botões.  
**Backend support:** ligas já existem; lobbies/matches são buscáveis apenas por liga, portanto um dashboard eficiente requer endpoint agregado ou fan-out caro.  
**Recommendation:** priorizar uma seção “Sua próxima ação” e até quatro ligas recentes. Criar endpoint `/dashboard` com active lobbies, matches awaiting vote e resumo pessoal somente depois de definir o contrato. Não criar feed social nesta fase.  
**Priority:** P1.

### Page: Leagues (`/leagues`)

**Purpose:** gerenciar memberships e encontrar novas ligas.  
**Current state:** “My Leagues” e “Discover” na mesma página, busca com debounce de 300 ms.  
**What works:** busca por nome/descrição, cards clicáveis, visibilidade/vagas/política e exclusão de memberships da descoberta.  
**Problems:** quase toda a tela está em inglês; primeira carga substitui tudo por um bloco textual; vazio não oferece ação; cards próprios não mostram role, posição, lobby aberta ou ação pendente; cursor da API é descartado. Liga cheia não desabilita/explica CTA antes de abrir.  
**Recommendation:** manter uma página com duas seções, traduzir, adotar skeletons leves e load-more cursor; enriquecer “Minhas” apenas com role e uma próxima ação confiável.  
**Priority:** P1 pela paginação/idioma; P2 pelo enriquecimento.

### Page: League (`/leagues/:id`)

**Purpose:** ser o hub da competição.  
**Current state:** header seguido de lobbies, membros, requests, standings e histórico.  
**What works:** autorização condiciona requests/settings; erros parciais são recuperáveis; informações essenciais existem; standings e histórico derivam da fonte correta.  
**Problems:** densidade alta e ordem igual para todos os papéis; mistura de idiomas/enums crus; header usa `playerCount`, mas `GET /leagues/:id` faz `SELECT *` sem contagem, podendo mostrar `0 / max`; delete real não pede confirmação; leave usa ID incompatível; resultado e standings ficam longe do contexto inicial; tabela exige 520 px e delega mobile a scroll horizontal.  
**Recommendation:** visão geral com status acionável e navegação interna para classificação, partidas, lobbies e membros. Administração aparece somente para admin. Não é necessário criar seis páginas imediatamente: tabs com URLs/query string preserváveis bastam.  
**Priority:** P1 para bugs; P2 para reorganização.

### Page: League Settings (`/leagues/:id/settings`)

**Purpose:** editar regras e executar ações destrutivas.  
**Current state:** formulário com React Hook Form/Zod e Danger Zone.  
**What works:** schema local, reset a partir da query e campos coerentes com backend.  
**Problems:** redirect verifica `roleData` antes de `members` terminar; labels não usam `htmlFor`; erros do resolver não são exibidos; nomes/limites divergem do backend (`name` 50 vs 100, `maxPlayers` 128 vs 500); feedback está em inglês; Danger Zone não exclui; exclusão verdadeira está no header sem confirmação.  
**Recommendation:** compor loading de league+members, alinhar schema compartilhado/contrato, exibir erros associados, manter uma única ação destrutiva com confirmação digitada pelo nome e impacto descrito.  
**Priority:** P1.

### Page: Lobby and Match (`/leagues/:leagueId/lobbies/:lobbyId`)

**Purpose:** coordenar preparação, formação, partida e resultado.  
**Current state:** vários painéis independentes com controles contextuais.  
**What works:** consenso e draft têm regras visíveis; ready é separado de aceite dos times; votação mostra maioria e voto atual; Socket reconcilia REST no reconnect.  
**Problems:** header sempre diz “Waiting for players”; raw status e cores não seguem catálogo; ações em inglês; não há stepper/status narrativo; mutation única desabilita grupos amplos; owner/admin não recebe explicação concreta para `canStart=false`; finalize de capitães ainda é disparado também pelo cliente quando timer zera, embora worker/backend sejam canônicos; falha de join em room é silenciosa.  
**Recommendation:** criar um `LobbyPhaseHeader` derivado do estado, uma checklist “faltam X jogadores / times / ready”, status metadata e feedback de reconnect. Preservar componentes de seleção existentes.  
**Priority:** P1 para clareza do fluxo; P2 para polish.

### Page: Profile (`/profile`)

**Purpose:** editar identidade do jogador e integração Riot opcional.  
**Current state:** três inputs de texto e imagens condicionais.  
**What works:** nickname/avatar/banner persistem e Riot é ocultada quando indisponível.  
**Problems:** título e formulário em inglês; labels sem associação; banner não tem `object-cover`, aspect ratio ou fallback; avatar/banner usam URLs remotas sem preview de erro/tamanho/tipo; não há skeleton estrutural; URL vazia enviada como `null` não limpa o banco porque repository usa `COALESCE`; página não mostra estatísticas, ligas ou histórico.  
**Recommendation:** separar visualização de edição, criar header responsivo com `aspect-ratio` e fallbacks, validar preview e permitir remover imagem de verdade. Upload Supabase Storage pode vir depois; URL com preview é suficiente para MVP se riscos forem explicados.  
**Priority:** P1.

### Page: Not Found / Forbidden

**Purpose:** explicar navegação/recurso inválido.  
**Current state:** `FallbackRedirect` envia o usuário à home/main sem mensagem.  
**Problem:** mascara links quebrados, recursos removidos e erros de digitação. A API também usa 404 deliberado para liga privada, mas a UI reduz tudo a “não foi possível carregar”.  
**Recommendation:** páginas/estados para 404, sem acesso e sessão expirada, sem revelar existência de recurso privado.  
**Priority:** P2.

## 7. Landing Page Audit

A primeira dobra já tem a estrutura certa e não deve ser descartada. A melhoria de maior valor é substituir promessa genérica por explicação do loop específico:

1. crie ou encontre uma liga;
2. abra uma lobby e reúna jogadores;
3. forme times e confirme ready;
4. jogue fora da plataforma e vote no resultado;
5. acompanhe histórico e classificação.

O mock pode permanecer se receber label “Demonstração” e representar dados possíveis. Um segundo visual deve mostrar votação ou standings, que diferencia o produto de um simples organizador de grupos. Footer recomendado: marca, descrição curta, GitHub e copyright pessoal. Não adicionar Termos/Privacidade enquanto essas páginas não existirem; antes de uma demo pública com dados reais, uma nota simples de privacidade será necessária.

## 8. Authentication Audit

- **Login:** funcional, mas sem recuperação de senha e sem autocomplete.
- **Register:** usa a mesma intenção visual do login; confirmação de e-mail vira exceção.
- **Logout:** política de fallback local é determinística e testada; o header mostra feedback bloqueante.
- **Session restoration:** loading impede conteúdo privado e troca de conta limpa cache.
- **Redirects:** usuário autenticado em `/login` vai para `/main`; visitante protegido vai para `/`. Seria melhor preservar `returnTo` seguro para voltar à rota desejada.
- **Errors:** Axios transforma tudo em uma mensagem simples, mas preserva mensagens do backend em inglês; não diferencia offline, credencial inválida, rate limit e indisponibilidade.

## 9. Password/Security UX

### Política recomendada

- mínimo de 10 caracteres para nova senha;
- permitir passphrases e password managers;
- não exigir composição arbitrária;
- bloquear lista curta de senhas muito comuns no provedor/backend, se Supabase oferecer o recurso no tier usado;
- confirmação de senha no cliente;
- mostrar/ocultar com nome acessível;
- `autocomplete` correto;
- nunca registrar senha nem medir força remotamente.

O Supabase precisa aplicar o mínimo real; a validação React é somente feedback antecipado. Forgot/reset e confirmação de e-mail são P1 se contas reais serão abertas. MFA é P4 para este produto, salvo risco/uso que justifique.

## 10. Dashboard Audit

O dashboard atual não deve ser removido, mas precisa mudar de métrica para decisão. Ordem recomendada:

1. **Próxima ação:** voto pendente, lobby em waiting da qual participa ou request administrativa.
2. **Minhas ligas:** até quatro, com role e status útil.
3. **Partidas recentes:** últimas três do próprio usuário.
4. **Resumo pessoal:** partidas, W/L e win rate, sempre deixando claro se é global ou por liga.

“Atividade recente” só deve existir após um event model; inferir atividade consultando várias tabelas aumenta custo e ambiguidade. “Jogadores conectados” deve ser renomeado para “memberships nas suas ligas” ou removido.

## 11. Profile Audit

O perfil deve funcionar como identidade, não como formulário permanente. O MVP recomendado contém:

- banner 3:1, avatar circular/quadrado sobreposto e fallback por iniciais;
- nickname e data aproximada de entrada (`users.created_at` já existe);
- estatísticas confiáveis derivadas de `match_players`;
- ligas públicas;
- cinco partidas recentes;
- botão editar apenas no próprio perfil.

Bio existe na migration, mas não é selecionada nem atualizada. Não deve ser exposta apenas porque a coluna existe; primeiro definir utilidade e limite.

## 12. Player Discovery Proposal

**Problema:** membros não conseguem encontrar identidade/histórico fora de uma liga.  
**Valor:** alto para convite, reconhecimento e navegação contextual.  
**Escopo recomendado:** busca autenticada por nickname, debounce 300–400 ms, cursor, avatar, nickname e ligas públicas/em comum.  
**Privacidade:** não retornar e-mail, IDs de auth, Riot PUUID ou ligas privadas; limitar/rate-limit para evitar enumeração massiva.  
**Backend:** novo endpoint explícito `GET /players?search=&cursor=&limit=` com projeção pública.  
**Frontend:** `/players` e componente de resultado reutilizável em members/invites.  
**Prioridade:** P2, entregue junto com perfil público.

Uma busca/modal apenas para convidar resolve menos problemas. Uma página compacta é justificável porque também habilita perfis e navegação entre entidades.

## 13. Public Player Profile Proposal

Usar `/players/:userId`, não `/profile/:userId` na UI, para separar identidade pública de edição. O endpoint atual prova viabilidade, mas seu contrato não é seguro porque inclui `email`.

Contrato público sugerido:

```text
id, nickname, avatarUrl, bannerUrl, createdAt
stats: gamesPlayed, wins, losses, winRate
publicLeagues[]
recentMatches: cursor page
```

Estatísticas globais podem ser mostradas com label “Todas as ligas”; desempenho por liga deve permanecer separado. Não incluir KDA, champion, CS ou métricas Riot inexistentes.

## 14. League Discovery Audit

O backend filtra ligas públicas, exclui memberships e ordena por UUID decrescente com cursor. A UI oferece debounce correto, mas não passa `limit/cursor`, descarta `nextCursor` e não representa request pendente. Filtros úteis e baratos: entrada aberta/aprovação, vagas disponíveis e nome. Não adicionar filtros avançados sem volume.

Cards devem exibir: nome, descrição curta, membros/max, vagas, política traduzida e estado do usuário. “Entrar” pode acontecer no card para ligas abertas; “Ver liga” continua sendo CTA principal para approval/invite-only.

## 15. Join Request Audit

Backend já suporta criar, listar para admin, aprovar, rejeitar e cancelar request pendente. Frontend suporta apenas criar e administrar. O fluxo do solicitante está incompleto.

Estado recomendado:

```text
sem request       → Solicitar entrada
mutation          → Enviando…
pending           → Solicitação pendente [Cancelar]
rejected          → Solicitação não aprovada [Solicitar novamente]
approved/member   → Abrir liga
league full       → Liga cheia
```

É necessário endpoint/shape que informe a request do usuário na descoberta/detalhe ou `GET /leagues/:id/requests/mine`; não expor a lista administrativa. Realtime deve invalidar esse estado para o solicitante, não apenas room da liga, pois não-membro pode não ter grant persistente nessa room.

## 16. League Page Audit

A liga deve responder em ordem: “onde estou?”, “o que está acontecendo?”, “o que posso fazer?”. A visão geral recomendada traz role, posição, lobby ativa, última partida e contagem de membros. Standings e matches merecem áreas navegáveis; administração deve sair do fluxo principal.

Antes dessa reorganização, corrigir contratos e remover duplicidade de delete. Tabs devem funcionar por teclado, ter URL preservável e virar navegação compacta/mobile — não simplesmente esconder blocos em estado local.

## 17. Lobby & Match UX Audit

O protocolo é o maior diferencial do produto e merece uma representação de fases:

```text
Reunindo jogadores → Formando times → Confirmando ready → Em partida → Votação → Finalizada
```

Cada fase deve mostrar uma ação primária e bloqueios concretos. Exemplo: “Faltam 2 jogadores”, “3 jogadores ainda não confirmaram”, “aguardando capitão do Time 2”. A interface não precisa mostrar detalhes de lock/maioria técnica além do que ajuda decisão.

## 18. Match History Audit

O histórico atual mostra data, status, nomes, winner, tipo de resolução e votos — dados corretos. Problemas: lista limitada à primeira página, data sem locale/timezone explícitos, densidade textual, ausência de link e nenhuma separação visual forte entre vitória/derrota do usuário.

Criar card responsivo com dois times, winner, data e league. Detalhe pode reutilizar `GET /matches/:matchId`; decidir se contagem agregada de votos é pública aos membros. Nunca expor voto individual.

## 19. Navigation Audit

Sidebar atual tem três itens e active state correto. A simplicidade é positiva. Recomenda-se:

- “Início”, “Ligas”, “Jogadores”, “Perfil” após player discovery;
- email sair do header em favor de avatar/nickname menu;
- logout dentro do menu em desktop, mantendo acesso claro;
- breadcrumbs somente em settings, lobby e match detail;
- fechar sidebar com Escape e gerenciar foco/scroll quando aberta;
- oferecer `returnTo` após login;
- página 404 real.

Não adicionar item separado para standings, requests ou settings globais sem necessidade.

## 20. Internationalization Audit

O problema está confirmado em sidebar, Leagues, LeagueHeader, dialogs, Lobby, MatchVoting, Profile, Settings, toasts e erros. Datas usam `toLocaleString()` sem locale; enums aparecem crus.

Para o tamanho atual, começar com solução tipada e pequena:

```text
src/i18n/
├── messages.ts            contrato/chaves
├── pt-BR.ts
├── en-US.ts
├── I18nProvider.tsx
└── formatters.ts           data, número, percentual e plural
```

Um provider com `locale`, `t(key, params)` e `Intl` é suficiente inicialmente. `react-i18next` passa a valer quando houver namespaces grandes, carregamento assíncrono ou contribuição frequente de tradução. Não traduzir copiando strings manualmente; status e erros de domínio precisam de códigos estáveis, pois mensagens inglesas vindas da API não são uma API de i18n.

Prioridade: P1 para pt-BR consistente; seleção English é P2.

## 21. Dark Mode Audit

Tokens `.dark` já existem, assim como variante Tailwind, mas nenhum código aplica a classe. Também existem variáveis legadas (`--text`, `--bg`, `--text-h`) fora do sistema Shadcn; o bug do heading no painel de login é um efeito dessa convivência.

Implementação recomendada: `ThemeProvider` com `light | dark | system`, script inicial que evita flash, `localStorage` e listener de `matchMedia`. Persistência server-side não agrega valor agora. Antes de liberar, auditar emerald/red hardcoded, `text-white`, overlays, charts, images, dialogs, selects, toasts e focus rings.

Prioridade: P2 depois da consolidação dos tokens.

## 22. Responsive Audit

### Evidência visual

- Landing: sem overflow em 375 px; CTAs empilham e hero reduz de 60 para 36 px.
- Login: sem overflow em 375 px; painel institucional some e formulário permanece legível.
- Desktop 1280 px: landing e login usam largura corretamente.

### Riscos por código

- `LeagueResults` exige tabela de 520 px e usa scroll horizontal.
- Members/requests combinam nome, badge, select e botões em flex wrap; em 320 px podem ficar densos e sem ordem clara.
- Lobby apresenta múltiplas grades e botões; player picks pode gerar scroll vertical extenso.
- Profile banner força `h-40 w-full` sem crop e avatar não compõe com o banner.
- Header autenticado esconde email, mas não oferece identidade alternativa além de logout.
- Dialogs dependem da implementação base; formulários longos precisam confirmar altura/teclado mobile.

Recomendação: validar 320, 375, 768, 1024 e 1440 com dados longos, 50 membros e times cheios. Standings deve virar lista/cards compactos abaixo de `sm`, não somente scroll.

## 23. Accessibility Audit

### Pontos positivos

- Landing usa `header`, `main`, `section`, headings e links reais.
- Login tem labels e inputs com IDs.
- Match vote usa `aria-pressed`.
- Fallback lazy usa `role=status`, `aria-live` e `aria-busy`.
- Shadcn/Radix fornece foco e semântica em controles base.

### Problemas concretos

- Profile e Settings usam `<label>` sem `htmlFor`/controle associado.
- Erros do login não usam `aria-describedby` nem movem/anunciam foco no submit.
- Mensagens de mutation por toast não garantem contexto junto ao controle.
- Overlay mobile é `div` clicável; menu não explicita `aria-expanded`, `aria-controls`, focus trap ou Escape.
- Ready é indicado por ícone/cor sem label textual no `PlayerCard`.
- Status têm tratamento visual inconsistente e alguns dependem apenas de verde/vermelho.
- O heading preto no painel primary do login contradiz a hierarquia e deve ter contraste/intenção revisados.
- Não há skip link na área autenticada.

Prioridade: P1 para formulários/ações; P2 para navegação e refinamento.

## 24. Async States Audit

Há mistura de `Loading...`, textos em português, blocos de erro e telas vazias. Nenhuma estratégia comum diferencia initial loading de background refetch. Queries de League carregam independentemente, causando layout em saltos. Alguns erros têm retry; outros só exibem texto. Mutations de members/requests omitem `onError`.

Criar três padrões simples:

- `PageSkeleton` por estrutura, não spinner global;
- `InlineError` com mensagem localizada, retry e correlation ID quando disponível;
- `EmptyState` com título, descrição e até duas ações.

Não esconder conteúdo existente durante background refresh. Para destructive/actions, usar loading no botão e manter diálogo aberto até sucesso.

## 25. Frontend Performance Audit

- Route splitting está implementado e validado.
- Bundle inicial: 576,14 KiB minificado / 168,76 KiB gzip; budget 220 KiB gzip.
- Match polling só ocorre quando Socket está desconectado; reconnect/focus recuperam estado.
- Busca de ligas tem debounce.

Riscos restantes:

- frontend não continua cursores, então hoje evita render enorme ao custo de dados invisíveis;
- URLs de avatar/banner carregam imagens sem dimensões/tamanho/otimização e podem causar layout shift ou downloads excessivos;
- `useLeagueSocket` invalida sete famílias no reconnect, aceitável para uma liga, mas merece medição antes de ampliar dashboard;
- dashboard agregado por fan-out por liga seria caro; preferir endpoint dedicado;
- chunk compartilhado ainda gera warning bruto acima de 500 KiB, embora gzip esteja no budget. Medir Web Vitals antes de manual chunks cosméticos.

## 26. Realtime UX Audit

A arquitetura correta é REST como fonte e Socket como sinal. Listeners possuem cleanup e reconnect refaz join. O que falta é UX:

- estado “reconectando” em lobby/partida;
- aviso discreto quando fallback de polling está ativo;
- tratamento visível de ack de room negado;
- confirmação de que atualização ocorreu sem desmontar toda a tela;
- invalidação dirigida ao solicitante fora da room após approve/reject.

Não implementar optimistic updates em votação/ready antes de garantir rollback visual; invalidação atual é mais segura.

## 27. Backend Capabilities Not Exposed by the Frontend

| Capability | Backend | Frontend | Opportunity | Priority |
| --- | --- | --- | --- | --- |
| Perfil por usuário | `GET /profile/:userId` | Apenas `/profile` próprio | Base para perfil público após remover email | P1 segurança / P2 feature |
| Cancelar request | `DELETE /leagues/:leagueId/requests/:requestId` | Não existe service/button | Completar estado pendente | P1 |
| Adicionar membro diretamente | `POST /leagues/:leagueId/members/:memberId` | Não exposto | Pode apoiar convite administrativo, mas não substitui aceite | P2/P3 |
| Match detail | `GET /matches/:matchId` | Consumido somente dentro da lobby | Criar detalhe navegável | P2 |
| Paginação de discover/members/requests/matches | cursor + limit, máximo 100 | `nextCursor` descartado | Load more/infinite query | P1 |
| Filtros members | nickname e role | Não expostos | Útil apenas em ligas grandes | P3 |
| Filtros requests | status e search | UI filtra apenas pending da primeira página | Administração escalável | P2 |
| `users.created_at` | migration | Não projetado em profile | “Na plataforma desde” | P2 |
| `users.bio` | migration | Sem API/UI | Não expor sem caso de uso | OUT OF SCOPE |

## 28. Missing Product Capabilities

- contrato seguro de perfil público;
- busca paginada de jogadores;
- estado da request para o próprio solicitante;
- convite completo para política `invite_only`;
- match detail navegável;
- dashboard agregado orientado a ações;
- recuperação/reset de senha;
- theme/language preferences locais;
- páginas 404/forbidden/session expired;
- upload gerenciado ou política clara de imagens externas.
- console operacional seguro para moderação sem acesso direto ao banco.

## 29. New Feature Opportunities

| Feature | Problema resolvido | Valor | Dependências | Complexidade | Prioridade |
| --- | --- | --- | --- | --- | --- |
| Player search + public profile | Identidade termina dentro da liga | Alto | Endpoint público seguro, paginação | Alta | P2 |
| Request status/cancel | Usuário não sabe se pedido existe | Alto | Endpoint mine ou projeção | Média | P1 |
| Match detail | Histórico não permite exploração | Médio/alto | Endpoint já existe; rota UI | Baixa/média | P2 |
| Dashboard actions | Home não orienta retorno | Alto | Endpoint agregado | Média/alta | P1 |
| League invitations | `invite_only` incompleto | Alto para grupos fechados | Tabela/estado/notifications | Alta | P2 |
| Shareable public league link | Facilita descoberta | Médio | Página pública e privacidade | Média | P3 |
| Theme/language settings | Preferência e consistência | Médio | Providers locais | Média | P2 |
| Lightweight notifications | Requests/votos passam despercebidos | Médio | Modelo persistente ou inbox | Alta | P3 |

### Superadmin / Operations Console

Um console de superadmin é útil para operação do produto: permite resolver abuso, conteúdo inválido e inconsistências administrativas sem executar SQL manual. Entretanto, não deve reutilizar os papéis `owner` ou `admin` de uma liga. Esses papéis são locais ao domínio; superadmin é uma permissão global e sensível da plataforma.

#### Problema que resolve

- suporte hoje dependeria de acesso direto ao PostgreSQL;
- não existe interface para localizar e moderar usuários ou ligas;
- banimento, suspensão e ações corretivas não possuem modelo de domínio;
- alterações manuais no banco não geram trilha de auditoria nem fluxo de confirmação.

#### Tela proposta

```text
/ops
├── Visão geral
│   ├── usuários ativos/suspensos/banidos
│   ├── ligas e lobbies por status
│   └── falhas operacionais recentes sem PII desnecessária
├── Usuários
│   ├── buscar por nickname ou ID exato
│   ├── visualizar estado e memberships
│   ├── suspender até uma data
│   ├── banir / reativar
│   └── remover de uma liga quando justificado
├── Ligas
│   ├── buscar e inspecionar owner, membros e estado
│   ├── editar metadados/regras
│   ├── transferir owner por fluxo seguro
│   ├── suspender/arquivar liga
│   └── excluir somente como última medida
├── Lobbies e partidas
│   ├── consultar estado
│   ├── cancelar lobby travada
│   └── ações excepcionais explicitamente suportadas pelo domínio
└── Audit log
    ├── ator, ação, alvo, motivo e data
    └── estado anterior/posterior sem tokens ou segredos
```

#### Regras obrigatórias

- autorização deve ser validada no backend por claim/role global confiável; ocultar `/ops` no React não é segurança;
- não armazenar uma flag editável pelo próprio usuário no profile comum;
- exigir reautenticação e, preferencialmente, MFA para operações destrutivas;
- toda mutation exige motivo, confirmação e registro de auditoria;
- suspensão deve ser temporária e reversível; banimento deve possuir estado e motivo, não apagar o usuário;
- remoção definitiva de usuário deve ser separada de banimento e considerar dados relacionados, retenção e Supabase Auth;
- excluir liga deve ser última opção; preferir suspender/arquivar e preservar histórico;
- operações em memberships devem reutilizar services/invariantes existentes, nunca SQL arbitrário pelo frontend;
- não exibir access tokens, e-mail desnecessário, secrets ou payloads internos;
- busca ampla de usuários deve ter rate limit, paginação e log para reduzir abuso interno.

#### Backend necessário

O backend atual não possui conceito de superadmin, suspensão ou banimento; `users.routes.ts` está vazio e contém apenas um TODO no controller. São necessários:

- fonte confiável de autorização global, idealmente custom claim validada no servidor ou tabela de operadores não editável pelas APIs comuns;
- middleware `requirePlatformRole("superadmin")`;
- estados de usuário como `active | suspended | banned`, `suspendedUntil`, motivo e timestamps;
- estado operacional de liga como `active | suspended | archived`, sem conflitar com visibility/join policy;
- endpoints `/ops/users`, `/ops/leagues` e ações explícitas, sem endpoint genérico de update/SQL;
- tabela append-only de audit log com actor, target, action, reason, correlation ID e mudanças permitidas;
- integração com revogação de sessão/Socket e, quando necessário, Supabase Admin API mantida somente no backend;
- testes de autorização negativa, idempotência, reversão e concorrência.

#### UX e segurança operacional

A tela deve deixar o contexto operacional sempre visível e usar cor destrutiva apenas na ação final. Listas precisam de filtros por estado e paginação. Detalhes devem abrir antes de qualquer mutation; bulk actions não são recomendadas no MVP. Mensagens devem explicar o efeito concreto: suspender login, desconectar sessões, preservar histórico ou bloquear novas ações.

#### Prioridade e escopo

**Valor:** alto para operação quando houver usuários reais.  
**Complexidade:** alta.  
**Prioridade:** P2 antes de abrir o produto publicamente; P3 se o uso continuar restrito a um grupo pequeno e confiável.  
**Entrega inicial:** busca, inspeção, suspensão/reativação e suspensão/arquivamento de liga com audit log. Banimento definitivo, exclusão de usuário e correções excepcionais de partida ficam para uma segunda etapa após política de retenção.

## 30. Scope-Creep / Features Not Recommended

- **Friends/follow/favorites:** não resolvem o loop melhor que busca + convite. OUT OF SCOPE.
- **Chat:** eventos constam no enum frontend, mas não há produto/backend. Discord já resolve; OUT OF SCOPE.
- **Seasons:** altera standings, histórico e identidade competitiva. P4 após evidência.
- **Times permanentes:** conflita com formação por lobby. P4.
- **KDA/champion/gold:** dados não existem. OUT OF SCOPE.
- **Achievements, moeda, marketplace:** sem relação com o problema central. OUT OF SCOPE.
- **Feed social completo:** custo alto; dashboard de ações resolve 80%. OUT OF SCOPE.
- **MFA obrigatório:** desproporcional agora; manter como opção futura do provedor.

## 31. Visual Identity Audit

A linguagem atual usa Geist, indigo, cards brancos, radius alto e sombra leve. Landing e dashboard parecem parte de um produto; League, Lobby, Settings e Profile parecem telas administrativas anteriores. Há duas camadas de tokens (`--text/--bg` e tokens Shadcn) e cores semânticas ad hoc (`emerald-500`, `green-600`, `red-600`). Status aparecem como enum cru ou badge default.

O resultado é correto, porém genérico e inconsistente. A identidade não precisa ficar mais “gamer”; precisa ficar mais esportiva e informativa: placar, posição, fase, ação e rivalidade devem ter prioridade sobre cards decorativos.

## 32. Visual Direction Proposal

### Design principles

1. **Competition is legible:** números, posição, fase e vencedor são escaneáveis.
2. **The next action wins:** uma ação primária por contexto.
3. **Community, not spectacle:** identidade forte sem neon/glassmorphism.
4. **State is explicit:** label + cor + ícone, nunca apenas cor.
5. **Dense when useful:** standings e times compactos; formulários respiram.

### Mood

“Competitive clubhouse”: organizado, confiante, esportivo e social. Menos dashboard SaaS, mais mesa de liga moderna.

### Color direction

- ink/navy neutro para texto e dark surfaces;
- azul-cobalto como primary, preservando reconhecimento atual;
- dourado dessaturado apenas para liderança/destaque competitivo;
- teal para success/ready;
- âmbar para waiting/pending;
- coral/vermelho para danger/cancelled;
- superfícies levemente frias no light e grafite azulado no dark.

### Typography

Manter Geist. Headings 600–700; body 400–500; estatísticas com `font-variant-numeric: tabular-nums`; labels pequenas em caixa normal, evitando uppercase excessivo.

### Component character

Radius moderado de 10–14 px. `rounded-3xl` apenas em hero/feature; cards operacionais mais compactos. Borders definem estrutura; sombras somente em overlay, hero e elevação temporária.

### Navigation

Sidebar escura ou surface contrastante, active item por barra/tonal background em vez de bloco primary inteiro. Mobile drawer com foco gerenciado.

### Cards and tables

Cards representam entidade/ação, não apenas agrupamento. Tabelas usam alinhamento numérico e viram linhas/cards em mobile. Top 3 recebe destaque moderado, sem pódio ornamental.

### Profile

Banner 3:1 com overlay sutil, avatar 96–120 px, identidade e record na dobra. Edição em dialog/painel separado.

### League and match

League usa scoreboard summary; lobby usa fases; match usa dois lados simétricos, “VS”, winner e método de decisão.

### Dark mode

Dark não é inversão. Surfaces em dois níveis, border visível, primary menos luminosa, success/warning ajustados e imagens com overlay apenas quando texto sobreposto.

### Motion

150–220 ms para drawer/dialog/hover; confirmação curta de voto/ready; nenhuma animação contínua. Respeitar `prefers-reduced-motion`.

### Things to avoid

- roxo neon + preto por associação automática com gaming;
- glassmorphism generalizado;
- gradiente em toda section;
- cards para cada texto;
- copiar dourado/azul e tipografia oficial da Riot;
- animações de ranking sem mudança real;
- ícones de bibliotecas diferentes.

## 33. Design System Proposal

### Tokens mínimos

```text
color.background
color.surface / surfaceElevated
color.text / textMuted
color.primary / primaryForeground
color.accent
color.success / warning / danger / info
color.border / focus
radius.control / card / hero
space.1…space.8
shadow.overlay / floating
motion.fast / standard
```

### Catálogos concretos

- `statusMeta`: waiting, in_game, finished, cancelled, pending, approved, rejected;
- `roleMeta`: owner, admin, player, spectator;
- `joinPolicyMeta`: open, request, invite_only;
- `visibilityMeta`: public, private.

Cada item fornece chave de tradução, tone e ícone. Isso elimina decisões locais sem criar componente excessivamente configurável.

### Migração incremental

1. tokens + theme provider + catálogo de status;
2. layout/sidebar/header e async states;
3. Button, Badge, Avatar, form fields, entity cards;
4. League/Lobby/Match/Profile;
5. landing e polish final.

## 34. Quick Wins

| Item | Impacto | Esforço |
| --- | --- | --- |
| Corrigir ID de leave e body de role update | Alto | Baixo |
| Esperar members antes do redirect de settings | Alto | Baixo |
| Remover Danger Zone falsa e confirmar delete real | Alto | Baixo |
| Corrigir heading preto no painel azul do login | Médio | Baixo |
| Associar labels/erros aos inputs | Médio | Baixo |
| Traduzir catálogo de status/roles/policies | Alto | Baixo/médio |
| Exibir request pendente e cancelamento | Alto | Médio |
| Preservar `nextCursor` e adicionar “Carregar mais” | Alto | Médio |
| Rotular mock da landing + CTA final/footer | Médio | Baixo |
| Renomear “Jogadores conectados” | Médio | Baixo |
| Linkar cards de match a detalhe | Médio | Médio |

## 35. Big Bets

### Dashboard orientado a ações

Alto valor de retenção, mas exige endpoint agregado e definição precisa de prioridade. Deve vir depois dos bugs P1.

### Player Discovery + Public Profiles

Cria identidade e navegação contextual. Só deve ser lançado com projeção pública segura e sem email.

### Complete Invitations

Fecha uma política já exposta. Exige persistência, recipient inbox e estados; não pode ser apenas “admin adiciona UUID”.

### Incremental Visual System

Transforma percepção do produto sem rewrite. Deve avançar por tokens/layout/core pages e incluir light/dark desde o começo.

### Superadmin Operations Console

Reduz operações manuais no banco e cria governança para um lançamento público. É uma big bet de segurança operacional: só entrega valor se vier acompanhada de roles globais server-side, suspensão reversível, revogação de sessão e audit log. Uma tela sem esse backend aumentaria o risco em vez de reduzi-lo.

## 36. Findings Matrix

| ID | Área | Tipo | Problema/Feature | Impacto | Complexidade | Prioridade |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | League | BUG | Leave envia user ID, rota espera membership ID | Alto | Baixa | P1 |
| F-02 | Members | BUG | Role update envia string, schema exige objeto | Alto | Baixa | P1 |
| F-03 | Settings | BUG | Redirect ocorre antes de members carregar | Alto | Baixa | P1 |
| F-04 | Delete | BUG/UX | Ação duplicada: sem confirmação e no-op | Alto | Baixa | P1 |
| F-05 | Join request | PRODUCT/UX | Solicitante não vê estado nem cancelamento | Alto | Média | P1 |
| F-06 | Invite only | FEATURE | Política não possui fluxo de convite | Alto | Alta | P2 |
| F-07 | Profile API | SECURITY | Perfil arbitrário inclui email | Alto | Média | P1 |
| F-08 | Auth | SECURITY/UX | Senha mínima 6 e cadastro incompleto | Alto | Média | P1 |
| F-09 | Global | I18N | Português/inglês e enums misturados | Alto | Média | P1 |
| F-10 | Routing | UX | 404 vira redirect silencioso | Médio | Baixa | P2 |
| F-11 | Dashboard | PRODUCT | Não apresenta próxima ação | Alto | Alta | P1 |
| F-12 | Profile | UI/PRODUCT | Identidade e imagens frágeis | Alto | Média | P1 |
| F-13 | Players | FEATURE | Busca/perfil público ausentes | Médio/alto | Alta | P2 |
| F-14 | Lists | PERFORMANCE/BUG | Cursores descartados após primeira página | Alto | Média | P1 |
| F-15 | League | BUG | Detail não projeta playerCount | Médio | Baixa | P2 |
| F-16 | Mutations | UX | Members/requests podem falhar sem feedback | Alto | Baixa | P1 |
| F-17 | Landing | PRODUCT | Mock não rotulado e footer ausente | Médio | Baixa | P2 |
| F-18 | Login | UI | Heading preto sobre painel primary | Médio | Baixa | P2 |
| F-19 | Theme | DESIGN SYSTEM | Dark tokens existem sem controller | Médio | Média | P2 |
| F-20 | Status | DESIGN SYSTEM | Enums/cores decididos por tela | Médio | Média | P2 |
| F-21 | History | PRODUCT | Sem detalhe/paginação/locale explícito | Médio | Média | P2 |
| F-22 | League | RESPONSIVE | Página densa e tabela mobile por scroll | Médio | Média | P2 |
| F-23 | Lobby | UX | Fase/impedimentos/reconnect pouco claros | Alto | Média | P1 |
| F-24 | Profile | BUG | Remover URL não limpa coluna por COALESCE | Médio | Baixa | P2 |
| F-25 | Errors | UX/I18N | Erros de backend viram texto inglês genérico | Médio | Média | P2 |
| F-26 | Forms | ACCESSIBILITY | Labels e erros sem associação | Alto | Baixa | P1 |
| F-27 | Onboarding | PRODUCT | Primeira entrada sem orientação | Médio | Média | P2 |
| F-28 | Tests | TECH DEBT | Formulários, rotas e responsive sem cobertura | Médio | Média | P2 |
| F-29 | Operations | PRODUCT/SECURITY | Não há console ou modelo seguro de moderação global | Alto quando público | Alta | P2/P3 |

### Evidências detalhadas dos P1 técnicos

#### F-01 — Sair da liga usa identificador incompatível

**Observed:** `LeagueHeader` chama `leaveLeague(league.id, user?.id)`.  
**Evidence:** `web/src/modules/leagues/components/LeagueHeader.tsx`; `web/src/modules/leagues/services/leagues.service.ts`; `api/src/modules/league-members/league-members.service.ts`.  
**Impact:** membro recebe 404 e não consegue sair.  
**Expected:** resolver membership ID ou criar endpoint `/members/me`.  
**Backend change:** recomendado para contrato menos ambíguo.  
**Complexity:** Low.

#### F-02 — Atualização de papel não atende ao schema

**Observed:** service envia `role` como body bruto; backend parseia `{ role }`.  
**Evidence:** `web/src/modules/leagues/services/leagues.service.ts`; `api/src/modules/league-members/leagues-members.schemas.ts`.  
**Impact:** administração de roles falha com 400.  
**Expected:** body tipado `{ role }` e teste de contrato.  
**Backend change:** No.  
**Complexity:** Low.

#### F-03 — Guard de settings tem race

**Observed:** redirect depende somente de `useLeague().isLoading`, enquanto `useLeagueMembers` ainda pode estar pendente.  
**Evidence:** `web/src/modules/leagues/pages/LeagueSettingsPage.tsx`.  
**Impact:** admin legítimo pode ser redirecionado.  
**Expected:** aguardar ambas as queries e tratar erro.  
**Backend change:** No.  
**Complexity:** Low.

#### F-04 — Exclusão destrutiva é contraditória

**Observed:** header exclui imediatamente; Danger Zone só faz `console.log`.  
**Evidence:** `LeagueHeader.tsx`; `DangerZone.tsx`.  
**Impact:** risco de exclusão acidental e falsa affordance.  
**Expected:** uma única ação confirmada.  
**Backend change:** No.  
**Complexity:** Low.

#### F-05 — Request do solicitante não fecha o ciclo

**Observed:** UI não consulta a request própria; backend já suporta cancelamento.  
**Evidence:** `LeagueJoinActions.tsx`; `leagues.service.ts`; `league-join-requests.routes.ts`.  
**Impact:** CTA continua disponível e usuário depende de erro para conhecer estado.  
**Expected:** estado mine + cancelamento.  
**Backend change:** Yes, projeção segura/mine.  
**Complexity:** Medium.

#### F-07 — Perfil de terceiro expõe campo privado

**Observed:** `/profile/:userId` retorna a mesma seleção que contém `email`.  
**Evidence:** `api/src/modules/profile/profile.routes.ts`; `profile.controller.ts`; `profile.repository.ts`.  
**Impact:** qualquer autenticado pode consultar email por UUID conhecido.  
**Expected:** DTO/projeção pública explícita.  
**Backend change:** Yes.  
**Complexity:** Medium.

#### F-14 — UI perde páginas subsequentes

**Observed:** services retornam `data.items` e descartam `nextCursor`.  
**Evidence:** `web/src/modules/leagues/services/leagues.service.ts`; `web/src/modules/matches/services.ts`; schemas de paginação API.  
**Impact:** após 50 itens, dados existem mas não são acessíveis.  
**Expected:** `useInfiniteQuery` ou load-more mantendo cursor/filtros.  
**Backend change:** No.  
**Complexity:** Medium.

## 37. Feature Matrix

| Feature | Valor | Backend necessário | Frontend | Complexidade | Prioridade |
| --- | ---: | --- | --- | --- | --- |
| Request status/cancel | Alto | Ajuste pequeno | Hooks + CTA states | Média | P1 |
| Dashboard action center | Alto | Novo agregado | Nova composição | Alta | P1 |
| Public profiles | Alto | DTO/endpoints seguros | Rota/page | Alta | P2 |
| Player search | Alto | Busca paginada/rate limit | Página + debounce | Alta | P2 |
| Match detail | Médio/alto | Já existe, talvez DTO | Rota/page | Média | P2 |
| Theme switcher | Médio | Não | Provider + auditoria tokens | Média | P2 |
| Language switcher | Médio | Códigos de erro ajudam | Provider/messages | Média | P2 |
| League invites | Alto | Tabela/endpoints/events | Inbox/admin flow | Alta | P2 |
| Superadmin operations console | Alto quando houver usuários reais | Roles globais, estados, audit log e revogação | Área `/ops` isolada | Alta | P2/P3 |
| Notifications | Médio | Persistência/inbox | Header/list | Alta | P3 |
| Share league | Médio | Página pública opcional | CTA/share | Média | P3 |
| Seasons | Incerto | Mudança profunda | Mudança profunda | Muito alta | P4 |

## 38. Page Matrix

| Página | Estado atual | UX | Visual | Funcionalidade | Prioridade de revisão |
| --- | --- | --- | --- | --- | --- |
| Landing | Boa primeira dobra | Loop incompleto | Coerente | Mock/footer incompletos | P2 |
| Login/Register | Funcional básico | Intenções misturadas | Bom mobile; contraste desktop | Política/recovery ausentes | P1 |
| Dashboard | Resumo de ligas | Pouco acionável | Um dos melhores layouts | Dados insuficientes | P1 |
| Leagues | Mine + Discover | Busca boa; estados fracos | Cards coerentes | Paginação perdida | P1 |
| League | Hub completo | Denso e inconsistente | Legado vs telas novas | Bugs em leave/delete/count | P1 |
| Settings | Form presente | Erros/guard frágeis | Básico | Danger Zone falsa | P1 |
| Lobby | Protocolo completo | Fase pouco clara | Muitos painéis equivalentes | Realtime/ações ricos | P1 |
| Profile | Editor simples | Sem identidade/histórico | Avatar/banner frágeis | Clear URL quebrado | P1 |
| Not Found | Não existe | Redirect confuso | — | Ausente | P2 |
| Players/Public Profile | Não existe | — | — | Backend parcial inseguro | P2 |
| Match Detail | Não existe | — | — | Backend já existe | P2 |
| Superadmin `/ops` | Não existe | — | Deve ser claramente operacional | Backend/modelo ausentes | P2/P3 |

## 39. Prioritized Roadmap

### MUST HAVE — produto utilizável

#### Phase 0 — Correctness and privacy

- F-01, F-02 e F-03;
- contrato público de profile sem email;
- uma única exclusão com confirmação;
- feedback de erro em todas as mutations críticas;
- testes dos contratos corrigidos.

#### Phase 1 — Product language and entry

- catálogo pt-BR + status/roles/policies;
- cadastro separado, senha 10+, confirmação e email-confirmation state;
- forgot/reset se o ambiente real aceitar usuários;
- labels, errors, autocomplete e foco;
- página 404/contextual errors.

#### Phase 2 — League loop completion

- request mine/pending/cancel;
- paginação em discover, members, requests e matches;
- player count correto;
- lobby phase/checklist e feedback de reconnect;
- CTA pós-partida para histórico/standings.

### SHOULD HAVE — produto convincente

#### Phase 3 — Dashboard and information architecture

- endpoint agregado de próximas ações;
- dashboard baseado em lobbies/votos/partidas;
- overview/tabs da liga com URL preservável;
- match detail.

#### Phase 4 — Player identity

- redesign do perfil próprio;
- endpoint e página de perfil público;
- busca de jogadores;
- histórico e ligas públicas;
- correção/estratégia de imagens.

#### Phase 5 — Visual system

- tokens semânticos consolidados;
- light/dark/system;
- async/empty/error components;
- status/roles badges;
- responsive standings/members/lobby;
- landing completa e footer.

#### Phase 6 — Operations before public launch

- role global de operador validada no backend;
- `/ops` separado da aplicação comum;
- busca e inspeção paginada de usuários/ligas;
- suspensão/reativação de usuário e liga;
- revogação de sessão/realtime;
- motivo obrigatório e audit log append-only;
- testes garantindo que usuários, owners e admins comuns nunca acessam operações globais.

### COULD HAVE

- convites completos para `invite_only`;
- notifications inbox simples;
- shareable public league;
- preferência de idioma persistida localmente;
- filtros avançados apenas com volume real.

### OUT OF SCOPE / P4

- friends/follow/social feed/chat;
- seasons e times permanentes;
- stats Riot inexistentes;
- achievements, moedas, marketplace;
- redesign total ou migração de stack.

## 40. Definition of Done

O frontend pode ser considerado pronto para primeira utilização real quando:

1. visitante entende liga → lobby → votação → classificação na landing;
2. login, cadastro, confirmação e recuperação têm estados claros;
3. senha fraca é recusada pelo provedor e antecipada pela UI;
4. primeiro acesso oferece criar ou descobrir liga e completar identidade;
5. dashboard apresenta ao menos uma próxima ação real;
6. discover pagina resultados e distingue open/request/invite/full/pending;
7. request pode ser enviada, acompanhada e cancelada;
8. admin pode aprovar/rejeitar, alterar papel e excluir com feedback/confirm;
9. membro consegue sair da liga;
10. lobby explica fase, impedimentos e reconexão;
11. participante consegue votar, alterar voto e entender maioria;
12. partida finalizada leva a detalhe, histórico e standings atualizados;
13. perfil próprio renderiza imagens/fallbacks e permite remover valores;
14. perfil público não expõe email ou dados privados;
15. busca de jogador é paginada, limitada e navegável;
16. todas as telas usam um idioma por vez e formatadores consistentes;
17. light/dark/system funcionam sem flash e com contraste revisado;
18. fluxos principais funcionam em 320/375/768/1024/1440 px;
19. formulários, menus, dialogs, tabs e voting funcionam por teclado;
20. loading, vazio, offline, 403, 404, 409 e 500 têm resposta útil;
21. CI cobre login/register, join/request/cancel, profile, lobby/vote, routing e tema;
22. build continua abaixo do budget e não perde páginas de listas.

Para lançamento público, acrescentar aos critérios: superadmin autenticado consegue moderar usuário/liga sem SQL direto; cada ação é autorizada no backend, confirmada, reversível quando aplicável e registrada; nenhuma rota `/ops` é acessível a usuários comuns, owners ou admins de liga.

## Método, evidência visual e limitações

Foram inspecionados routes, pages, layouts, providers, hooks, services, query keys, CSS/tokens, componentes de domínio, schemas/rotas/repositories relevantes da API, migrations e testes. Landing e autenticação foram executadas em navegador local em 1280×720 e 375×812. Não houve overflow horizontal nessas páginas. O painel institucional do login exibiu heading preto sobre primary; a landing não possui footer e o mock não é identificado.

As telas autenticadas não foram navegadas com uma identidade Supabase real porque criar conta ou usar credenciais externas seria uma alteração fora do escopo read-only. Nelas, as conclusões se baseiam em código renderizável, contratos backend e testes existentes. Antes de implementar o redesign, uma rodada de homologação autenticada com dados representativos deve confirmar layout em 320/768/1024/1440, teclado, dialogs e fluxos multiusuário.

Este documento é o fim da auditoria, não autorização para implementar todos os itens. O backlog deve começar pelos P1 comprovados e preservar a arquitetura atual.
