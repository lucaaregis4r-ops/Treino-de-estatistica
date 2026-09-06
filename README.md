# Scout Trainer

Aplicação desktop para treinamento e registro estatístico de partidas de voleibol. O projeto foi criado para praticar a velocidade, a lógica e a consistência do trabalho de scout em um ambiente local e educacional.

## Versão atual: 0.3.0

A versão 0.3.0 amplia o scout digitado com um registro visual de voleibol e uma área de análise baseada no estado da partida.

### Principais novidades

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

As probabilidades são estimativas baseadas no estado do placar. Elas servem para leitura do momento da partida e poderão ser calibradas futuramente com um histórico maior de jogos.

## Fluxo de uso

```text
Cadastros → Partidas → Registro digitado ou visual → Resumo → Análise
```

O modo digitado é indicado para treinar códigos e velocidade. O modo visual organiza a ação, a qualidade, o atleta e a trajetória na quadra para facilitar o registro durante rallies rápidos.

## Persistência e exportação

Os dados ficam armazenados localmente no computador. O aplicativo mantém o histórico da partida e permite exportar os registros em JSON, além dos formatos de relatório disponíveis no projeto.

## Desenvolvimento

O projeto utiliza uma aplicação web empacotada para desktop com Electron. Para instalar dependências e executar em desenvolvimento:

```bash
npm install
npm run dev
```

Para validar o projeto:

```bash
npm run typecheck
npm run build
npm test
```

Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo entre as versões 0.1.0, 0.2.0 e 0.3.0.

## Download

O executável portátil publicado atualmente no GitHub corresponde à versão 0.2.0. A versão 0.3.0 está disponível no código-fonte e no build do projeto; o pacote portátil será publicado quando a geração do executável for concluída.

## Sobre o projeto

O Scout Trainer é um projeto independente e educacional. Ele não substitui softwares profissionais nem representa uma versão oficial de ferramentas, federações ou organizações esportivas.

Desenvolvido por **Lucas Regis**.
