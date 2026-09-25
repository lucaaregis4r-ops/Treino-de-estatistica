# Organização documental — 21/09/2026

**Escopo:** transversal. Esta reorganização não altera código funcional nem número de release.

## Critérios

- Uma entrada: `docs/COMECE_AQUI.md`; um estado vigente: `docs/versoes/v0.5-proposta/ESTADO.md`.
- Planos/entregas por versão declarada ou base identificável. Pacotes de interface e futebol agrupados dentro da base 0.4.
- 0.46 saiu da pasta 0.45. O pacote duplicado em `docs/docs/` foi incorporado à base de futebol.
- Documentação de `vibecoding/` foi distribuída entre versões, arquitetura e histórico. Somente diretórios vazios resultantes foram removidos.
- Guias transversais não receberam uma versão arbitrária. Cada Markdown movido ganhou indicação de versão/escopo e classificação, preservando o conteúdo original.
- O plano de posse foi incorporado à proposta 0.5 e detalhado em dez macroetapas, cada uma com seu Markdown e prompt.
- Foram corrigidos caminhos internos. Nomes históricos e IDs de etapas foram preservados; sufixos de cópia como `(1)` foram removidos onde aplicável.
- Não houve exclusão de dados de partidas, limpeza de executáveis ou movimentação de código/dependências.

## Mapa e inventário

- [Inventário legível dos arquivos movidos](INVENTARIO.md).
- [Mapa completo com caminhos antigos, novos e SHA-256 original](MAPA_DE_CAMINHOS.json).
- [Verificação da reorganização](VERIFICACAO.md).

## Diretórios que permanecem na raiz

| Grupo | Diretórios | Motivo |
|---|---|---|
| Aplicação | `src`, `public`, `electron` | Contratos de código, assets e empacotamento |
| Verificação | `e2e`, `test`, `scripts`, `reference` | Caminhos de fixtures/scripts/dados referenciados pelo código |
| Dependências/saída | `node_modules`, `dist`, `release`, `distribuicao`, `executavel` | Não mover ou apagar sem tarefa específica de build/limpeza |
| Evidências e temporários | `output`, `test-results`, `tmp` | Evidências históricas e saídas existentes preservadas |
| Dados do usuário | `Para Google Drive`, pasta da partida `Olympico-x-Sada_...` | Backups/exportações reais; não são documentação de planejamento |

README, CHANGELOG, avisos de terceiros, configurações e o arquivo real ` AGENTS.md` permanecem na raiz por sua função. Os caminhos antigos nos registros históricos do mapa são intencionais.
