# T11 — Análises que a coleta sustenta

**Versão:** 0.5 proposta. **Dependência:** T10 com aceite operacional. **Resultado:** responder sobre posse, progressão, pressão e finalização com cobertura explícita, fora da coleta.

## Entradas de código

`src/ui/screens/summary/FootballAnalyticsPanel.tsx`, `FootballPitchPlot.tsx`, `FootballPressureResponsePanel.tsx`; `src/domain/football/FootballAnalytics.ts`, `FootballPressureAnalytics.ts`, `FootballPossessionService.ts`, `FootballModels.ts`. Confirmar origem de cada dado antes de reutilizar métrica.

## Entregas

- Mapas separados: início observado, perda quando seu local é conhecido, recuperação quando seu local é conhecido e chutes. Ponto anterior não vira local da troca. Clique abre evidências por ID.
- Posses com presença controlada observada em terço/área, maior zona observada e sequência de zonas. Contar uma vez por posse/zona; não concluir passagem controlada por zonas intermediárias da linha.
- Posses com chute / posses elegíveis; chutes por posse, com rebotes distintos. Separar posses parciais, início/fim desconhecidos e falta de posição.
- Distribuição de pressão por altura e forma, por equipe pressionante. Mapa de posições observadas da bola sob pressão, normalizado por período; total anotado, com posição elegível e desconhecidos. Não é mapa dos defensores, tempo pressionando, intensidade ou taxa por exposição territorial.
- Saída/estrutura e desfechos em posses com contexto identificado; snapshots não viram episódios. Com vários contextos na posse, mostrar vínculo ao trecho/instante sem escolher um valor silenciosamente. Amostra pequena/ausência de anotação ficam explícitas.
- Perda seguida de chute adversário apenas com continuidade conhecida; associação temporal não atribui culpa causal.
- Posse temporal apenas em intervalos acompanhados: A/B, disputa, parada e lacuna separados; percentual A/B usa tempo controlado conhecido e informa cobertura.

## Limites

Sugestões não confirmadas e respostas invalidadas não contam como ação. Ações detalhadas confirmadas podem ser consultadas como subconjunto com cobertura seletiva; não representam todos os passes. Não calcular rede/taxa total de passes, distância conduzida, PPDA, quebra de linha ou erro individual a partir de marcos ou da seleção de trechos relevantes.

Não reaproveitar ΔxT de passe/condução para marcos. xG existente mantém fonte/versão/elegibilidade, com origem desconhecida excluída conforme contrato. Modelos avançados e episódios contínuos de pressão não são dependências nem entregas obrigatórias deste pacote. Não misturar coleta densa/esparsa sem indicação de protocolo.

## Aceite e testes

Fixtures calculáveis à mão: posse com dois chutes, cliques repetidos na zona, pressão sem posição, lados invertidos, posse parcial/lacuna, ações seletivas, sugestão ignorada e fonte corrigida. Verificar denominadores, zero vs indisponível, vínculos e recálculo. Typecheck/testes/inspeção visual. Atualizar T11; próxima T12.
