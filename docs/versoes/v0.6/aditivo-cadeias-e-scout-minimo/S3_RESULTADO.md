# S3 — análise de trajetórias inteiras e contraste do futsal

**Data:** 01/10/2026. **Próxima etapa:** [S4 — modelo probabilístico](etapas/S4_MODELO_PROBABILISTICO.md). O aplicativo permanece em 0.5.0 enquanto M8 estiver parcial.

## Entrega

- `ObservedSequenceAnalysis` v1 recebe unidades inteiras de S2. Conta `n` global e elegível, variantes exatas e categorizadas, faixas de comprimento/desfecho e padrões contíguos. As variantes incluem todos os passos observados e seus IDs de evidência; a categorização usa um vocabulário pequeno de ação + equipe. Padrões têm apoio por **unidade distinta**, mesmo se repetidos dentro dela. Limites de processamento interrompem só a mineração de padrões, com aviso explícito.
- `ObservedSequencePanel` aparece nas análises dos três esportes. Filtra unidades por equipe, set/período, desfecho, cobertura, ação presente e comprimento, sem recortar ações intermediárias. A lista mostra começo, equipe, contexto, tamanho, duração confiável, desfecho e cobertura. A expansão revela todos os passos, tempo/posição/destino conhecidos e vínculo ao registro bruto ou à revisão efetiva. Paginação visual não limita cálculo/exportação.
- A própria seção exporta CSV e JSON com todas as unidades e passos, e PDF de resumo com IDs de referência. O backup JSON original e os relatórios existentes continuam nos botões atuais. Nenhum xG ou modelo de futebol foi incluído na análise de futsal.
- Diagramas existentes de futebol e vôlei agora se identificam como **transições entre ações** ou zonas, resumo local de pares. A trajetória integral fica na nova seção.
- Os cartões, tabelas e botões da análise de futsal usam os tokens `--st-*` do tema escuro. Isso corrige o texto claro sobre fundo branco da imagem enviada pelo usuário.

## Verificação

- Testes de domínio conferem unidades de 1 e 20 ações, filtro de ação que preserva a trilha, suporte distinto de padrões repetidos, desfechos elegíveis e limite declarado de mineração; exportações CSV/JSON/PDF verificadas.
- Inspeção visual e teste E2E dirigido conferem cores computadas da análise de futsal, nova seção e ausência de rolagem horizontal em 390 px. O E2E do fluxo completo de futsal também passou após ampliar seu tempo limite para acomodar a rodada.
- TypeScript, ESLint dirigido e `git diff --check` passaram nesta rodada.

## Limites

- As variantes são descrições do que foi registrado. Não estimam causalidade nem probabilidade de uma posse/rally futuro. S4 avaliará o modelo probabilístico de contexto variável.
- Duração só aparece quando início e fim temporais são válidos e a unidade é completa. Eventos sem posse/rally atribuído ficam fora das variantes e aparecem na contagem de evidência não atribuída.
- O PDF resume variantes frequentes e lista IDs de unidade; o CSV/JSON trazem os passos completos. Um grande volume de trajetórias pode gerar PDF extenso.
