# Decisões e base metodológica

**Estado:** decisões aprovadas.

## Produto e operação

| Tema | Decisão inicial |
|---|---|
| Finalidade | Gerenciar estudos de avaliação de chatbots com BUS-11, da configuração à exportação. |
| Implantação | Priorizar execução local e acesso pela rede local. Hospedagem pública pode ser considerada depois. |
| Pesquisadores | Acesso administrativo por código e senha compartilhada do grupo; sem contas individuais nesta versão. |
| Participantes | Sem conta. O sistema gera um código de sessão que o pesquisador entrega ao participante; o mesmo código permite retomar a sessão. |
| Dados de identificação | Nome e e-mail não são solicitados por padrão. Campos demográficos predefinidos podem ser omitidos pelo pesquisador; qualquer campo habilitado é obrigatório para o participante. |
| Idioma | O pesquisador escolhe português ou inglês para cada estudo. O participante não troca o idioma dentro do estudo. |
| Chatbots | Qualquer chatbot pode ser cadastrado por nome e link. A ferramenta não restringe o domínio do chatbot nem apresenta aviso de CRM. |
| Tarefas | Cada chatbot precisa ter uma tarefa definida; a ferramenta oferece sugestões editáveis. |
| Atribuição | O pesquisador escolhe a quantidade de chatbots por participante. A seleção é aleatória, sem repetição por sessão, busca equilíbrio entre atribuições e randomiza a ordem. |
| Consentimento | Informações e consentimento aparecem antes da coleta. Recusar encerra a participação sem guardar respostas do questionário. |
| Ciclo do estudo | Rascunho, coleta aberta e encerrado. Encerrar impede novas participações, mas mantém leitura e exportação; o pesquisador pode reabrir. |
| Falhas durante a sessão | Tratamento específico de indisponibilidade, motivo de interrupção e opção de pular chatbot fica fora do primeiro escopo. A retomada simples pelo código permanece. |
| Cadastro do grupo | A equipe cria um grupo na tela de acesso do pesquisador, definindo um código único e uma senha compartilhada. Não há recuperação de senha nesta versão. |
| PostgreSQL | O servidor, banco e usuário são configurados pelo ambiente antes do uso. A aplicação conecta diretamente ao PostgreSQL e aplica suas migrações na inicialização; Docker não é requisito. |
| Chave interna | A aplicação gera e persiste automaticamente a chave fora do repositório. A equipe deve preservá-la junto com o backup do banco; não substituir automaticamente uma chave ausente quando já existem dados de participantes. |

## Instrumento e pontuação

- Aplicar os 11 itens da BUS-11 sem permitir que o pesquisador edite o instrumento.
- Usar a orientação **1 = discordo totalmente** e **5 = concordo totalmente**, preservando também a resposta bruta de cada item.
- Adotar como resumo principal a estrutura de quatro fatores recomendada no reexame de 2024: acessibilidade (2 itens), conversa interativa funcional (7), privacidade (1) e responsividade (1).
- Mostrar médias fatoriais na escala original de 1 a 5 e escores normalizados de 0 a 100. Para uma média `m`, a conversão é `(m - 1) / 4 × 100`; assim, 1 corresponde a 0, 3 a 50 e 5 a 100.
- Calcular o escore geral como a média simples dos quatro escores fatoriais normalizados, mantendo pesos iguais entre fatores.
- Não aplicar as classificações de referência do artigo de 2024 ao escore normalizado do projeto.

### Nota sobre a fórmula publicada

O artigo de 2024 descreve dividir a média do fator por 5 e multiplicar por 100, mas também afirma que o resultado cobre 0 a 100. Com respostas de 1 a 5, essa operação cobre 20 a 100. A conversão adotada aqui é uma normalização linear que leva os extremos observados da escala a 0 e 100; ela deve ser identificada como convenção do projeto, não como reprodução literal da fórmula publicada. As classificações de referência do artigo foram construídas a partir dos 44 chatbots avaliados naquele estudo e não serão aplicadas a esta conversão.

### Nota sobre a direção dos itens

O artigo BUS-11 de 2022 contém uma legenda de tabela que inverte os extremos da escala em relação à descrição da escala BUS-15 no próprio artigo e à descrição da escala no artigo de 2024. O projeto adota 1 = discordo totalmente e 5 = concordo totalmente, conforme a descrição do artigo de 2024 e a orientação da versão original BUS-15. A divergência bibliográfica fica registrada para revisão metodológica.

### Idioma português

A interface e os estudos podem ser apresentados em português e inglês. O texto em português da BUS-11 usado na ferramenta será uma tradução local do grupo e não será apresentado como versão validada.

## Transparência sobre uso de IA

IA generativa apoiou a organização do escopo, a implementação inicial da ferramenta e a redação da documentação. O material foi revisado pelo proponente; a equipe deve validar o código e as decisões metodológicas antes de tratá-los como consenso coletivo.

## Fontes consultadas

1. Borsci et al. (2021). [The Chatbot Usability Scale: the Design and Pilot of a Usability Scale for Interaction with AI-Based Conversational Agents](https://link.springer.com/article/10.1007/s00779-021-01582-9).
2. Borsci et al. (2022, publicado em 2023). [A confirmatory factorial analysis of the Chatbot Usability Scale: a multilanguage validation](https://link.springer.com/article/10.1007/s00779-022-01690-0).
3. Borsci e Schmettow (2024). [Re-examining the chatBot Usability Scale (BUS-11) to assess user experience with customer relationship management chatbots](https://link.springer.com/article/10.1007/s00779-024-01834-4).
