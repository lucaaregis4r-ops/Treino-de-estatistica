# T07 — Completar e corrigir quando houver tempo

**Versão:** 0.5 proposta. **Dependência:** T04/T06. **Resultado:** sugestões úteis com resposta voluntária e correção rastreável.

## Entradas de código

Contratos/serviços T03, candidatos T06, navegação de partida em `src/ui/app/App.tsx`, histórico e ações detalhadas existentes, `src/ui/screens/scout/football/FootballShotPanel.tsx` e componentes de contexto quando reutilizáveis.

## Implementar

1. Abrir revisão somente por ação explícita, em composição separada da coleta, integrada à navegação existente. Mostrar o trecho original com horários/posse e motivo. Retorno direto ao vivo preserva controle/relógio; abrir revisão não pausa coleta silenciosamente. Se operador pausar, registrar lacuna.
2. Oferecer **Descrever trecho**, **Não consegui observar**, **Ignorar**. Sem pergunta sequencial automática. Ignorar/não observado são estados distintos e reversíveis; nenhum cria ação.
3. Descrição pode conter mais de uma ação: passe, condução, domínio/recepção. Passe e domínio não são alternativas excludentes. Campos opcionais por ação, com autores por papel: passador/receptor, condutor, recebedor.
4. Elenco real com nomes/camisas acessíveis; ID da inscrição preservado. Autor desconhecido permitido. Jogador do ponto serve só como referência, nunca autoria pré-preenchida silenciosamente. Não exigir passe para registrar domínio.
5. Salvar somente o que foi observado, em uma confirmação explícita. Posição/hora do trecho não viram origem/destino/segundo exatos de cada ação. Guardar intervalo e precisão; oferecer refinamento voluntário. Confirmar uma ação não certifica completude da sequência.
6. Correção de detalhes existentes: pressão pontual, saída/estrutura, causa da perda e atleta quando identificado, roubada e finalização. Causa, responsável pela perda e recuperador são papéis distintos e opcionais. Detalhar chute não depende de preencher dados táticos.
7. Semântica de perda: passe errado/interceptado/fora, desarme, erro de domínio, outra/não observada, usando enum real compatível. Bola fora/parada não garante controle adversário. Não inventar culpado por ser o último portador.
8. Resposta idempotente e ligada à fonte; corrigir fonte invalida dependentes conforme T03. Resultado antigo não modifica controle atual. Anotação e evento confirmado não contam duas vezes. Falha mantém rascunho recuperável.

## Aceite e testes

Passe seguido de domínio por outra pessoa; várias ações; autor ausente; correção de perda sem posição; chute pendente; candidato ignorado; salvar duas vezes; fonte corrigida; volta à partida atual; reload/backup. Testar não contagem de candidatos e ações invalidadas, typecheck e inspeção real. Revisão útil sem sobrecarregar coleta.

## Limites e passagem

Sem reconstrução automática de passes, assistência presumida, episódio contínuo de pressão ou ranking. Liberar destino da sugestão de T06 apenas quando funcional. Atualizar T07; próxima T08.
