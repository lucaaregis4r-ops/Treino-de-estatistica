# Matriz de validação — 0.45

| ID | Cenário | Esperado |
|---|---|---|
| S01 | Eventos fora de ordem | sequência ordenada por `sequence` |
| S02 | Dois rallies | nunca misturar estados |
| S03 | Rally incompleto | sem terminal inventado |
| S04 | Sem atleta | sequência continua válida |
| S05 | Cobertura parcial | ausência adversária não vira erro/zero |
| S06 | Matriz | probabilidades de saídas elegíveis coerentes |
| S07 | Terminal | estado absorvente |
| S08 | Amostra n<5 | ranking indisponível |
| S09 | Amostra 5–14 | aviso de amostra pequena |
| S10 | Pattern 2 estados | contagem correta |
| S11 | Pattern 3 estados | contagem correta |
| S12 | Filtro por set | usa somente rallies do set |
| S13 | Filtro por fase | não vaza outros contextos |
| S14 | UI sem dados | mensagem de indisponibilidade, não 0% |
| S15 | Salvar análise | filtro/visão reabrem corretamente |
| S16 | Sem chave IA | todo analytics funciona |
| S17 | Chave inválida | erro local, sem perda de estado |
| S18 | Timeout IA | retry possível, sem travar UI |
| S19 | Payload IA | sem chave/eventos crus/nomes/coordenadas cruas por padrão |
| S20 | Resposta inventando finding | rejeitar/ignorar referência inexistente |
| S21 | PDF | resultados selecionados + amostra + método |
| S22 | JSON | schema/versionamento backward compatible |
| S23 | Backup antigo | reabre sem exigir campos 0.45 |
| S24 | Correção/undo | analytics recalcula a partir da fonte atual |
| S25 | Offline | Markov, valor espacial e perguntas determinísticas funcionam |
| S26 | Regressão | registro, placar e rotação permanecem intactos |
| S27 | `x,y` preservado | projeção mantém coordenadas existentes sem alterar evento |
| S28 | Coordenada ausente | não cria `(0,0)` e não colore célula falsa |
| S29 | Borda de região | mapeamento é determinístico e testado |
| S30 | Baseline espacial | recorte usa baseline sob os mesmos filtros esportivos |
| S31 | Fixture espacial | baseline 10/20=.50; R3 6/8=.75; delta=.25 |
| S32 | Unidade de amostra | saída declara `event` ou `rally`; denominador confere |
| S33 | Recepção espacial | destino do passe gera achado por região/célula |
| S34 | Saque espacial | destino do saque gera achado por região/célula |
| S35 | Ataque origem | regiões de origem são comparáveis |
| S36 | Ataque destino | regiões de destino são comparáveis |
| S37 | Trajetória | `originRegion -> targetRegion` tem n/valor corretos |
| S38 | Mapa n pequeno | 1/1 não aparece como ranking confiável |
| S39 | Troca de filtro | mapa e tabela usam o mesmo recorte |
| S40 | Tooltip/região | mostra n, probabilidade, baseline e delta corretos |
| S41 | Suavização | se ativa, mantém empírico e parâmetro/método explícitos |
| S42 | Export espacial | zone system/resolução/amostra/baseline são auditáveis |
| S43 | IA espacial | recebe apenas achados agregados; findingId válido |
| S44 | Undo espacial | correção de x,y recalcula mapa/achados sem dado residual |

## Gate de release

Bloqueadores:
- S01–S08;
- S12–S14;
- S16–S19;
- S23–S32;
- S33–S40;
- S42–S44.

S41 só bloqueia se a suavização for habilitada na release. Se não for entregue, a UI deve trabalhar com probabilidade empírica + regras de amostra e documentar a ausência do ajuste.

Os demais podem ser documentados como limitação somente se não corromperem dados nem produzirem conclusão enganosa.
