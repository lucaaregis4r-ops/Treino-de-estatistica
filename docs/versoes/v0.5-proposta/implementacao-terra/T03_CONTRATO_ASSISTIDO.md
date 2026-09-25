# T03 — Contrato do registro assistido

**Versão:** 0.5 proposta. **Dependência:** T02. **Resultado:** observações, sugestões e respostas com vínculos seguros, sem nova tela.

## Entradas de código

`src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `FootballPressureEpisode.ts`, `FootballOrientation.ts`; `src/application/ScoutTrainerService.ts`; `src/infrastructure/export/json/MatchJson.ts`; repositórios e eventos existentes.

## Contrato a implementar

| Dado | Requisito |
|---|---|
| Observação | ID, partida/período, controle/posse, instante observado, posição opcional |
| Detalhe | Tipo, alvo por ID, valor/desconhecido, equipe, instante-alvo separado do instante de preenchimento |
| Pressão | Equipe pressionante e com bola, altura separada da forma, ponto vinculado/idade ou sem posição |
| Candidato | Fontes, motivo(s), versão da regra/revisão das fontes, estado pendente/ignorado/não observado/confirmado/inválido |
| Confirmação | Ações explicitamente descritas, autores opcionais por papel, referência ao trecho, precisão espacial/temporal, procedência |

Escolher nomes reais após inspecionar contratos. Reutilizar domínio/serviços: coleta salva fatos; função determinística sugere; revisão confirma; análises só consomem registros elegíveis. UI não acessa IndexedDB diretamente. Não é uma reescrita de M4.

## Invariantes

- Sugestão não é ação. Preferência de exibição não é observação. Desligar recurso não apaga registros nem preenche lacunas ao religar.
- Altura Alta/Média/Baixa não deriva de Individual/Coletiva. Sem pressão, desconhecido e não aplicável são distintos. Não criar episódios contínuos a partir de snapshots.
- Camisa não é ID global: usar inscrição/atleta da partida. Momento da confirmação não substitui momento/intervalo observado.
- Chave estável evita candidatos duplicados. Regra versionada, fontes revisáveis. Ignorado não reaparece com mesmas fontes por render/reload.
- Corrigir/remover fonte invalida dependentes. Resposta humana fica preservada e sinalizada para revisão, sem contar ação órfã nem apagar silenciosamente.
- Salvar confirmação repetidamente não duplica ação. Reutilizar ação detalhada já vinculada; enriquecimento não conta como segunda ação. Não aplicar respostas de um alvo à posse atual.
- Extensões opcionais/versionadas preservam backups antigos, dados desconhecidos e o subconjunto StatsBomb suportado. Anotações locais não são eventos StatsBomb inventados.

## Aceite e testes

Fixtures de backup antigo/novo, recarga, IDs, retry de confirmação, desfazer fonte, autoria ausente e invalidação. Testes de serviço/domínio/serialização e typecheck. Registrar schema/decisões no ESTADO. Não construir UI ou relatórios nesta rodada; próxima T04.
