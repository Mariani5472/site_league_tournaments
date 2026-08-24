# Estados, feedback e conteúdo

Uma proposta de UI deve considerar estes estados como parte da tela, não como acabamento posterior.

## Matriz global de estados

| Estado | Resposta esperada |
| --- | --- |
| Carregamento inicial | Skeleton compatível com a estrutura da tela; preservar contexto global |
| Atualização em segundo plano | Indicador discreto sem apagar os dados atuais |
| Coleção vazia | Explicar o motivo provável e oferecer uma próxima ação válida |
| Busca sem resultado | Manter termo e permitir limpar/ajustar |
| Erro recuperável | Mensagem contextual e ação Tentar novamente |
| Erro de mutation | Manter dados/formulário e apresentar toast ou erro inline útil |
| Sem permissão | Explicar que a conta não possui acesso e oferecer retorno seguro |
| Sessão expirada | Não sugerir perda de dados sem evidência; oferecer login novamente |
| Página inexistente | Informar 404 e voltar ao início |
| Paginação | Carregar mais sem remover itens anteriores; erro da próxima página é local |
| Ação pendente | Desabilitar repetição, preservar rótulo contextual e indicar progresso |
| Sucesso | Atualizar a fonte canônica e confirmar de modo proporcional |

## Realtime e concorrência

Estados possíveis da conexão: conectando, conectado, desconectado e falha ao entrar no canal.

- Não bloquear toda a página apenas porque o realtime caiu.
- Avisar que atualizações podem demorar e manter fallback HTTP.
- Após reconectar, refazer leitura canônica.
- Se outra pessoa ocupou a última vaga ou decidiu uma solicitação primeiro, apresentar conflito compreensível e atualizar a tela.
- Contadores, votos, ready e times podem mudar enquanto o usuário observa; mudanças não devem deslocar foco ou apagar uma ação em curso.

## Ações que exigem confirmação

| Ação | Risco | Confirmação recomendada |
| --- | --- | --- |
| Sair de lobby em espera | Baixo | Direta ou confirmação leve se apagar ready/voto de formação |
| Cancelar lobby | Médio, afeta grupo | Dialog com consequência explícita |
| Sair da liga | Médio | Dialog explicando perda de acesso |
| Remover membro | Médio/alto | Nome da pessoa e consequência |
| Transferir ownership | Alto | Novo owner, papel resultante e confirmação forte |
| Resolver resultado por admin | Alto | Time, justificativa obrigatória e resumo antes de enviar |
| Excluir liga | Irreversível | Digitar nome exato e linguagem inequívoca |

## Botões desabilitados

Um botão desabilitado não explica a regra. Sempre que a pessoa puder razoavelmente querer agir, exibir o impedimento próximo ao controle.

Exemplos no lobby:

- faltam N jogadores;
- times ainda estão desequilibrados;
- formação de times ainda não terminou;
- faltam N confirmações ready;
- apenas o capitão do time atual pode escolher;
- votação disponível apenas para participantes da partida.

## Estados por entidade

### Liga

- visibilidade: pública ou privada;
- entrada: aberta, solicitação ou convite;
- capacidade: vagas disponíveis ou cheia;
- relação atual: não membro, owner, admin, player ou spec;
- solicitação/convite: pendente, aceito, rejeitado ou cancelado.

### Lobby

- persistido: aguardando, em partida, finalizado ou cancelado;
- fase percebida: reunindo, formando times, ready check, jogando, votação e finalizada;
- participação: fora ou dentro; ready ou não ready; Time 1 ou Time 2;
- conexão: conectando, conectada, desconectada ou falha de room.

### Partida

- em andamento, finalizada ou cancelada;
- resultado pendente, maioria ou decisão administrativa;
- para participante: sem voto ou voto atual em um time;
- para admin: resolução indisponível, disponível ou enviada.

## Formulários

- Labels persistentes; placeholder não substitui label.
- Erro associado ao campo e anunciado para leitor de tela.
- Valores não devem sumir após falha do servidor.
- Indicar limites antes de a pessoa ultrapassá-los quando relevante.
- Diferenciar dado opcional de obrigatório.
- URLs de imagem devem mostrar preview, fallback e erro de carregamento.
- Senha deve oferecer mostrar/ocultar e explicar mínimo de 10 caracteres.
- Desabilitar envio duplicado durante mutation.

## Conteúdo e terminologia

Termos preferidos na interface em português:

| Conceito técnico | Texto para usuário |
| --- | --- |
| `waiting` | Aguardando |
| `in_game` | Em partida / Votação aberta, conforme contexto |
| `finished` | Finalizada |
| `cancelled` | Cancelada |
| `owner` | Owner ou Responsável, desde que adotado consistentemente |
| `admin` | Admin |
| `player` | Jogador |
| `spec` | Espectador |
| `open` | Entrada aberta |
| `request` | Entrada por solicitação |
| `invite_only` | Somente por convite |
| `random` | Aleatório |
| `balanced` | Balanceado |
| `player_picks` | Escolha por jogadores |

Não misturar status em inglês com frases em português. UUID, membership, repository, room e snapshot não devem aparecer na experiência comum.

## Acessibilidade mínima

- Fluxos completos por teclado, incluindo drawer, dialogs, selects, tabs e votação.
- Foco inicial e retorno de foco em overlays.
- `aria-current` para navegação/abas e `aria-live` para atualizações relevantes.
- Contraste adequado nos dois temas e em todos os tons semânticos.
- Não depender apenas de cor para time, resultado, papel ou status.
- Área de toque suficiente em ações do lobby no mobile.
- Respeitar `prefers-reduced-motion`.
- Tabelas densas devem ganhar alternativa legível em telas estreitas.

## Responsive

Validar ao menos 320, 375, 768, 1024 e 1440 px. Pontos críticos:

- sidebar vira drawer com foco controlado;
- tabs da liga precisam continuar descobríveis quando houver rolagem horizontal;
- times do lobby devem manter comparação entre Time 1 e Time 2;
- ranking e membros não podem depender de scroll horizontal sem indicação;
- ações primária, secundária e destrutiva não devem parecer equivalentes;
- draft e eleição de capitães precisam preservar turno e prazo em tela pequena.

## Checklist para cada wireframe

- Quem pode acessar?
- Qual é a ação principal?
- O que muda por papel?
- Como fica vazio?
- Como carrega e como atualiza em segundo plano?
- Como apresenta erro e retry?
- O que acontece se outra pessoa agir primeiro?
- O que fica bloqueado e por quê?
- Há confirmação ou reversão?
- Como funciona em mobile e teclado?
- Qual é o próximo destino após sucesso?
