# BUS-11 — ferramenta de avaliação de chatbots

Ferramenta acadêmica para organizar estudos que avaliam a experiência de uso de chatbots com a escala BUS-11. O projeto foi definido para funcionar localmente, com acesso pela rede local quando pesquisador e participante estiverem em dispositivos diferentes.

Projeto de desenvolvimento da disciplina de Interação Humano-Computador, realizado em grupo de três pessoas.

> **Estado:** primeira versão executável em desenvolvimento.

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

## Execução local

Requisitos: Node.js compatível com Next.js 16, pnpm e um servidor PostgreSQL acessível. O banco e o usuário precisam existir antes de iniciar a aplicação; o projeto não inicia o serviço PostgreSQL nem cria o banco.

No PowerShell, na pasta do projeto:

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Configure a URL do PostgreSQL em `.env.local`:

```powershell
DATABASE_URL=postgresql://bus11_app:sua-senha@127.0.0.1:5432/bus11
```

O administrador do PostgreSQL deve criar o usuário e o banco antes do primeiro início. Exemplo executado no `psql` por alguém com permissão administrativa:

```sql
CREATE ROLE bus11_app LOGIN PASSWORD 'substitua-esta-senha';
CREATE DATABASE bus11 OWNER bus11_app;
```

Ao iniciar, a aplicação aplica automaticamente as migrações no banco informado. Depois, execute `pnpm dev` e abra `http://localhost:3000/pt-BR`. O pesquisador cria um grupo na tela de acesso, escolhendo o código e a senha compartilhada. Não há recuperação de senha; guarde essas credenciais com o grupo.

A chave interna usada para assinar sessões e proteger códigos de participação é gerada automaticamente. No Windows ela fica em `%LOCALAPPDATA%\bus11-ihc\app-secret`; em outros sistemas, em `$XDG_CONFIG_HOME/bus11-ihc/app-secret` ou `~/.config/bus11-ihc/app-secret`. Faça cópia de segurança dessa chave junto com o banco. Se a chave não existir e já houver dados de participantes, a aplicação interrompe a inicialização em vez de gerar outra e invalidar os códigos. Uma instalação antiga que ainda tenha um `APP_SECRET` válido o copia para esse arquivo na primeira inicialização.

Para acesso de outro dispositivo na mesma rede, use `pnpm dev:lan` e abra `http://<IP-do-computador>:3000` nele. A configuração de PostgreSQL e a chave permanecem no computador que executa a aplicação.

Os arquivos `.env.local` e demais `.env*` são ignorados pelo Git. Não versione credenciais nem use os valores de exemplo como senha real.

Verificações disponíveis: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` e `pnpm build`.

## Documentação

- [Requisitos](docs/requisitos.md)
- [Decisões e base metodológica](docs/decisoes.md)
- [Critérios de conclusão](docs/criterios-de-conclusao.md)

## Apoio de inteligência artificial

Inteligência artificial foi usada como apoio no planejamento, na implementação inicial e na redação desta documentação. O grupo deve revisar e validar o código, o protocolo e o conteúdo metodológico.
