> **Versão/escopo:** Base do app 0.4.0; pacote Futebol 0.1 (numeração própria do módulo).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../../COMECE_AQUI.md).

# F3 — Contexto tático, chute e baliza

**Leia primeiro:** `AGENTS.md`, plano geral, F1, F2 e `ESTADO.md`. **Executar apenas F3.** Preserve o registro rápido da F2: os detalhes desta etapa são uma pergunta curta pertinente ou enriquecimento posterior.

## Contexto da posse

Adicionar gaveta “Contexto da posse”, preenchível agora ou ao revisar o histórico. Campos opcionais: origem (recuperação, tiro de meta, distribuição do goleiro, lateral, escanteio, falta, saída de centro, outra); zona de recuperação; saída observada `3+1`, `3+2`, `2+3`, outra ou não observada; pressão qualitativa; defesa organizada/desorganizada; passe curto/longo, condução, combinação; quebra de linha observada; recepção relevante; vantagem e observação livre. `3+1` descreve estrutura da saída observada, **não** `tactics.formation` da StatsBomb. Esses dados moram sob `scout_trainer.tactical_context` com proveniência e não viram qualificadores StatsBomb inventados.

Preencher `play_pattern` **apenas se o início observado o justificar**: `From Corner` 2, `From Free Kick` 3, `From Throw In` 4, `From Goal Kick` 7, `From Keeper` 8, `From Kick Off` 9; `Regular Play` 1 quando confirmado. A origem “recuperação” pode ser jogo corrido. “Transição” local não é `From Counter` 6: a especificação usa regra de cadeia própria que ainda não foi reproduzida. Um `pass.type` de escanteio/tiro de meta/lateral só é posto no **passe que realmente executou essa reposição**, não em todos os eventos da posse. Atualização da origem recalcula o contexto derivado sem mudar eventos observados.

Derivar zona/corredor/terço de `location` e `end_location` em 120 × 80 com regra documentada e fronteiras testadas. As direções usam perspectiva de ataque do evento (`x=120`); os dados de todos os eventos continuam orientados por equipe, e a vista física depende do período/lado conhecido. `pass.length` é em jardas e só pode ser calculado com escala/projeção explicitada; não declarar `120` unidades como 120 metros ou preencher um campo StatsBomb com distância falsa. Se não souber medida real, mantenha distância normalizada/zonas no namespace local e deixe `pass.length` ausente.

## Menu curto da finalização

Ao escolher Chute, tocar origem se conhecida, escolher resultado com um toque e prosseguir. Perguntas opcionais: tipo (jogo corrido, falta direta, escanteio direto, pênalti), parte do corpo (pé esquerdo/direito/cabeça/outro), contestação/pressão, primeiro toque, observação e força **percebida** baixa/média/alta. Mapear para `shot.type`, `shot.body_part`, `shot.outcome` e `under_pressure` **só se a definição StatsBomb corresponder ao que foi observado**. Força percebida permanece em `scout_trainer.shot_context`; não é velocidade do chute.

A mini-baliza abre quando se observou onde a bola cruza/alcança o plano do gol. Na representação StatsBomb, `shot.end_location` pode ser `[x,y]` ou `[x,y,z]`; gol adversário à direita. Mapear posição horizontal observada na baliza para a faixa StatsBomb aproximadamente `y=36..44` e altura observada para `z=0..2,67` conforme desenho da especificação. Altura não percebida => `[120,y]`, nunca `[120,y,0]`. Chute bloqueado antes do gol pode ter `shot.end_location` no bloqueio **se observado**, mas não um ponto inventado na baliza. Chute fora/trave/de defesa precisa respeitar destino real, inclusive fora da faixa de gol quando aplicável. O gesto de tiro é ponto, não exige arrasto. Não chamar o alvo de PSxG; não gerar `shot.statsbomb_xg` para chute coletado manualmente.

Dados StatsBomb importados com `shot.statsbomb_xg` preservam esse campo com fonte e definição original; a UI só o apresenta como “xG recebido da StatsBomb” quando não houver dúvida de proveniência. A finalização própria exibe desfecho e, na F5, eventual taxa histórica por zona com nome distinto de xG.

## Verificações obrigatórias

- Posse completa pode ser registrada sem abrir contexto e enriquecida depois, sem mudar IDs, ordem ou placar. Estrutura `3+1` e quebra de linha não aparecem como formação/oficial do provedor.
- Escanteio + passe inicial gera `play_pattern:From Corner` e `pass.type:Corner` no evento certo; evento seguinte da mesma posse não vira novo escanteio.
- Chute defendido com alvo lateral mas sem altura salva `[120,y]`; chute bloqueado sem local do bloqueio não ganha alvo; força percebida só na extensão. Importar e reabrir um chute com `[120,y,z]` preserva o z.
- Troca de períodos/espelhamento não altera coordenadas gravadas; distância não é calculada em metros fictícios.

## Prompt para Luna

> Leia `AGENTS.md`, plano geral, F1, F2, este F3 e `ESTADO.md`. Execute apenas F3. Faça a gaveta opcional de contexto tático com qualificação StatsBomb segura de play_pattern/pass.type, derivados espaciais e menu curto de chutes/mini-baliza com alvo [x,y] ou [x,y,z]. Separe estrutura 3+1, força percebida e demais extras sob scout_trainer. Preserve o fluxo de poucos toques da F2 e teste os casos obrigatórios. Atualize `ESTADO.md`; não avance para F4/F5.
