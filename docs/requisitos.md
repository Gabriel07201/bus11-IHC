# Requisitos do projeto

**Estado:** escopo inicial aprovado.

## Objetivo

Desenvolver uma ferramenta acadêmica, simples de operar, para gerenciar estudos com BUS-11: configurar chatbots e tarefas, orientar a participação, coletar respostas, calcular e visualizar escores e exportar os dados.

## Requisitos funcionais

### Estudos e acesso

- **RF-01 — Gerenciar estudos:** o pesquisador pode criar e editar um estudo e controlar os estados rascunho, coleta aberta e encerrado. Encerrar bloqueia novas participações, mantendo resultados e exportação disponíveis. O pesquisador pode reabrir a coleta.
- **RF-02 — Acesso do grupo:** a área do pesquisador usa um código e uma senha compartilhada pelo grupo. Não há contas individuais nesta versão.
- **RF-03 — Idioma:** o pesquisador escolhe um idioma por estudo, português ou inglês. Um mesmo estudo não oferece os dois idiomas simultaneamente.
- **RF-04 — Informações e consentimento:** antes de responder, o participante vê as informações e o consentimento do estudo. Se recusar, a participação termina sem salvar respostas do questionário.

### Configuração da coleta

- **RF-05 — Dados do participante:** o pesquisador pode incluir os campos predefinidos idade, sexo e nacionalidade, além de criar campos próprios de texto curto, número ou escolha única. Campos que não forem incluídos não aparecem; todo campo incluído é obrigatório.
- **RF-06 — Chatbots e tarefas:** o pesquisador pode cadastrar qualquer chatbot com nome e link e precisa definir uma tarefa para cada chatbot. A ferramenta oferece sugestões editáveis de tarefas.
- **RF-07 — Quantidade e seleção:** o pesquisador define quantos chatbots cada participante avaliará. A seleção é aleatória e sem repetição dentro da sessão, procura equilibrar as atribuições no estudo e randomiza a ordem. O sistema registra quais chatbots foram atribuídos e em que ordem.
- **RF-08 — Código do participante:** o sistema gera um código único de sessão, entregue pelo pesquisador ao participante. O código permite retomar a mesma sessão e não exige nome ou e-mail.
- **RF-09 — Avaliação externa:** para cada chatbot atribuído, a ferramenta apresenta a tarefa e o link externo. Após interagir com o chatbot, o participante retorna ao estudo e responde à BUS-11.
- **RF-10 — Retomada:** uma sessão interrompida pode ser retomada com o mesmo código. Não haverá fluxo especial para justificar falhas de acesso, pular chatbots ou registrar motivos de interrupção nesta primeira versão.

### Instrumento, resultados e exportação

- **RF-11 — Aplicar a BUS-11:** a ferramenta apresenta os 11 itens fixos da BUS-11, sem edição pelo pesquisador, com escala de 1 a 5: 1 = discordo totalmente; 5 = concordo totalmente.
- **RF-12 — Guardar respostas brutas:** as respostas individuais aos 11 itens são preservadas para análise e exportação.
- **RF-13 — Calcular escores:** calcular a média de cada fator na escala original de 1 a 5 e sua conversão normalizada para 0 a 100. O escore geral é a média simples dos quatro escores fatoriais normalizados.
- **RF-14 — Mostrar resultados por chatbot:** apresentar número de avaliações completas, médias por fator, escore geral normalizado, distribuição das respostas por item e comparação entre chatbots do estudo.
- **RF-15 — Análises demográficas:** apresentar contagens e percentuais dos campos coletados e comparações descritivas dos escores entre grupos demográficos. Exibir o número de participantes de cada grupo; essas comparações não são testes de significância.
- **RF-16 — Exportar dados:** permitir exportação em CSV com código do participante, idioma, dados demográficos e campos próprios, chatbot atribuído, ordem de avaliação, respostas brutas dos itens e escores calculados.

## Requisitos não funcionais

- **RNF-01 — Tecnologias:** usar Next.js, React e PostgreSQL; manter o código no GitHub.
- **RNF-02 — Operação local:** permitir execução local e acesso pela rede local para uso em dispositivos diferentes. Hospedagem pública é opcional e não faz parte do requisito inicial.
- **RNF-03 — Simplicidade:** manter fluxos distintos e diretos para pesquisador e participante; a participação não exige criação de conta.
- **RNF-04 — Idiomas:** oferecer interface e conteúdo do estudo em português e inglês. A versão em português da BUS-11 será identificada como tradução local do grupo, sem alegação de validação.
- **RNF-05 — Minimização de dados:** não solicitar nome ou e-mail por padrão. Os campos adicionais são definidos pelo pesquisador e ficam sujeitos às informações apresentadas no consentimento.

## Fora do escopo inicial

- Implementar ou hospedar os chatbots avaliados.
- Exigir hospedagem pública ou implantação na Cloudflare.
- Criar contas individuais para participantes ou pesquisadores.
- Oferecer fluxos especiais para chatbot indisponível, justificativa ou avaliação pulada.
- Alterar os itens da BUS-11 ou oferecer mais de um idioma dentro do mesmo estudo.
- Aplicar as classificações de referência do artigo de 2024 ao escore normalizado do projeto.

