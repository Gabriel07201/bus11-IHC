# Guia de uso e teste — BUS-11

Este guia ajuda o grupo a executar a ferramenta localmente, demonstrar o fluxo na mesma máquina e verificar os resultados com dados sintéticos. Não use respostas de participantes reais para testar a instalação.

## 1. Preparar a aplicação local

Pré-requisitos: Node.js compatível com Next.js 16, pnpm e um servidor PostgreSQL em execução. O administrador do ambiente deve criar o banco e o usuário com permissão para criar tabelas. A aplicação não inicia o serviço nem cria o banco.

No PowerShell, na pasta do projeto:

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Abra `.env.local` e informe a URL de conexão do PostgreSQL, por exemplo `postgresql://bus11_app:sua-senha@127.0.0.1:5432/bus11`.

Na primeira inicialização, a aplicação aplica automaticamente as migrações. Ela também gera a chave criptográfica local; não é necessário informar esse segredo manualmente. No Windows, a chave fica em `%LOCALAPPDATA%\bus11-ihc\app-secret`; em outros sistemas, em `$XDG_CONFIG_HOME/bus11-ihc/app-secret` ou `~/.config/bus11-ihc/app-secret`. Inclua a chave nas cópias de segurança do banco. Se ela estiver ausente enquanto há dados de participantes, restaure uma cópia conhecida antes de iniciar; o sistema não cria uma chave substituta.

Uma instalação antiga que ainda tenha um `APP_SECRET` válido em `.env.local` o copia para o arquivo local na primeira inicialização para preservar códigos e sessões existentes. Depois de confirmar a cópia de segurança, essa variável pode ser removida.

Inicie o Next.js:

```powershell
pnpm dev
```

Abra `http://localhost:3000/pt-BR/researcher`, crie um grupo com código e senha e entre na área de pesquisa. Não há recuperação de senha nesta versão; mantenha as credenciais disponíveis para o grupo. Para encerrar, use `Ctrl+C`. O serviço e os dados PostgreSQL são administrados separadamente da aplicação.

## 2. Simular pesquisador e participante na mesma máquina

1. Na área do pesquisador, crie um estudo com um título que identifique claramente a demonstração sintética.
2. Escolha português ou inglês para o estudo, informe o texto de consentimento e inclua somente os dados demográficos que serão testados. Todo campo incluído é obrigatório para o participante.
3. Cadastre um chatbot com nome, link acessível e uma tarefa clara. Para testar comparação, cadastre dois chatbots e escolha quantos cada participante avaliará.
4. Salve o estudo, abra a coleta e gere códigos. Copie cada código antes de sair da tela; ele é apresentado ao pesquisador para entrega ao participante.
5. Abra uma janela anônima/privada no mesmo navegador em `http://localhost:3000/pt-BR/participant` e informe um dos códigos. A pessoa participante não cria conta.
6. Aceite o consentimento, preencha os campos demográficos solicitados, abra o link do chatbot, realize a tarefa e volte à ferramenta para responder aos 11 itens. Feche a janela durante uma participação e volte com o mesmo código para verificar a retomada.
7. Repita com os outros códigos. Acompanhe resultados na área do pesquisador e exporte o CSV.

Para testar a recusa, use outro código sintético e selecione “Não desejo participar”. A tela deve encerrar a participação sem registrar respostas BUS-11.

## 3. Verificar os escores com respostas sintéticas

Para um teste fácil de conferir, crie um estudo com um chatbot e gere três códigos. Complete uma avaliação por código, marcando o mesmo valor nos 11 itens:

| Resposta em todos os itens | Média de cada fator (1–5) | Escore de cada fator (0–100) | Escore geral (0–100) |
|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 |
| 3 | 3 | 50 | 50 |
| 5 | 5 | 100 | 100 |

O cálculo aplicado é `(média - 1) / 4 × 100`; o escore geral é a média simples dos quatro escores normalizados. Os resultados incluem somente avaliações completas.

## 4. Roteiro de aceite manual

Use exclusivamente estudos, códigos e respostas sintéticas.

| Cenário | Ação | Resultado esperado |
|---|---|---|
| Acesso do pesquisador | Alternar entre login e cadastro no mesmo painel; criar dois grupos e tentar abrir pelo segundo a URL do estudo do primeiro. | Cada grupo entra com seu próprio código/senha; o estudo do outro grupo não é encontrado nem exposto. |
| Configuração do estudo | Criar estudo em cada idioma; configurar consentimento, demografia, chatbot, link e tarefa. | O estudo apresenta o idioma escolhido; nenhum campo demográfico desativado é perguntado e todo campo ativado é obrigatório. |
| Formulário do pesquisador | Tentar avançar com título ou link inválido e corrigir o campo. | A mensagem localizada aparece junto ao campo; ao corrigir, o erro correspondente desaparece. |
| Etapas do estudo | Na etapa Amostragem, voltar para Chatbots e tarefas, editar uma tarefa e avançar novamente. | A etapa Amostragem continua aberta; apenas o botão final salva o estudo. |
| Campos demográficos | Ativar idade, sexo, nacionalidade e uma pergunta personalizada; editar faixas e alternativas. | As caixas ficam junto aos rótulos; sexo oferece Masculino/Feminino; opções e faixas selecionadas são obrigatórias para o participante. |
| Consentimento | Recusar com um código de demonstração. | A participação termina e nenhuma avaliação BUS-11 é salva. |
| Participação | Aceitar, responder dados obrigatórios, abrir o chatbot, voltar e responder os 11 itens. | A sessão avança e pode ser retomada com o mesmo código; cada afirmação exige uma resposta de 1 a 5. |
| Conclusão da tarefa | Usar Tab e Espaço para ativar e recolher “Concluí a tarefa no chatbot”. | O questionário abre e fecha, o estado é anunciado pelo botão e as respostas já selecionadas são preservadas. |
| Mais de um chatbot | Configure dois chatbots, quantidade 1 e vários códigos; depois teste quantidade 2. | Uma sessão não recebe o mesmo chatbot duas vezes; atribuições buscam equilíbrio e a ordem realizada consta no CSV. Em amostras pequenas, a distribuição aleatória pode não ficar exatamente igual. |
| Encerrar coleta | Gere um código sintético ainda não utilizado, encerre a coleta e tente iniciar uma nova participação com ele. | A sessão não iniciada é recusada; reabrir a coleta permite novas participações. Sessões que já começaram podem continuar. |
| Resultados | Complete as três avaliações uniformes da seção anterior e abra resultados. | Médias, fatores, escore geral e distribuição por item correspondem às respostas. Resumos demográficos mostram contagem, percentual e `n` por grupo. |
| Exportação | Baixe o CSV após completar avaliações. | O arquivo contém códigos, idioma, demografia, chatbot, ordem, respostas brutas e escores calculados. |
| Rede local | Execute `pnpm dev:lan`; descubra o IPv4 da máquina com `ipconfig`. Abra a ferramenta usando `http://<IPv4-da-máquina>:3000` em outro dispositivo. | O pesquisador e o participante acessam o mesmo servidor pela rede local. Gere e copie o link do participante enquanto a área do pesquisador também está aberta pelo endereço de rede, não por `localhost`. |

O modo LAN é destinado à rede local. O acesso pode depender de a rede permitir conexões entre dispositivos e de o Firewall do Windows permitir o servidor na porta 3000.

## 5. Verificações automatizadas

Na pasta do projeto, execute:

```powershell
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Esses comandos verificam testes unitários, lint, tipos e compilação. O roteiro manual continua necessário para conferir a operação com PostgreSQL, navegador e outro dispositivo na rede; passar nos comandos estáticos, sozinho, não comprova essa integração.

## 6. Evidências e limites desta revisão

Esta execução usou apenas estudos, grupos, códigos e respostas sintéticos em um PostgreSQL descartável. Nenhum dado de participante real foi usado.

- A aplicação iniciou contra um banco PostgreSQL vazio, aplicou as migrações e respondeu com o estado de saúde do banco. Após reiniciar a aplicação, o estudo sintético e seus resultados continuaram disponíveis.
- Dois grupos sintéticos foram cadastrados no mesmo painel de entrada. Com a sessão do segundo grupo, uma tentativa de abrir diretamente o estudo do primeiro retornou 404 e não mostrou os dados.
- Um estudo em português foi concluído com resposta 5 nos 11 itens. O painel exibiu média 5 e escore 100/100 nos quatro fatores; o resumo demográfico usou a faixa de idade, sexo, nacionalidade e campo personalizado selecionados, e o CSV preservou esses valores, as respostas e os escores.
- O protocolo em inglês e o editor do estudo em inglês foram abertos no navegador. O fluxo completo de participação em inglês não foi repetido nesta revisão.
- Em desktop (1440 px), as colunas dos resumos demográficos ficaram alinhadas. Em mobile (390 px), a página não excedeu a largura da tela; a tabela permaneceu em sua área de rolagem horizontal. O editor de demografia foi conferido nos dois tamanhos.
- O botão “Concluí a tarefa no chatbot” abriu e recolheu o questionário com teclado, preservando as respostas selecionadas.
- O relato original do Next.js indicava 298 ms; outra execução observada durante o diagnóstico marcou 269 ms em `D:\buss11-IHC\.next\dev`. `D:` é uma unidade fixa NTFS, sem evidência de ser compartilhamento de rede. A documentação local do Next.js 16.4.3 cita antivírus como uma causa possível de lentidão em arquivos no Windows, mas isso não foi confirmado; nenhuma configuração global foi alterada. O build de produção passou sem os avisos de rastreamento Turbopack e não reproduziu o aviso de desenvolvimento.

Não foi possível testar o endereço LAN em um segundo dispositivo físico. O fluxo completo em inglês, a retomada após recarregar o navegador e a edição manual da configuração após emitir códigos continuam no roteiro de aceite; os testes automatizados cobrem validação demográfica, rótulos de snapshot, resultados e CSV.
