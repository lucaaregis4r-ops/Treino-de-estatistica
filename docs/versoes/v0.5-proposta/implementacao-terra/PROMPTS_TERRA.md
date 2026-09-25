# Prompts para o Terra — 0.5 proposta

Usar uma etapa por solicitação. O prompt manda inspecionar e completar o necessário; não repetir entregas existentes. Não trocar modelo nem abrir outra tarefa automaticamente: estes textos são para o usuário utilizar com o Terra.

## Iniciar

```text
Leia docs/COMECE_AQUI.md,
docs/versoes/v0.5-proposta/implementacao-terra/README.md,
a seção vigente de docs/versoes/v0.5-proposta/ESTADO.md e
docs/versoes/v0.5-proposta/implementacao-terra/T01_TELA_MINIMA.md.
Execute somente T01, começando pela inspeção do código e das prévias de referência.
Preserve alterações existentes, dados e funcionamento do vôlei. A composição mínima
deve substituir o excesso de formulários no modo ao vivo. Faça as verificações da
etapa, atualize ESTADO.md com fatos/evidências e pare antes de T02.
```

## Continuar uma etapa

Substituir os dois campos entre colchetes usando a tabela do README; não enviar placeholders sem preencher.

```text
Leia docs/versoes/v0.5-proposta/implementacao-terra/README.md,
a seção vigente de docs/versoes/v0.5-proposta/ESTADO.md e
docs/versoes/v0.5-proposta/implementacao-terra/[ARQUIVO_DA_ETAPA].
Execute somente [ID_DA_ETAPA], verificando suas dependências e o código existente.
Complete o que falta sem refazer etapas anteriores nem seguir prompts históricos M/R/A.
Preserve dados, alterações do checkout e a composição mínima. Verifique os critérios
do MD, registre evidências e limitações em ESTADO.md e pare antes da etapa seguinte.
```

## Retomar uma etapa parcial

```text
Consulte o roteiro implementacao-terra e a tabela vigente T01–T12 em ESTADO.md.
Retome somente a etapa parcial indicada no meu pedido. Confira o relato anterior
contra código e evidências, conclua as pendências verificáveis e não repita trabalho
aprovado sem necessidade. Se faltar piloto humano, complete os testes técnicos
possíveis e registre a dependência, sem simular aceite operacional.
```
