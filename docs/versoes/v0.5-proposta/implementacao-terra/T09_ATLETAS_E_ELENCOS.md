# T09 — Cadastro simples e reutilização de elencos

**Versão:** 0.5 proposta. **Dependência:** T08; base M2 parcial/M3 entregue. **Resultado:** terminar e verificar fluxo comum às duas modalidades. Não refazer cadastro que já atende ao aceite.

## Entradas de código

`src/ui/screens/registrations/RegistrationsScreen.tsx`, `AthleteRosterDraft.ts`, CSS/testes associados; `src/ui/screens/match-setup/NewMatchScreen.tsx`/testes; `src/domain/match/entities/Registration.ts`; `src/application/ScoutTrainerService.ts`; repositórios e testes de integração de cadastro.

## Concluir editor

- Linha por atleta: Camisa, Nome, Posição/função opcional, Remover. Sem sintaxe de vírgulas/espaços obrigatória. Adicionar linha por botão/Enter; Tab navega. Enter durante composição de texto ou seletor aberto não salva a partida indevidamente.
- Salvar e adicionar próximo mantém equipe/modalidade. Nomes compostos, acentos, hífens e apóstrofos preservados. Aparar espaço excedente sem usar nome como identidade. Homônimos permitidos; não fundir por nome.
- Funções de vôlei distintas das posições do futebol. Camisa pode faltar no cadastro permanente; duplicada na mesma inscrição/elenco de partida é conflito, entre equipes é válida.
- Colar lista/TSV com prévia editável: número+nome por linha, ponto e vírgula, colunas tabuladas, espaços extras/CRLF/linhas vazias, nomes sem camisa. Delimitador antigo só por opção explícita; vírgula dentro de nome não fragmenta silenciosamente.
- Ambiguidade e linhas inválidas ficam visíveis; não descartar nem inventar número. Falha no lote tem recuperação/transação idempotente; retry não duplica o já salvo. Não instalar biblioteca de planilha para TSV.

## Verificar criação e reuso

Modalidade → equipes existentes ou cadastro rápido → revisar → iniciar. Mesmo editor, objetos diretos sem serializar elenco para texto e parsear novamente. Alteração para esta partida não reescreve jogos antigos/cadastro permanente. Salvar equipe reutilizável é explícito e não duplica por partida.

Futebol pode iniciar sem elenco/11 atletas; desconhecido não cria atleta fictício. Vôlei conserva escalação/rotação/líbero exigidos pelo modo, sem atribuir funções pelos seis primeiros cadastrados. Troca de modalidade preserva campos compatíveis e protege dados incompatíveis de descarte silencioso.

## Aceite e testes

Cadastrar ambas as modalidades sem vírgulas, colar/corrigir lista, testar homônimos, números conflitantes, falha/retry, recarga/IDs e teclado/toque. Reutilizar elenco na segunda partida; mudar camisa sem alterar primeira. Futebol sem elenco, vôlei com lineup válido. Verificar rascunhos e backups se schema mudar. Typecheck/testes dirigidos e inspeção. Atualizar T09; próxima T10.
