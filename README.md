# Scout Trainer

Aplicação desktop open source para treinamento, registro e análise estatística de partidas de **voleibol e futebol**, com armazenamento local.

O projeto nasceu como uma forma de praticar a lógica e a velocidade do scout e evoluiu para uma ferramenta experimental de coleta e análise para contextos que nem sempre têm acesso a sistemas profissionais de tracking.

## Versão atual: 0.5.0

A **0.5.0** marca a entrada do **futebol** no Scout Trainer, mantendo os recursos já existentes de voleibol e ampliando o projeto para esportes de invasão.

No futebol, a proposta é trabalhar com uma coleta híbrida: a posse pode ser acompanhada apenas pela **bola observada** e, quando for possível registrar mais detalhes, ações específicas podem ser acrescentadas. Isso permite produzir análises mesmo quando uma única pessoa não consegue acompanhar todos os jogadores ou todos os eventos da partida.

### Futebol — novidades da 0.5

- Registro da equipe com a bola, posição observada, trocas de controle, disputas, paradas e finalizações.
- Registro opcional de ações como passe, condução, drible, desarme, interceptação, recuperação, perda e falta.
- Jogador opcional, atalhos de teclado, desfazer e preservação do rascunho quando uma gravação falha.
- Pressão na bola com estados distintos para **pressão presente**, **sem pressão** e **não observada**.
- Linha de pressão fixável e revisão voluntária de trechos separada do registro ao vivo.
- Relógio, período, direção de ataque e ajustes de placar por partida.
- Mapas de ações, trajetórias e calor.
- Análises de **pressão e resposta**, **finalizações**, **construção** e **cadeias de Markov**.
- Cadastro de atletas e equipes por modalidade, com reaproveitamento de elencos.
- Backup completo em JSON.
- Importação e exportação de um subconjunto de eventos compatível com o esquema StatsBomb, acompanhada de manifesto de compatibilidade.

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
- Relatórios editáveis em PDF, com seleção de gráficos.
- Exportação de rascunho editável em JSON.
- Uso por touch, mouse e caneta com Pointer Events.

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

## Documentação da 0.5

Comece por [docs/COMECE_AQUI.md](docs/COMECE_AQUI.md).

A documentação usada para construir a entrada do futebol está organizada em [12 macroetapas](docs/versoes/v0.5-proposta/implementacao-terra/README.md). O [estado de implementação e validação](docs/versoes/v0.5-proposta/ESTADO.md) registra o que já foi verificado e o que ainda depende de teste humano ou refinamento.

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

Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo do projeto.

## Gerar o executável Windows

Depois de instalar as dependências:

```bash
npm run build:exe
```

O comando compila a aplicação e gera um executável portátil na pasta `distribuicao/`, usando a versão declarada no projeto.

O formato portátil dispensa instalação no Windows. O empacotador baixa o Electron para o sistema de destino; na primeira execução do empacotamento, é preciso acesso à internet.

A pasta `distribuicao/` é ignorada pelo Git. O executável pode ser compartilhado separadamente ou anexado a uma release. Exporte um backup JSON das partidas antes de trocar de computador ou ambiente de execução, pois os dados ficam no armazenamento local de cada ambiente.

## Sobre o projeto

O Scout Trainer é um projeto independente, educacional e **open source sob licença MIT**. Ele não substitui softwares profissionais nem representa uma versão oficial de ferramentas, federações ou organizações esportivas.

Desenvolvido por **Lucas Regis**.
