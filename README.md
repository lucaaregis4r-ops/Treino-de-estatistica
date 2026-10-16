# Scout Trainer

Aplicação local para registrar, revisar e analisar partidas de **voleibol, futebol,
futsal e basquete**. O Scout Trainer une coleta rápida em quadra, histórico auditável,
correções e análises espaciais em uma interface pensada para treino, ensino e uso
operacional.

> Os dados permanecem no dispositivo até que o operador os exporte. O projeto não
> depende de uma conta ou serviço remoto para registrar uma partida.

## Destaques

- Registro por código, formulário, toque, mouse, caneta e atalhos de teclado.
- Histórico com correção, desfazer e refazer, preservando a cadeia de eventos.
- Workspace por partida com Registro, Resumo e Análise.
- Cadastro reutilizável de equipes e atletas.
- Mapas espaciais, sequências e métricas calculadas a partir dos eventos efetivamente
  observados.
- Exportação de relatórios e backups JSON para continuidade do trabalho.

### Voleibol

- Scout por códigos e registro visual de rally.
- Rotação P1–P6, escalações entre sets e regras de líbero.
- Quadra espacial, exploração de sequências e análises de distribuição.

### Futebol e futsal

- Registro orientado a posse, pressão, ações e localização em campo ou quadra.
- Fluxo simples de observação para coleta rápida.
- Dados de futebol compatíveis apenas com o subconjunto observado do formato
  StatsBomb; o Scout Trainer não gera xG ou eventos não anotados.

### Basquete

- Quadra tática para arremessos, rebotes, perdas, pressão, ritmo e gatilhos ofensivos.
- Relógios de jogo e de posse, incluindo reposições de 24 s e 14 s.
- PPP por posses completas e FG%/eFG% por arremessos de quadra.
- Caminhos táticos observados por ritmo, gatilho, zona e desfecho. O painel é
  descritivo: não prevê lances ausentes nem inventa trajetórias sem origem anotada.

## Arquitetura

```text
Registro do operador
  → serviço de aplicação e validação
  → log de eventos imutável
  → projeções efetivas da partida
  → métricas, mapas e relatórios
```

Correções, desfazer e refazer são novos eventos no histórico. As telas de análise
reconstroem seus resultados a partir dessa trilha, para que contagens e visualizações
permaneçam rastreáveis.

Consulte a documentação das [pipelines de dados](docs/arquitetura/PIPELINES.md) e o
[guia visual](docs/GUIA_VISUAL.md) para convenções de interface e regras de análise.

## Começar

Requisitos:

- Node.js 22
- npm
- Google Chrome instalado para os testes de navegador

```bash
npm ci
npm run dev
```

Para abrir a versão desktop no ambiente local:

```bash
npm run desktop
```

## Qualidade e validação

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm test` executa testes de domínio, aplicação e interface. `npm run test:e2e`
confere os fluxos em navegador real. Os workflows de GitHub Pages e do executável
Windows executam a suíte antes da compilação.

## Gerar executável para Windows

```bash
npm run build:exe
```

O comando gera um executável portátil em `distribuicao/`. Ele pode ser compartilhado
separadamente ou anexado a uma release. Antes de trocar de computador, exporte um
backup JSON: as partidas ficam no armazenamento local do ambiente onde foram criadas.

## Documentação

- [Comece aqui](docs/COMECE_AQUI.md)
- [Pipelines e arquitetura](docs/arquitetura/PIPELINES.md)
- [Guia visual](docs/GUIA_VISUAL.md)
- [Registro simples de futebol](docs/registro-futebol-simples.md)
- [Compatibilidade de dados de futebol](docs/referencia/COMPATIBILIDADE_DADOS_FUTEBOL.md)
- [Histórico de versões](CHANGELOG.md)

## Licença

Projeto independente, educacional e open source sob licença MIT.

Desenvolvido por **Lucas Regis**.
