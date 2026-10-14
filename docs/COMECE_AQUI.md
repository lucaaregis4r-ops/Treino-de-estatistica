# Comece aqui — documentação do Scout Trainer

**Diretriz de interface:** [Guia visual compartilhado de vôlei, futebol e futsal](GUIA_VISUAL.md). Consultar antes de criar ou expandir telas.

**Versão atual: 0.5.0. Roteiro vigente:** [Implementação Terra — 0.5](versoes/v0.5-proposta/implementacao-terra/README.md). Doze macroetapas, cada uma com seu MD, entradas de código e aceite.

**Próxima versão planejada: 0.6.** [Plano de futsal e correção de substituições para o Luna](versoes/v0.6/README.md), organizado em M0–M8. O plano 0.6 ainda não altera a versão executável nem conclui as pendências da 0.5.0.

**Aditivo da linha 0.6:** [rallys e posses inteiros + scout mínimo de futsal](versoes/v0.6/aditivo-cadeias-e-scout-minimo/README.md), organizado em S0–S5. S0–S4 foram implementadas; S5 segue em validação e não declara a 0.6 entregue.

**Experimento de registro seletivo:** [Scout Essencial híbrido para futebol e futsal](versoes/v0.6/SCOUT_ESSENCIAL_HIBRIDO.md), acrescentado como modo alternativo sem substituir os fluxos atuais.

Esta é a entrada para a sequência de trabalho. Em 25/09/2026, o responsável pelo projeto definiu esta entrega como **0.5.0**. O caminho `v0.5-proposta` foi preservado para manter os links do planejamento. As pendências técnicas e operacionais continuam registradas no estado das macroetapas. 0.45 e 0.46 são nomes dos planos anteriores; não foram renumerados nem considerados concluídos.

## Para o Terra

1. Leia o [roteiro consolidado](versoes/v0.5-proposta/implementacao-terra/README.md).
2. Consulte a tabela vigente **T01–T12** no [estado das macroetapas](versoes/v0.5-proposta/ESTADO.md).
3. Leia somente o Markdown da macroetapa solicitada e os arquivos de código indicados nele.
4. Execute uma macroetapa por solicitação; registre evidências e a próxima etapa, sem iniciá-la automaticamente.

**Próxima etapa operacional:** [T10 — validação e piloto](versoes/v0.5-proposta/implementacao-terra/T10_VALIDACAO_E_PILOTO.md), conforme o estado vigente. T01–T10 têm verificação técnica registrada; o piloto humano e a adaptação das análises por posse continuam pendentes.

O roteiro inclui detalhes opcionais, pressão fixável, trechos sugeridos/revisão, menus e cadastro nas duas modalidades, validação/piloto, análises e entrega. M/R/A ficam como referências anteriores, com avisos de substituição; não executar em paralelo com T01–T12.

Referência para a próxima rodada, quando solicitada:

```text
Leia docs/COMECE_AQUI.md,
docs/versoes/v0.5-proposta/implementacao-terra/README.md,
a seção vigente de docs/versoes/v0.5-proposta/ESTADO.md e
docs/versoes/v0.5-proposta/implementacao-terra/T10_VALIDACAO_E_PILOTO.md.
Confira as pendências do piloto humano e execute apenas o escopo solicitado.
Preserve alterações existentes e dados; registre as evidências em ESTADO.md.
```

Não executar os planos antigos como pré-requisitos presumidos. O código local pode estar mais avançado do que eles.

## Onde está cada assunto

| Pasta | Conteúdo |
|---|---|
| [versoes/v0.5-proposta/implementacao-terra](versoes/v0.5-proposta/implementacao-terra/README.md) | Roteiro vigente, 12 etapas, prompts e cópias das prévias aprovadas |
| [versoes/v0.5-proposta](versoes/v0.5-proposta/ESTADO.md) | Estado único, decisões e especificações anteriores preservadas |
| [versoes/v0.6](versoes/v0.6/README.md) | Plano da próxima versão: futsal, substituições, relógio T e análises sem xG de futebol |
| [versoes](versoes/README.md) | Planos e registros por versão, incluindo a entrega 0.5.0 |
| [referencia](referencia/README.md) | Semântica de vôlei, intercâmbio do futebol e relatório |
| [arquitetura](arquitetura/README.md) | Pipelines e decisões arquiteturais vindas de vibecoding |
| [historico](historico/README.md) | Documentos sem versão de release comprovada |
| [organizacao](organizacao/README.md) | Inventário, critérios e mapa de caminhos antigos → novos |

A organização de documentos não muda o funcionamento do aplicativo. Dados de partidas, executáveis, dependências, testes e código continuam em seus locais.
