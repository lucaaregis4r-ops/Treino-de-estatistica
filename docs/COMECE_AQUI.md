# Comece aqui — documentação do Scout Trainer

**Roteiro vigente:** [Implementação Terra — 0.5 proposta](versoes/v0.5-proposta/implementacao-terra/README.md). Doze macroetapas, cada uma com seu MD, entradas de código e aceite.

Esta é a única entrada para a nova sequência de trabalho. A versão instalada declarada em `package.json` continua **0.4.0**. “0.5 proposta” organiza o próximo plano e não afirma que a versão foi implementada ou lançada. 0.45 e 0.46 são nomes dos planos anteriores; não foram renumerados nem considerados concluídos.

## Para o Terra

1. Leia o [roteiro consolidado](versoes/v0.5-proposta/implementacao-terra/README.md).
2. Consulte a tabela vigente **T01–T12** no [estado das macroetapas](versoes/v0.5-proposta/ESTADO.md).
3. Leia somente o Markdown da macroetapa solicitada e os arquivos de código indicados nele.
4. Execute uma macroetapa por solicitação; registre evidências e a próxima etapa, sem iniciá-la automaticamente.

**Próxima etapa, quando for solicitada implementação:** [T01 — tela mínima de futebol](versoes/v0.5-proposta/implementacao-terra/T01_TELA_MINIMA.md). A base existente é preservada. O pedido atual é de sistematização documental; não iniciou implementação.

O roteiro inclui detalhes opcionais, pressão fixável, trechos sugeridos/revisão, menus e cadastro nas duas modalidades, validação/piloto, análises e entrega. M/R/A ficam como referências anteriores, com avisos de substituição; não executar em paralelo com T01–T12.

Comando para a próxima rodada de implementação, quando solicitada:

```text
Leia docs/COMECE_AQUI.md,
docs/versoes/v0.5-proposta/implementacao-terra/README.md,
a seção vigente de docs/versoes/v0.5-proposta/ESTADO.md e
docs/versoes/v0.5-proposta/implementacao-terra/T01_TELA_MINIMA.md.
Execute somente T01. Preserve alterações existentes e dados; verifique o aceite
visual e funcional, atualize ESTADO.md e pare antes de T02.
```

Não executar os planos antigos como pré-requisitos presumidos. O código local pode estar mais avançado do que eles.

## Onde está cada assunto

| Pasta | Conteúdo |
|---|---|
| [versoes/v0.5-proposta/implementacao-terra](versoes/v0.5-proposta/implementacao-terra/README.md) | Roteiro vigente, 12 etapas, prompts e cópias das prévias aprovadas |
| [versoes/v0.5-proposta](versoes/v0.5-proposta/ESTADO.md) | Estado único, decisões e especificações anteriores preservadas |
| [versoes](versoes/README.md) | Planos e registros por versão, de 0.1 a 0.46 |
| [referencia](referencia/README.md) | Semântica de vôlei, intercâmbio do futebol e relatório |
| [arquitetura](arquitetura/README.md) | Pipelines e decisões arquiteturais vindas de vibecoding |
| [historico](historico/README.md) | Documentos sem versão de release comprovada |
| [organizacao](organizacao/README.md) | Inventário, critérios e mapa de caminhos antigos → novos |

A organização de documentos não muda o funcionamento do aplicativo. Dados de partidas, executáveis, dependências, testes e código continuam em seus locais.
