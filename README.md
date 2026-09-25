# Scout Trainer

Aplicação desktop para treinamento e registro estatístico de partidas de **voleibol e futebol**, com armazenamento local. O projeto foi criado para praticar a velocidade, a lógica e a consistência do trabalho de scout em um ambiente educacional.

## Versão atual: 0.4.0

A base 0.4.0 reúne scout digitado e visual/gestual de voleibol, análises táticas e relatórios editáveis. Esta revisão acrescenta registro de futebol, cadastro por modalidade e revisão voluntária. A versão declarada em `package.json` permanece `0.4.0`.

### Futebol e cadastros

- Registro mínimo por equipe com a bola, posições observadas, trocas de controle, paradas e finalizações.
- Ações por atalhos, jogador opcional, desfazer e preservação do rascunho quando uma gravação falha.
- Pressão na bola com estados distintos para pressão presente, sem pressão e não observada; detalhes opcionais de saída, roubada e jogador.
- Linha de pressão fixável e sugestões locais de trechos, com revisão voluntária separada do registro ao vivo.
- Relógio, período, direção de ataque e ajustes de placar por partida.
- Cadastro de atletas por linhas, edição de elencos e reaproveitamento explícito de equipes no vôlei e no futebol.
- Backup completo em JSON e intercâmbio de um subconjunto de eventos StatsBomb, acompanhado de manifesto de compatibilidade.

Consulte o [guia de registro de futebol](docs/registro-futebol-simples.md). As etapas T01–T10 têm verificação técnica registrada, mas o piloto humano de T10 continua pendente. A adaptação das análises por posse (T11) e a entrega integral do plano (T12) permanecem pendentes; os módulos analíticos existentes precisam ser reavaliados para a coleta esparsa por posse. O empacotamento desta revisão não substitui esse aceite operacional.

### Recursos de voleibol

- Cadastro reutilizável de atletas e equipes, com edição e desativação sem apagar o histórico.
- Tela de partidas com abertura, continuidade e consulta de resumos.
- Workspace contextual com Registro, Resumo e Análise.
- Registro visual alternativo ao scout por códigos, com quadra espacial e trajetória origem → destino.
- Sugestões automáticas de saque, recepção e ataque, sempre editáveis.
- Levantamento implícito no fluxo recepção → ataque, com registro manual disponível quando necessário.
- Atalho `Enter` para registrar e `Esc` para limpar a seleção em andamento.
- Histórico das cinco últimas ações, com correção, desfazer e refazer.
- Atletas exibidos na rotação P1–P6, com destaque do levantador.
- Regra visual do líbero no fundo, preservando o central durante seu turno de saque.
- Placar compacto no registro visual e atualização contextual da partida.
- Explorador espacial com filtros por ação, atleta, qualidade, set, posição do levantador e coordenada.
- Modos Pontos, Jogadas e Heatmap usando os mesmos filtros.
- Probabilidade estimada de vitória da partida e do set a partir do placar.
- Gráfico de evolução da probabilidade por ponto/rally e impacto das mudanças de placar.
- Migração do banco local IndexedDB para a versão 6.
- Relatório PDF redesenhado no padrão visual do aplicativo, com pré-visualização e edição de título, autoria e observações antes da exportação.
- Inclusão seletiva de gráficos no relatório, com ordenação, remoção e múltiplas versões do mesmo gráfico usando filtros diferentes.
- Gráficos vetoriais de probabilidade, desempenho, rotações, distribuição do levantador, equilíbrio do ataque e repetição de combinações.
- Exportação do rascunho editável em JSON para continuar a edição antes de gerar o PDF.

### Registro gestual mobile-first (V0.4)

- Touch, mouse e caneta usando Pointer Events.
- Sequência de rally guiada pelo contexto, com levantamento implícito.
- Rotação sugere atletas para saque, recepção e ataque.
- Inferência de ataque defendido, erro, ponto, free ball e block-out.
- Área espacial externa para registrar bolas fora sem coordenadas inválidas.
- PWA e armazenamento local preservados.

As probabilidades são estimativas baseadas no estado do placar. Elas servem para leitura do momento da partida e poderão ser calibradas futuramente com um histórico maior de jogos.

Os eventos de futebol são coleta própria compatível com um subconjunto do esquema StatsBomb; não são dados oficiais StatsBomb. A referência pública em `reference/` é gerada offline por script a partir de uma fixture pequena pinada e não é acessada durante o jogo. xG público só é preservado quando veio no evento importado; nenhum xG é inventado para chutes manuais. Estruturas `3+1`, pressão, quebra de linha e força percebida permanecem observações locais.

## Fluxo de uso

```text
Cadastros → Nova partida (modalidade e equipes) → Registro → Resumo / Análise
```

No voleibol, o modo digitado treina códigos e velocidade; o visual organiza ação, qualidade, atleta e trajetória. No futebol, selecione a equipe com a bola e registre os marcos observados no campo, usando detalhes e revisão quando necessário.

## Persistência e exportação

Os dados ficam armazenados localmente no computador. O aplicativo mantém o histórico da partida e permite exportar os registros em JSON, além dos formatos de relatório disponíveis no projeto.

O backup completo usa o contrato `1.1.0` e continua importando backups `1.0.0`. Para futebol, a exportação StatsBomb é um subconjunto observado e acompanhado de manifesto; consulte [Compatibilidade de dados do futebol](docs/referencia/COMPATIBILIDADE_DADOS_FUTEBOL.md).

## Documentação e próximo plano

Comece por [docs/COMECE_AQUI.md](docs/COMECE_AQUI.md). O plano **0.5 proposta** está organizado em [12 macroetapas](docs/versoes/v0.5-proposta/implementacao-terra/README.md). O [estado de implementação e validação](docs/versoes/v0.5-proposta/ESTADO.md) distingue as etapas verificadas, o piloto humano pendente e as análises ainda planejadas. O nome do plano não representa uma versão 0.5 publicada.

Planos anteriores estão em [documentação por versão](docs/versoes/README.md). O [mapa da reorganização](docs/organizacao/README.md) localiza arquivos que mudaram de pasta.

## Desenvolvimento

O projeto utiliza React, TypeScript, Vite e Electron. Use Node.js 22 e npm, como no fluxo de integração do repositório. Para instalar as versões do arquivo de lock e executar em desenvolvimento:

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

Na verificação de 25/09/2026, o build, 62 testes dirigidos de futebol/cadastros/backups e um cenário E2E de futebol (registro, pressão, jogador, mapas e recarga) passaram. O E2E passou na repetição com limite de 120 segundos, após a tentativa inicial expirar. A validação global continua pendente: foram observadas falhas em testes de fluxo da interface, e o lint completo foi interrompido por consumo de memória. Isso se soma ao piloto humano ainda pendente no plano de implementação.

Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo entre as versões 0.1.0 e 0.4.0.

## Gerar o executável Windows

Depois de instalar as dependências:

```bash
npm run build:exe
```

O comando compila a aplicação e gera `distribuicao/Scout-Trainer-0.4.0-Portable.exe`. O formato portátil dispensa instalação no Windows. O empacotador baixa o Electron para Windows e as ferramentas necessárias; na primeira execução, é preciso acesso à internet. A distribuição do Electron é escolhida para o sistema de destino, permitindo também o empacotamento a partir do Linux.

A pasta `distribuicao/` é ignorada pelo Git. O executável pode ser compartilhado separadamente ou anexado a uma release; fazer commit do código não publica automaticamente o arquivo. Exporte um backup JSON das partidas antes de trocar de computador ou ambiente de execução, pois os dados ficam no armazenamento local de cada ambiente.

## Sobre o projeto

O Scout Trainer é um projeto independente e educacional. Ele não substitui softwares profissionais nem representa uma versão oficial de ferramentas, federações ou organizações esportivas.

Desenvolvido por **Lucas Regis**.
