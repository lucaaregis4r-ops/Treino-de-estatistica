# M4 — Domínio e persistência de posse e marcos

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M0.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M4; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Criar o suporte de dados para observações da bola independentes de passe/condução. Esta etapa não constrói a nova tela.

## Leitura de código

`src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `FootballRecorder.ts`, `StatsBombContract.ts`, `src/application/ScoutTrainerService.ts`, `src/domain/match/events/MatchEvent.ts`, `src/infrastructure/export/json/MatchJson.ts`, testes de domínio e `football-recording-cycle.test.ts`.

## Contrato mínimo

Modo/protocolo versionado e intervalos de uso; ID/ordem, período, horário da primeira intenção de captura, controle, posição opcional/precisão, portador opcional naquele marco, contexto com validade e desfecho. Posses derivadas do histórico; separação de completude temporal, espacial e contextual. Não exigir todos os campos para salvar observação real.

- Controle: A/B, disputa, parada, desconhecido. Troca exige controle; A → disputa → A pode manter a cadeia, descontando disputa do tempo. A → disputa → B encerra A e inicia B quando observado.
- Parada encerra segmento; reinício da mesma equipe começa outro. Período e lacuna quebram continuidade. Primeiro marco pode ser início parcial, sem inventar recuperação.
- Chute pertence à posse e pode haver rebote/segundo chute nela. Perda e recuperação da mesma troca não contam duas vezes.
- Perda distingue origem da ação malsucedida e local do novo controle; autoria não é herdada do último portador.
- Projetar controle/posição/marcos e aplicar correção/desfazer determinísticos. Não manter contador concorrente na UI. Salvar operações compostas atomicamente.
- Preservar observações sem posição e eventos antigos. Registrar suspensão/retomada da observação separada do relógio de jogo.
- Backup local inclui os novos registros; exportação StatsBomb só os eventos reais compatíveis. Não converter marcos em passes fictícios; importações futuras e exportação precisam de versão/manifesto coerentes.

## Aceite e verificação

Testar A-disputa-A/B; parada/reinício; início/fim parcial; fim de período; rebote; perda/recuperação sem duplicata; correção antiga e desfazer; recarga; ida e volta de backup novo/antigo. Confirmar ausência de marcos como passes na exportação. Testes direcionados de domínio/integração e typecheck.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M4_DOMINIO_POSSE_E_MARCOS.md.
Execute somente M4, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
