# Critérios de conclusão do projeto

O projeto estará concluído quando os critérios abaixo forem atendidos e demonstráveis na versão executável da ferramenta.

## Configuração e administração

- [ ] O pesquisador acessa a área administrativa com o código e a senha do grupo.
- [ ] O pesquisador consegue criar, editar, abrir, encerrar e reabrir um estudo.
- [ ] O encerramento impede novas participações e mantém os resultados e a exportação acessíveis.
- [ ] O pesquisador seleciona português ou inglês para o estudo e configura as informações e o consentimento.
- [ ] O pesquisador pode escolher quais campos demográficos predefinidos incluir e configurar campos próprios de texto curto, número ou escolha única; os campos incluídos são obrigatórios.
- [ ] O pesquisador pode cadastrar qualquer chatbot com nome, link e tarefa, usando sugestões editáveis quando forem úteis.
- [ ] O pesquisador define quantos chatbots cada participante avaliará; a atribuição é aleatória, sem repetição dentro da sessão, busca equilíbrio entre participantes e registra a ordem apresentada.

## Participação

- [ ] A pessoa participante acessa o estudo em navegador sem criar conta.
- [ ] O sistema gera um código de sessão que o pesquisador pode entregar ao participante.
- [ ] As informações e o consentimento aparecem antes das respostas; recusar não salva respostas do questionário.
- [ ] Para cada chatbot atribuído, o participante vê a tarefa e o link, pode acessar o chatbot externo e retorna à ferramenta para responder à BUS-11.
- [ ] A BUS-11 apresenta os 11 itens fixos e as opções de 1 = discordo totalmente a 5 = concordo totalmente.
- [ ] O participante consegue retomar uma sessão incompleta usando o mesmo código.

## Resultados e exportação

- [ ] As respostas brutas dos 11 itens são preservadas.
- [ ] Por chatbot, a ferramenta apresenta o número de avaliações completas, médias fatoriais na escala 1–5, escores fatoriais normalizados de 0–100, escore geral e distribuição das respostas por item.
- [ ] O escore normalizado usa `(média - 1) / 4 × 100`; os extremos 1 e 5 produzem 0 e 100, respectivamente.
- [ ] O escore geral é a média simples dos quatro escores fatoriais normalizados.
- [ ] O pesquisador consegue comparar chatbots e visualizar contagens, percentuais e comparações descritivas entre grupos demográficos, sempre com o tamanho de cada grupo.
- [ ] A ferramenta exporta CSV com código do participante, idioma, campos demográficos e próprios, chatbot atribuído, ordem, respostas brutas e escores calculados.

## Requisitos técnicos e demonstração

- [ ] A aplicação usa Next.js, React e PostgreSQL.
- [ ] A aplicação funciona localmente e pode ser acessada de outro dispositivo na mesma rede local.
- [ ] O fluxo de participante e o de pesquisador podem ser demonstrados na mesma máquina, simulando duas pessoas.
- [ ] A interface está disponível em português e inglês; a tradução portuguesa da BUS-11 está identificada como tradução local não validada.
- [ ] O código-fonte está versionado no repositório GitHub do projeto.

