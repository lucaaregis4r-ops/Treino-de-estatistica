# Scout Trainer

**Diretriz de interface:** [Guia visual compartilhado de vôlei, futebol e futsal](docs/GUIA_VISUAL.md). Consultar antes de criar ou expandir telas.

Aplicação desktop para treinamento e registro estatístico de partidas de **voleibol, futebol, futsal e basquete**, com armazenamento local. O projeto foi criado para praticar a velocidade, a lógica e a consistência do trabalho de scout em um ambiente profissional e educacional.

## Versão atual: 0.7.0

A versão 0.7.0 consolida a arquitetura multi-modalidade de alta densidade, aperfeiçoa as regras de rotação e líbero no voleibol, reestrutura os grafos de Markov e a quadra tática com perspectiva canônica e adiciona suporte completo a fluxos ágeis de registro para basquete e futsal.

### Novidades da versão 0.7.0

#### 1. Voleibol: Regras Rígidas de Rotação e Líbero
- **Garantia de Rede (P4, P3, P2):** O líbero é terminantemente proibido de ocupar a rede. Ao rotacionar para a posição 4, o central titular é restaurado automaticamente.
- **Sincronização Total da Quadra:** O seletor rápido lateral (`PlayerQuickPicker`) agora consome diretamente os atletas resolvidos da quadra visual (`courtPlayers`), eliminando estados inconsistentes (`Líbero abaixo` na rede).
- **Detecção Automática de Líberos:** Reconhecimento de líberos tanto por função registrada (`registeredRole: 'libero'`) quanto pela indicação na criação da partida (`liberoPlayerIds`).
- **Ajuste Rápido Seguro:** Rotações manuais na partida preservam as regras de líbero e titulares via `RotationEngine`.

#### 2. Árvore Tática Preditiva & Grafo de Markov
- **Perspectiva Canônica de Análise:** A equipe observada é sempre orientada à esquerda da quadra atacando para a direita, garantindo que trajetórias de ataque e recepção fiquem perfeitamente legíveis.
- **Briefing Tático para Treinadores:** Cartões de leitura tática em português claro (ex: eficácia de virada de bola após passe A, volume e desfechos), sem sobrecarga de termos puramente matemáticos.
- **Filtros por Fundamento:** Alternância instantânea de visualização por Saque, Recepção e Ataque.
- **Marcações Oficiais FIVB:** Marcações nítidas de Zonas 1 a 6 integradas na quadra vetorial.

#### 3. Arquitetura Compacta e Fluida Multi-Esporte
- **Basquete:** HUD de 1 toque para ações de alta frequência (Cestas de 2 e 3 pontos, rebotes ofensivos e defensivos, perdas de bola) e controle sincronizado de relógio de jogo e posse (24s / 14s).
- **Futsal:** Marcação de quadra por toque e atalhos rápidos com suporte a goleiro-linha e faltas acumuladas.
- **Futebol:** Registro minimalista por posse, pressão na bola e exportação compatível com subconjunto StatsBomb.

Consulte o [guia de registro de futebol](docs/registro-futebol-simples.md).

As ferramentas de tracking dedicadas continuam sendo mais completas e precisas para reconstruir o posicionamento de todos os jogadores. O objetivo do Scout Trainer é oferecer uma alternativa mais simples para treinamento, projetos educacionais e contextos em que esse tipo de infraestrutura ainda não está disponível.

Os eventos de futebol são coleta própria compatível com um subconjunto do esquema StatsBomb; **não são dados oficiais StatsBomb**. A referência pública em `reference/` é gerada offline. xG público só é preservado quando veio no evento importado; nenhum xG é inventado para chutes manuais. Estruturas `3+1`, pressão, quebra de linha e força percebida permanecem observações locais.

### Voleibol

- Cadastro reutilizável de atletas e equipes, com edição e desativação sem apagar o histórico.
- Tela de partidas com abertura, continuidade e consulta de resumos.
- Workspace contextual com Registro, Resumo e Análise.
- Scout digitado e registro visual/gestual.
- Quadra espacial com trajetória origem → destino.
- Sugestões de saque, recepção e ataque, sempre editáveis.
- Levantamento implícito no fluxo recepção → ataque, com registro manual disponível.
- Histórico de ações com correção, desfazer e refazer.
- Rotação P1–P6, destaque do levantador e regras visuais do líbero.
- Explorador espacial com filtros por ação, atleta, qualidade, set, posição do levantador e coordenada.
- Modos Pontos, Jogadas e Heatmap.
- Probabilidade estimada de vitória da partida e do set a partir do placar.
<<<<<<< HEAD
- Relatórios editáveis em PDF, com seleção de gráficos.
- Exportação de rascunho editável em JSON.
- Uso por touch, mouse e caneta com Pointer Events.
=======
- Gráfico de evolução da probabilidade por ponto/rally e impacto das mudanças de placar.
- Migração do banco local IndexedDB para a versão 6.
- Relatório PDF redesenhado no padrão visual do aplicativo, com pré-visualização e edição de título, autoria e observações antes da exportação.
- Inclusão seletiva de gráficos no relatório, com ordenação, remoção e múltiplas versões do mesmo gráfico usando filtros diferentes.
- Gráficos vetoriais de probabilidade, desempenho, rotações, distribuição do levantador, equilíbrio do ataque e repetição de combinações.
- Exportação do rascunho editável em JSON para continuar a edição antes de gerar o PDF.

### Registro gestual de voleibol

- Touch, mouse e caneta usando Pointer Events.
- Sequência de rally guiada pelo contexto, com levantamento implícito.
- Rotação sugere atletas para saque, recepção e ataque.
- Inferência de ataque defendido, erro, ponto, free ball e block-out.
- Área espacial externa para registrar bolas fora sem coordenadas inválidas.
- PWA e armazenamento local preservados.
>>>>>>> c513ab7 (feat(v0.7.0): correcao do libero na rede, arvore de Markov tatica e expansao multi-esporte)

As probabilidades são estimativas baseadas no estado do placar. Elas servem para leitura do momento da partida e poderão ser calibradas futuramente com um histórico maior de jogos.

## Fluxo de uso

```text
Cadastros → Nova partida (modalidade e equipes) → Registro → Resumo / Análise
```

No voleibol, o modo digitado treina códigos e velocidade enquanto o registro visual organiza ação, qualidade, atleta e trajetória.

No futebol, selecione a equipe com a bola, registre os marcos observados no campo e acrescente ações e detalhes quando a situação de coleta permitir.

## Persistência e exportação

Os dados ficam armazenados localmente no computador. O aplicativo mantém o histórico da partida e permite exportar registros e relatórios nos formatos disponíveis no projeto.

O backup completo usa o contrato `1.1.0` e continua importando backups `1.0.0`. Para futebol, a exportação StatsBomb representa apenas o subconjunto efetivamente observado. Consulte [Compatibilidade de dados do futebol](docs/referencia/COMPATIBILIDADE_DADOS_FUTEBOL.md).

<<<<<<< HEAD
## Documentação da 0.5

Comece por [docs/COMECE_AQUI.md](docs/COMECE_AQUI.md).

A documentação usada para construir a entrada do futebol está organizada em [12 macroetapas](docs/versoes/v0.5-proposta/implementacao-terra/README.md). O [estado de implementação e validação](docs/versoes/v0.5-proposta/ESTADO.md) registra o que já foi verificado e o que ainda depende de teste humano ou refinamento.
=======
## Documentação e estado da implementação

Comece por [docs/COMECE_AQUI.md](docs/COMECE_AQUI.md). O roteiro da versão **0.5.0**, mantido no caminho histórico `v0.5-proposta`, está organizado em [12 macroetapas](docs/versoes/v0.5-proposta/implementacao-terra/README.md). O [estado de implementação e validação](docs/versoes/v0.5-proposta/ESTADO.md) distingue as etapas verificadas, o piloto humano pendente e as análises ainda planejadas. A identificação desta entrega como 0.5.0 não encerra as validações pendentes registradas no plano.
>>>>>>> c513ab7 (feat(v0.7.0): correcao do libero na rede, arvore de Markov tatica e expansao multi-esporte)

Planos anteriores estão em [documentação por versão](docs/versoes/README.md). O [mapa da reorganização](docs/organizacao/README.md) localiza arquivos que mudaram de pasta.

## Desenvolvimento

O projeto utiliza React, TypeScript, Vite e Electron. Use Node.js 22 e npm, como no fluxo de integração do repositório.

Para instalar as dependências e executar em desenvolvimento:

```bash
npm ci
npm run dev
```

Para validar o projeto:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Os testes E2E usam Google Chrome instalado e iniciam um servidor na porta `4175`. Para abrir a aplicação desktop no sistema atual, execute `npm run desktop`.

Na verificação de 25/09/2026, o build, 62 testes dirigidos de futebol/cadastros/backups e um cenário E2E de futebol (registro, pressão, jogador, mapas e recarga) passaram. O E2E passou na repetição com limite de 120 segundos, após a tentativa inicial expirar. A validação global ainda possui pendências: foram observadas falhas em testes de fluxo da interface, o lint completo foi interrompido por consumo de memória e o piloto humano continua necessário.

<<<<<<< HEAD
Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo do projeto.
=======
Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo entre as versões 0.1.0 e 0.5.0.

## Usar no Windows e compartilhar pelo Drive

O executável portátil da revisão de **25/09/2026** está preparado para **Windows de 64 bits**. A versão do aplicativo é **0.5.0**, substituindo a identificação 0.4.0 usada inicialmente para esta revisão.

1. Baixe `Scout-Trainer-0.5.0-2026-09-25.zip` quando ele for disponibilizado pelo responsável pelo projeto.
2. Extraia o ZIP para uma pasta no computador.
3. Abra `Scout-Trainer-0.5.0-Portable.exe`. Não é necessário instalar Node.js, npm ou o projeto para usar o aplicativo.
4. Escolha a modalidade, cadastre ou reutilize as equipes e crie uma partida.

O pacote preparado localmente fica em `Para Google Drive/Scout-Trainer-0.5.0-2026-09-25.zip` e contém o executável, `LEIA-ME.txt`, `DIVULGACAO.txt` e o checksum SHA-256 do executável. A data distingue esta revisão de outros pacotes com a mesma versão. O upload e o link de download do Drive são separados do envio do código ao GitHub.

O pacote foi gerado em Linux e ainda precisa de uma verificação de abertura no Windows. Os resultados dos testes e as pendências estão descritos na seção Desenvolvimento.
>>>>>>> c513ab7 (feat(v0.7.0): correcao do libero na rede, arvore de Markov tatica e expansao multi-esporte)

## Gerar o executável Windows

Depois de instalar as dependências:

```bash
npm run build:exe
```

<<<<<<< HEAD
O comando compila a aplicação e gera um executável portátil na pasta `distribuicao/`, usando a versão declarada no projeto.
=======
O comando compila a aplicação e gera `distribuicao/Scout-Trainer-0.5.0-Portable.exe`. O formato portátil dispensa instalação no Windows. O empacotador baixa o Electron para Windows e as ferramentas necessárias; na primeira execução, é preciso acesso à internet. A distribuição do Electron é escolhida para o sistema de destino, permitindo também o empacotamento a partir do Linux.
>>>>>>> c513ab7 (feat(v0.7.0): correcao do libero na rede, arvore de Markov tatica e expansao multi-esporte)

O formato portátil dispensa instalação no Windows. O empacotador baixa o Electron para o sistema de destino; na primeira execução do empacotamento, é preciso acesso à internet.

A pasta `distribuicao/` é ignorada pelo Git. O executável pode ser compartilhado separadamente ou anexado a uma release. Exporte um backup JSON das partidas antes de trocar de computador ou ambiente de execução, pois os dados ficam no armazenamento local de cada ambiente.

## Sobre o projeto

O Scout Trainer é um projeto independente, educacional e **open source sob licença MIT**. Ele não substitui softwares profissionais nem representa uma versão oficial de ferramentas, federações ou organizações esportivas.

Desenvolvido por **Lucas Regis**.
