# BUS-11 — ferramenta de avaliação de chatbots

Ferramenta acadêmica para organizar estudos que avaliam a experiência de uso de chatbots com a escala BUS-11. O projeto foi definido para funcionar localmente, com acesso pela rede local quando pesquisador e participante estiverem em dispositivos diferentes.

Projeto de desenvolvimento da disciplina de Interação Humano-Computador, realizado em grupo de três pessoas.

> **Estado:** documentação inicial. 

## Objetivo

Reunir em uma única ferramenta a configuração do estudo, a interação orientada com chatbots externos, a coleta da BUS-11, o cálculo dos escores, a consulta dos resultados e a exportação dos dados.

A ferramenta não implementa os chatbots avaliados. O pesquisador cadastra cada chatbot por nome e link e define uma tarefa para o participante realizar antes de responder à escala.

## Escopo previsto

- Criar, abrir, encerrar e reabrir estudos.
- Configurar um idioma por estudo: português ou inglês.
- Cadastrar qualquer chatbot por nome, link e tarefa; sugestões de tarefas poderão ajudar o pesquisador.
- Definir quantos chatbots cada participante avaliará. A seleção será aleatória, sem repetição na mesma sessão, buscando equilibrar as atribuições e registrando a seleção e a ordem.
- Dar acesso ao pesquisador por código e senha compartilhada do grupo. Participantes não criam contas: recebem um código de sessão que permite retomar a participação.
- Apresentar informações do estudo e consentimento antes da coleta. A recusa encerra a participação sem guardar respostas do questionário.
- Permitir que o pesquisador escolha campos demográficos predefinidos e crie campos próprios. Todo campo incluído no estudo será obrigatório para o participante.
- Guardar as respostas brutas da BUS-11 e apresentar médias na escala de 1 a 5 e escores normalizados de 0 a 100.
- Mostrar resultados por chatbot, distribuições dos itens e análises demográficas descritivas, incluindo comparações exploratórias entre grupos.
- Exportar os dados coletados em CSV.

## Tecnologias obrigatórias

- Next.js
- React
- PostgreSQL
- Código versionado no GitHub

A primeira versão não exige hospedagem pública. A demonstração pode ser feita no mesmo computador; a coleta prevista entre dispositivos usa a rede local.

## Documentação

- [Requisitos](docs/requisitos.md)
- [Decisões e base metodológica](docs/decisoes.md)
- [Critérios de conclusão](docs/criterios-de-conclusao.md)

## Apoio de inteligência artificial

Inteligência artificial foi usada como apoio para organizar o escopo e redigir esta documentação inicial. O conteúdo foi revisado e aprovado.
