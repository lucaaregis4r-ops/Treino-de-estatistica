# A3 — Destacar trechos relevantes para completar

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / R4 ampliada. **Estado:** planejada. **Dependência:** A1/A2. **Objetivo:** reduzir a busca por lances importantes sem exigir descrição de todos os movimentos.

## Ler e inspecionar

[README](README.md), [A1](A1_CONTRATO_E_ARQUITETURA.md), `src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `src/ui/screens/scout/football/FootballScoutScreen.tsx`, `src/application/ScoutTrainerService.ts` e a navegação existente Registro/Resumo/Análise. Não criar outra aplicação de revisão.

## O que merece um convite

São regras propostas para priorização, não evidência automática de passe ou chance de gol. Iniciar com dois motivos simples e explicáveis:

1. **Trecho antes de finalização:** até os três últimos marcos elegíveis e origem do chute, na mesma posse/controle e em até 10 segundos anteriores ao chute. A ocorrência do chute basta, mesmo com resultado pendente. Sem ponto anterior elegível, não fabricar deslocamento; o chute continua revisável por seu próprio fluxo.
2. **Avanço observado para zona ofensiva:** par de pontos elegíveis, avanço longitudinal de pelo menos 20% do comprimento do campo, chegando ao terço ofensivo ou à área. Quando chegar à área por deslocamento lateral, aceitar distância entre pontos de pelo menos 20% do comprimento. Usar coordenadas calibradas do campo; se faltarem dimensões, omitir o critério de distância e manter o longitudinal. Janela máxima proposta de 8 segundos entre os pontos.

Limites 3/10s/20%/8s são valores iniciais de configuração interna, a ajustar no piloto. Não adicionar controles numéricos na tela de coleta. Não chamar a sugestão de “passe perigoso”, “assistência”, “quebra de linha” ou “chance criada”. Mostrar o motivo factual: “Antes do chute” ou “Avanço para o terço ofensivo”.

Elegibilidade: posição/orientação conhecidas, mesma posse/período/controle e nenhum intervalo de disputa, parada, pausa de coleta ou desconhecido entre fontes. Distância reta entre marcas é apenas deslocamento observado; um intervalo curto ainda pode conter várias ações. Direção de ataque muda por equipe/período. Sem orientação, somente a regra anterior ao chute pode operar, sem alegação de avanço.

## Pouco destaque, nenhuma interrupção

- Oferecer **Sugerir trechos para completar**, opcional; não ligar automaticamente porque o scouter ativou pressão. Desligar interrompe novos convites e preserva respostas.
- No campo ativo, destacar no máximo um trecho recente da posse atual com traço pontilhado mais visível e pequeno marcador. Não desenhar seta com aparência de passe confirmado, nem som, animação pulsante ou modal.
- Um acesso discreto **Trechos para completar** pode indicar quantidade, sem alerta de urgência ou cobrança para zerar. Não disputar a faixa de resultado de chute. Sugestões só aparecem após salvar a coleta que as originou.
- Fundir candidatos sobrepostos da mesma sequência; antes de chute tem prioridade. Um segundo chute permanece identificado, mesmo quando usa fontes compartilhadas. Não repetir pedido já ignorado/confirmado com as mesmas fontes.
- Ao sair da posse, retirar destaque antigo do campo ao vivo. Manter o trecho na revisão para quando houver tempo. Não sobrepor trajetória de posse antiga ao estado atual.
- Abrir revisão exige ação explícita. Mostrar o trecho original em contexto de revisão separado, usando a navegação existente; nunca substituir silenciosamente o campo ao vivo. Preservar coleta/relógio e oferecer retorno direto. Se o operador decidir pausar a coleta, registrar lacuna; não pausar silenciosamente só por abrir revisão.

## Completar sem questionário obrigatório

Primeiro mostrar pontos/horário, motivo do destaque e as ações **Descrever trecho**, **Não consegui observar** e **Ignorar**. Nada de perguntas disparadas uma após outra. Abrir a descrição permite escolher somente o que foi observado:

- Passe, condução e domínio/recepção podem coexistir no trecho. **Domínio não é alternativa obrigatoriamente excludente de passe**: um jogador pode passar e outro dominar. Permitir mais de uma ação; não converter todo o intervalo em uma ação única.
- Para passe: passador e receptor opcionais, distintos. Para condução: condutor opcional. Para domínio/recepção: quem recebeu/controlou, opcional. Nome e camisa identificam atletas do elenco da partida. Sem identificação, salvar ação com autor desconhecido.
- Marcar “houve passe” confirma somente a ação observada. Não transportar automaticamente a posição inicial/final do trecho para origem/destino exatos da ação. Aceitar localização/instante aproximado ou não observado; ancorar intervalo e oferecer refinamento posterior.
- Ponto com jogador conhecido é evidência daquele ponto; não preencher autoria do trecho automaticamente. Apresentar, quando útil, “jogador identificado neste ponto” como referência, sem seleção silenciosa.
- Confirmar apenas o que foi descrito em uma ação de salvar. Descartar a edição não confirma nada. “Não consegui observar” e Ignorar encerram o convite sem criar ação, mantendo estados distintos e reversíveis na revisão.

Não exigir registrar passe para poder registrar domínio, nem autoria para salvar ação. Confirmar uma ação no trecho não implica que todas as ações intermediárias foram identificadas. Chute, assistência e estatísticas derivadas não são inferidos da mera proximidade temporal.

## Aceite

Usar fixtures com avanço, recuo longo, inversão lateral longe da área, entrada na área, chute com rebote, chutes consecutivos, troca/disputa/pausa, pontos ausentes e troca de lados. Conferir motivos, deduplicação e ausência de sugestões através de fronteiras. Confirmar passe+domínio com autores distintos, autoria desconhecida, ignorar, corrigir fonte e salvar novamente sem duplicação. Nenhuma sugestão deve contar nas análises/exportações como ação confirmada. Typecheck e testes direcionados.

## Prompt para o Luna

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md e registro-assistido/README.md
e registro-assistido/A3_TRECHOS_PARA_COMPLETAR.md dentro desse pacote.
Execute somente A3 após A1/A2. Crie sugestões locais explicáveis, voluntárias e
separadas dos fatos; não reconstrua passes. Preserve a coleta e o resultado de chute.
Atualize ESTADO.md com limites/testes e pare antes de A4.
```
