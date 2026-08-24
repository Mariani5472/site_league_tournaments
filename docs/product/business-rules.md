# Regras de negócio e permissões

Estas regras são restrições do produto, não decisões visuais. O redesign pode mudar a forma de comunicá-las, mas não deve oferecer ações que o servidor recusará.

## Glossário

| Termo | Significado |
| --- | --- |
| Liga | Comunidade que reúne membros, lobbies, partidas e ranking |
| Lobby | Sala temporária para preparar uma partida |
| Partida | Snapshot dos dois times após o início da lobby |
| Owner | Responsável único e de maior hierarquia da liga |
| Admin | Organizador com poderes de gestão abaixo do owner |
| Player | Membro jogador |
| Spec | Membro de menor hierarquia |
| Ready | Confirmação individual de disponibilidade |
| Maioria absoluta | `floor(número de participantes / 2) + 1` |
| Snapshot | Registro imutável dos participantes/times no início da partida |

## Papéis e hierarquia

Hierarquia: `owner > admin > player > spec`.

| Capacidade | Owner | Admin | Player | Spec | Não membro |
| --- | :---: | :---: | :---: | :---: | :---: |
| Ver conteúdo interno | Sim | Sim | Sim | Sim | Não |
| Criar lobby se política = members | Sim | Sim | Sim | Sim | Não |
| Criar lobby se política = admins | Sim | Sim | Não | Não | Não |
| Participar de lobby | Sim | Sim | Sim | Sim | Não |
| Revisar solicitações | Sim | Sim | Não | Não | Não |
| Enviar convite | Sim | Sim | Não | Não | Não |
| Editar configurações | Sim | Sim | Não | Não | Não |
| Resolver votação aberta | Sim | Sim | Não | Não | Não |
| Gerenciar papel inferior | Sim | Sim | Não | Não | Não |
| Transferir ownership | Sim | Não | Não | Não | Não |
| Excluir liga | Sim | Não | Não | Não | Não |

Uma pessoa não gerencia alguém de papel igual ou superior. O owner não pode ser removido nem sair enquanto continuar owner.

## Visibilidade e entrada

Visibilidade e política de entrada são conceitos diferentes:

- `public`: pode aparecer na descoberta e expor sua projeção pública.
- `private`: não aparece na descoberta.
- `open`: entrada direta, sujeita a capacidade.
- `request`: cria solicitação para decisão administrativa.
- `invite_only`: impede autoentrada; exige convite válido.

Regras comuns:

- não é possível entrar duas vezes;
- não é possível ultrapassar o limite da liga;
- aprovação e aceitação de convite ainda verificam a última vaga;
- decisões concorrentes são serializadas no banco;
- convite/solicitação já decidido não pode ser reutilizado.

## Ownership

- Toda liga possui exatamente um owner.
- Promover outro membro a owner transfere a propriedade na mesma transação.
- O owner anterior vira admin.
- `leagues.owner_id` e o papel do membership permanecem sincronizados.
- Exclusão da liga é exclusiva do owner e elimina dados dependentes.

## Lobby

Estados persistidos:

- `waiting`: aceita as ações de preparação;
- `in_game`: partida iniciada e votação disponível;
- `finished`: resultado finalizado;
- `cancelled`: cancelamento lógico; permanece no histórico técnico, mas deixa o fluxo ativo.

Transições válidas: `waiting → in_game → finished` ou `waiting → cancelled`.

### Entrada e composição

- Apenas membro da liga pode participar.
- Uma pessoa ocupa no máximo uma vaga na lobby.
- A última vaga é protegida contra entrada concorrente.
- Enquanto aguarda, participante pode sair e trocar de time.
- Times usam números 1 e 2.
- A criação pela interface aceita capacidade par entre 2 e 10; 10 é o padrão 5x5.
- A lobby precisa estar cheia e equilibrada para começar.

### Ready check

- Ready é individual e reversível enquanto aguarda.
- Todos os participantes precisam estar ready.
- A formação de times em andamento bloqueia ready e troca manual.
- Mudança relevante na composição pode invalidar condições anteriores.

### Formação de times

O protocolo de formação é exclusivo de lobby com 10 jogadores. Modos: `random`, `balanced` e `player_picks`.

- Participantes elegíveis votam uma vez por rodada e podem acompanhar totais.
- O modo vence com 6 votos.
- Random exige maioria para aceitar a distribuição; maioria por reroll cria nova rodada.
- Balanced conclui com distribuição calculada pelo servidor.
- Player picks elege dois capitães com deadline do servidor.
- Empates/encerramento da eleição são resolvidos deterministicamente pelo backend.
- Apenas o capitão do time da vez pode escolher no draft.
- Um jogador já escolhido deixa de estar disponível.
- O servidor é a autoridade sobre prazo, turno e conclusão.

### Início

`canStart` só é verdadeiro com lobby cheia, times equilibrados, todos ready, formação concluída quando for 5x5 e status waiting. O início cria a partida e o snapshot dos jogadores na mesma transação. Repetir o comando não deve criar uma segunda partida. O início automático atual só se aplica a lobbies de 10 jogadores; as menores exigem início administrativo manual.

## Votação e resultado

- Somente participantes do snapshot votam.
- Voto escolhe Time 1 ou Time 2.
- O voto pessoal pode ser alterado até finalizar.
- A identidade por trás de cada voto é privada na interface; totais são públicos aos autorizados.
- Um time vence ao alcançar maioria absoluta dos participantes.
- Sem maioria, a votação não expira por si só.
- Owner/admin pode resolver antes da finalização com time vencedor e justificativa.
- Finalização grava vencedor, tipo (`vote` ou `admin`), data e resultados individuais.
- Uma partida finalizada não aceita novo voto, nova resolução ou correção.

## Classificação

- Considera somente snapshots de partidas finalizadas.
- Não depende de contadores editáveis no perfil.
- Ordenação: vitórias, derrotas, aproveitamento e nickname, conforme regra do backend.
- Exibe jogos, vitórias, derrotas, taxa, forma recente e sequência atual.
- Alterações chegam por invalidação realtime e nova leitura REST.

## Perfil e privacidade

- Perfil próprio contém e-mail; perfil público não contém.
- Avatar e banner aceitam somente URLs HTTP/HTTPS de até 2048 caracteres.
- Conta Riot é opcional e não interfere em liga, lobby, voto ou ranking.
- Busca e perfil público expõem apenas ligas públicas.
- Identificadores técnicos não devem substituir nickname na interface comum.

## Realtime

- REST é a fonte da verdade.
- Socket.IO informa que um recurso mudou; o cliente busca o estado atualizado.
- Acesso a rooms de liga/lobby depende de autenticação e membership.
- Remoção da liga revoga o acesso realtime.
- Se o socket cair, a experiência continua com revalidação ao focar e polling em pontos críticos.
- O estado visual nunca deve assumir sucesso só porque recebeu um evento.

## Autenticação e acesso

- Senha mínima: 10 caracteres.
- Confirmação de e-mail é exigida no ambiente configurado.
- Rotas autenticadas guardam o destino para retorno após login.
- `401` implica sessão ausente/expirada; `403` significa autenticado sem permissão.
- Papel operacional é global e não deriva de owner/admin de liga.

## Limitações que devem ser comunicadas

- O jogo ocorre fora da plataforma.
- Não há importação automática do resultado.
- Não há chat, feed social, temporadas ou times permanentes.
- Não há correção pós-finalização.
- Upload de imagem não existe; avatar/banner são informados por URL.
- Integração Riot pode estar desabilitada no ambiente.
