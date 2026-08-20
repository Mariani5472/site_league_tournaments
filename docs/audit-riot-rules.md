# Auditoria de conformidade com as diretrizes da Riot Games

**Produto auditado:** FPL_LOL  
**Data da análise:** 20 de agosto de 2026  
**Escopo:** repositório local, integração Riot opcional, experiência apresentada ao jogador e políticas oficiais indicadas abaixo  
**Natureza:** avaliação técnica e de produto; não substitui parecer jurídico nem a auditoria da Riot Games

## 1. Conclusão executiva

**Conclusão: conformidade condicionada; a aplicação ainda não deve ser considerada pronta para publicação como produto do ecossistema Riot.**

A proposta do FPL_LOL é, em princípio, compatível com casos de uso aceitos pela Riot: organizar grupos, ligas, lobbies e partidas que acontecem fora da plataforma. A aplicação não interfere no cliente do jogo, não oferece vantagem durante a partida, não calcula MMR/ELO alternativo, não contém apostas, criptoativos ou blockchain e não funciona como intermediária comercial de dados da API.

Há, porém, três impedimentos para declarar conformidade plena:

1. **O aviso legal obrigatório da Riot não está visível no produto.** A landing page possui rodapé, mas ele contém somente marca, descrição, copyright e GitHub.
2. **Registro, auditoria e tipo de chave não podem ser comprovados pelo código.** Todo produto que atende jogadores deve ser registrado, mesmo quando não usa a API. Se a aplicação for pública, uma chave de desenvolvimento ou pessoal não pode ser usada.
3. **O cliente da API não trata `429` e `Retry-After`.** A documentação manda interromper novas chamadas pelo período informado pela Riot.

Além disso, a aplicação chama de “vinculada” uma conta localizada apenas por Riot ID. Esse procedimento confirma que o Riot ID existe e obtém seu PUUID, mas **não comprova que o usuário autenticado é o dono da conta**. Não foi encontrado uso de Riot Sign On (RSO). Isso não impede o uso atual como metadado informado pelo usuário, mas impede apresentar essa associação como verificada.

Se as competições do FPL_LOL forem apresentadas como **torneios**, e não apenas ligas casuais entre amigos, entram em vigor exigências adicionais: no mínimo 20 participantes, condições de vitória justas e transparentes, ausência de apostas e regras específicas para eventual taxa de entrada. Hoje a aplicação permite ligas a partir de 2 participantes e não força o mínimo de 20; portanto, esse uso seria não conforme sem ajustes ou validação expressa da Riot.

## 2. Fontes oficiais e método

Foram confrontadas as regras vigentes nas seguintes páginas oficiais:

- [General Policies](https://developer.riotgames.com/policies/general), atualizada pela Riot em 11 de março de 2025;
- [Developer Portal](https://developer.riotgames.com/docs/portal), especialmente registro, tipos de chave, respostas HTTP e rate limiting;
- [League of Legends — Developer API Policy e Game Policy](https://developer.riotgames.com/docs/lol#game-policy), incluindo casos de uso, Riot ID, RSO e torneios.

A verificação local cobriu:

- descrição e limites documentados no `README.md`;
- integração em `api/src/modules/riot`;
- rotas, autenticação, banco e migrations relacionadas à Riot;
- perfil e landing page do frontend;
- fluxos de liga, lobby, resultado e classificação;
- buscas por monetização, apostas, criptoativos, termos, privacidade e aviso de afiliação.

Os estados usados nesta auditoria são:

- **Conforme:** há evidência suficiente no repositório;
- **Parcial:** a direção é adequada, mas falta uma salvaguarda;
- **Não conforme:** há conflito observável com uma regra aplicável;
- **Não verificável:** depende de configuração, conta ou decisão externa;
- **Condicional:** somente se aplica a determinado uso ou posicionamento do produto.

## 3. Matriz de conformidade

| Tema | Regra da Riot | Evidência na aplicação | Estado | Ação necessária |
| --- | --- | --- | --- | --- |
| Aviso legal | O boilerplate oficial deve estar prontamente visível aos jogadores | O rodapé de `LandingPage.tsx` não contém o aviso; a busca no produto também não o encontrou | **Não conforme** | Inserir no produto o texto exato indicado pela Riot, substituindo o nome do produto, em local visível e não apenas nesta documentação |
| Registro do produto | Produto que atende jogadores deve ser registrado e manter descrição/metadados atualizados | Não há como provar registro ou estado do produto pelo repositório | **Não verificável / bloqueante** | Registrar FPL_LOL no Developer Portal, enviar o fluxo funcional para revisão e atualizar o cadastro a cada mudança relevante |
| Chave para ambiente público | Chave de desenvolvimento serve a protótipo não público; produto público requer chave de produção | O backend usa a variável `RIOT_API_KEY` | **Condicionalmente não conforme** | Em produção pública, usar uma chave de produção aprovada e renomear a configuração para não induzir uso de chave de desenvolvimento |
| Chave para projeto privado | Chave pessoal só pode atender o desenvolvedor ou pequena comunidade privada, nunca consumo público ou alpha/beta aberto | O tipo real da chave e o público do deploy não são observáveis | **Não verificável** | Documentar a classificação do ambiente e impedir ativação pública com chave pessoal/de desenvolvimento |
| Segurança da chave | Chave fora do código, acesso via HTTPS e uma chave de produção por produto | Chave vem de variável de ambiente, não é enviada ao frontend e a base URL usa HTTPS | **Conforme no código** | Confirmar externamente que não há reutilização entre produtos e que o segredo não aparece em logs ou configuração de cliente |
| Endpoint e identificador | Para Riot ID, a Riot documenta `ACCOUNT-V1 /accounts/by-riot-id/{gameName}/{tagLine}` e recomenda PUUID | O cliente usa exatamente esse endpoint e armazena PUUID | **Conforme** | Manter acompanhamento de versões e deprecações |
| Associação de conta | RSO é o mecanismo que identifica com segurança quem entrou com a conta Riot | A associação aceita um Riot ID digitado; qualquer pessoa pode informar um ID público de terceiro | **Parcial** | Tratar como “Riot ID informado”, manter `verified = false` e não afirmar propriedade; para verificação real, solicitar produção + RSO à Riot |
| Rate limiting da Riot | Ao receber `429`, cessar chamadas pelo período de `Retry-After` | `riot.client.ts` faz chamada Axios direta, sem interceptador, cooldown ou tratamento de `Retry-After` | **Não conforme quando a integração está ativa** | Implementar tratamento por status, cooldown compartilhado por chave/região e resposta controlada ao usuário |
| Falhas da API | Fluxo deve falhar com base no status HTTP; corpo de erro não é contrato estável | Não há parsing dependente do corpo, o que é positivo; também não há tradução explícita de `401`, `403`, `404`, `429` e `5xx` | **Parcial** | Mapear por status, sem depender da estrutura do corpo, e distinguir conta inexistente, credencial inválida, limite e indisponibilidade |
| Minimização/exposição | O produto não deve ser data broker nem expor informações ocultas | Apenas Riot ID/PUUID do vínculo é consultado; rota exige autenticação; perfil público não expõe PUUID; desvinculação remove a linha | **Conforme no escopo atual** | Evitar `SELECT *` e não adicionar histórico de partidas públicas sem consentimento e análise específica |
| Histórico de partidas customizadas | Histórico de custom game não pode ser público sem opt-in específico; sem isso, somente ao próprio jogador via RSO | Campos antigos de sincronização Riot e Tournament API foram removidos; os resultados atuais pertencem ao fluxo interno por votação | **Não aplicável no estado atual** | Reabrir auditoria antes de importar ou publicar histórico oficial de partidas customizadas |
| Integridade competitiva | Não fornecer informação oculta, vantagem injusta ou automatizar decisões do jogo | O produto organiza partidas; não usa live data, overlay, cooldowns, builds ou análise durante jogo | **Conforme** | Preservar essa separação em futuras funcionalidades |
| Ranking | Não criar alternativa ao ranking oficial, incluindo MMR/ELO | A classificação é interna à liga e deriva de vitórias/derrotas registradas na própria plataforma | **Conforme, com ressalva de comunicação** | Deixar claro que a tabela mede somente a competição interna e nunca chamar o valor de MMR, ELO ou rank Riot |
| Deanonimização | Não identificar jogadores deliberadamente ocultos | O vínculo parte de Riot ID visível e informado pelo próprio usuário; não há busca de jogadores ocultos | **Conforme no escopo atual** | Não criar correlação de IDs ocultos ou ferramentas de descoberta invasiva |
| Propriedade intelectual | Não criar jogo com IP Riot nem imitar produto/jogo em estilo ou função; ativos devem vir de fontes autorizadas | É uma aplicação web organizadora, com identidade própria; não foi encontrada cópia do cliente nem uso necessário de logos oficiais | **Conforme no escopo inspecionado** | Manter inventário da origem de futuros assets; usar apenas Press Kit/Data Dragon quando aplicável e não sugerir produto oficial |
| Data broker | Não intermediar os dados da API para outra empresa | O dado consultado é usado apenas para metadado opcional do perfil | **Conforme** | Não vender, redistribuir ou oferecer API de dados Riot a terceiros |
| Cripto e blockchain | Proibidos em produtos do ecossistema | Nenhuma funcionalidade encontrada | **Conforme** | Não adicionar token, NFT ou integração blockchain |
| Apostas e jogos de azar | Proibidos | Nenhuma funcionalidade encontrada | **Conforme** | Não adicionar apostas, odds, pools ou premiação baseada em azar |
| Monetização | Exige cadastro Approved/Acknowledged, camada gratuita e valor transformativo | Não foi encontrado fluxo de cobrança, assinatura, doação ou publicidade | **Não aplicável no estado atual** | Fazer nova auditoria e consultar a Riot antes de monetizar |
| Torneios | Mínimo de 20 participantes, condições justas/transparentes e sem apostas | A aplicação permite liga com 2 a 500 membros e lobbies de 2 a 10; resultado é resolvido pelo fluxo interno de votação | **Condicional** | Se ofertado como torneio, impedir início com menos de 20 participantes, publicar regras/critério de resultado e validar o formato no Portal |
| Taxa de entrada | Pelo menos 70% das taxas devem ir ao prêmio e monetização deve obedecer às regras gerais | Não há taxa de entrada ou premiação financeira | **Não aplicável** | Se adicionada, garantir o mínimo de 70%, camada gratuita quando aplicável e aprovação/acknowledgement prévio |
| Mudanças futuras | Novos recursos e alterações devem ser auditados na página do produto | Não existe processo verificável no repositório | **Não verificável** | Adicionar etapa de compliance ao release checklist e atualizar o cadastro da Riot antes de ativar mudanças materiais |

## 4. Achados prioritários

### RR-01 — Aviso legal obrigatório ausente

**Severidade:** bloqueante para publicação  
**Estado:** não conforme

A Riot exige que o aviso de não endosso e de titularidade das marcas fique prontamente visível aos jogadores. O rodapé público é o local natural, mas atualmente não contém esse texto. Uma menção apenas no README, nos Termos ou neste audit não atende ao requisito de visibilidade no produto.

**Critério de encerramento:** o texto exato fornecido na seção Developer API Policy da Riot aparece no produto com `FPL_LOL` no lugar do marcador de nome, é legível em desktop/mobile e também é acessível a usuários autenticados sem depender de uma página inexistente.

### RR-02 — Registro e auditoria externa não comprovados

**Severidade:** bloqueante para publicação  
**Estado:** não verificável

A política específica de League of Legends determina registro para qualquer produto que atenda jogadores, mesmo sem uso da API. A política geral também exige auditoria e comunicação de novas funcionalidades. Código-fonte não demonstra que esse processo ocorreu.

**Critério de encerramento:** registrar o produto, informar domínio, público, regiões, fluxo de conta, vínculo opcional de Riot ID, ligas, lobbies, votação, classificação e ausência de integração com o cliente; guardar internamente a evidência do status e manter a descrição atualizada.

### RR-03 — Configuração sugere chave de desenvolvimento em runtime

**Severidade:** bloqueante se o ambiente for público  
**Estado:** condicionalmente não conforme

`riot.config.ts` lê exclusivamente `RIOT_API_KEY`. Uma development key expira em 24 horas e não pode sustentar produto público. Uma personal key também não pode ser usada em consumo público, incluindo alpha ou beta abertos.

O repositório não contém a chave e o `.gitignore` ignora `.env`, o que é correto. O problema não é armazená-la em env; é assegurar que **o tipo de credencial corresponda ao ambiente**.

**Critério de encerramento:** produção pública utiliza chave de produção própria e aprovada; deploy falha de forma segura quando a integração é ativada com configuração inadequada; documentação distingue desenvolvimento, comunidade privada e produção pública.

### RR-04 — Ausência de tratamento de `429`/`Retry-After`

**Severidade:** alta  
**Estado:** não conforme quando a integração está habilitada

O cliente não implementa espera ou bloqueio após rate limit. O rate limiter HTTP interno do FPL_LOL protege a própria API, mas não substitui o controle exigido para chamadas à Riot.

**Critério de encerramento:** uma resposta `429` cria cooldown pelo número de segundos de `Retry-After`, evita novas chamadas para o mesmo escopo durante esse período e retorna erro estável ao frontend. Testes devem cobrir `429` com e sem header, além de `401`, `403`, `404` e `5xx`.

### RR-05 — “Conta vinculada” não significa propriedade verificada

**Severidade:** média  
**Estado:** parcial

O endpoint usado é adequado para converter Riot ID em PUUID, mas a informação é pública. Sem autenticação Riot, o sistema só verifica a existência do identificador, não a posse. A coluna `verified` nasce como `false`, porém não faz parte da linguagem apresentada ao usuário.

**Critério de encerramento:** enquanto não houver RSO, a interface explica que o Riot ID foi informado e não verificado. Qualquer selo, permissão, prêmio ou dado privado dependente de propriedade deve usar RSO aprovado pela Riot.

### RR-06 — Classificação de liga casual versus torneio

**Severidade:** alta se o produto promover torneios  
**Estado:** condicional

O caso de uso atual pode ser descrito honestamente como organização de ligas e partidas entre amigos. Se o produto anunciar ou operar torneios, as regras específicas passam a ser relevantes. O limite de 2 membros permite criar uma competição abaixo do mínimo Riot de 20 participantes, e a votação de resultado precisa ser acompanhada por regras públicas de disputa e resolução de conflito.

**Critério de encerramento:** escolher e registrar o posicionamento no Developer Portal. Para torneios, impor os requisitos aplicáveis no nível da competição, não confundir o lobby 5x5 com o total do torneio e publicar regulamento, elegibilidade, formato, vitória, disputa e premiação.

## 5. Evidências positivas

- A integração Riot é opcional; liga, lobby, partida, voto e classificação funcionam sem conta ou credencial Riot.
- A chamada oficial ocorre no backend e a chave não é enviada ao navegador.
- A comunicação com a API usa HTTPS e o header `X-Riot-Token`.
- A entrada usa Riot ID (`gameName` + `tagLine`) e o endpoint recomendado de `ACCOUNT-V1`.
- Há unicidade de PUUID e de usuário no banco, reduzindo vínculos duplicados.
- Somente usuário autenticado pode consultar, criar ou remover seu vínculo; apenas o estado geral de habilitação é público.
- O usuário pode desvincular a conta, removendo o registro local.
- PUUID não aparece no perfil público inspecionado.
- A plataforma não depende de dados de partida Riot e removeu campos legados de Tournament API, match IDs e estatísticas Riot.
- Não foram encontrados overlay, live client data, tracking de inimigos, recomendação imperativa ou cálculo alternativo de habilidade.
- Não foram encontrados apostas, criptoativos, blockchain ou cobrança.
- A identidade visual do produto é própria e a aplicação não reproduz a interface ou a função do cliente de League of Legends.

## 6. Plano mínimo antes de publicação

### Bloqueadores

1. Exibir o boilerplate legal exato da Riot em local prontamente visível.
2. Registrar o FPL_LOL no Developer Portal e submeter o fluxo atual para auditoria.
3. Obter e usar a categoria correta de chave para o público-alvo; produção pública requer production key.
4. Implementar tratamento de `429` e `Retry-After` antes de habilitar vínculo Riot em ambiente público.
5. Declarar no cadastro se o produto organiza somente ligas casuais ou também torneios; aplicar as regras de torneio quando for o caso.

### Recomendados

6. Trocar a linguagem de “conta vinculada” por uma descrição que não implique verificação de propriedade, ou implementar RSO após aprovação.
7. Documentar privacidade, finalidade, retenção e exclusão de Riot ID/PUUID antes de coletar esses dados em produção.
8. Remover PUUID do DTO enviado ao frontend quando ele não for necessário para a experiência.
9. Criar inventário de assets Riot e registrar origem Press Kit/Data Dragon, caso sejam adicionados no futuro.
10. Adicionar checklist de release para registro de mudanças, política Riot, monetização, torneios, novos dados e APIs depreciadas.

## 7. Decisão de lançamento

| Cenário | Decisão |
| --- | --- |
| Desenvolvimento local, integração Riot desabilitada | **Aceitável para desenvolvimento** |
| Protótipo privado com development key válida | **Aceitável temporariamente**, desde que não seja disponibilizado ao público |
| Pequena comunidade estritamente privada com personal key registrada | **Depende da aprovação/classificação da Riot** |
| Site público com `RIOT_API_KEY` ou personal key | **Não lançar** |
| Site público sem aviso legal visível | **Não lançar** |
| Site público registrado, production key, aviso legal e rate limit corrigidos | **Tecnicamente elegível**, sujeito à decisão final da Riot |
| Torneios com menos de 20 participantes | **Não lançar como torneio Riot** |

## 8. Limites desta conclusão

Esta auditoria não consegue verificar:

- cadastro, mensagens, aprovação ou acknowledgement no Developer Portal;
- tipo e titularidade da chave configurada fora do repositório;
- domínio e conteúdo efetivamente publicados;
- contratos, política de privacidade, termos comerciais ou tratamento operacional de solicitações de titulares;
- assets e campanhas de marketing que não estejam neste workspace;
- legislação local ou regulamentos regionais de competição.

Consequentemente, “conforme no código” não significa aprovação pela Riot. A decisão final pertence à Riot Games por meio do Developer Portal, e as políticas devem ser revistas continuamente porque podem mudar.

