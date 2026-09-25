# Relatório de piloto M6 — operação por posse

**Data de preparação:** 21/09/2026

**Estado:** Pendente de piloto humano. Este documento é o protocolo e o registro de evidências; não declara viabilidade operacional.

**Revalidação técnica T10:** 23/09/2026. O software foi verificado tecnicamente; o piloto humano continua pendente e este continua sendo o único relatório de piloto.

## Fonte e bloqueio atual

Não há, neste checkout, um trecho de futebol de 10–15 minutos identificado como autorizado para uso no piloto (a busca por `mp4`, `mov`, `mkv`, `webm`, `avi` e `m4v` não encontrou mídia). Há agora relato qualitativo do usuário sobre excesso de informações e baixa praticidade; não foram fornecidas medidas de um trecho em velocidade normal.

Por isso, nenhuma contagem, taxa de omissão, atraso ou conclusão abaixo foi preenchida. Os testes automatizados de M5 confirmam comportamento técnico, mas não substituem este piloto.

## Revalidação técnica T10 — 23/09/2026

As regressões de criação/reuso, coleta por posse, transições/finalizações, pressão, revisão voluntária e cadastro foram executadas com êxito; a bateria dirigida de domínio/integridade aprovou 27 testes e a rechecagem posterior de sugestões/cadastro aprovou 9. Typecheck, lint dirigido, build e inspeção automatizada de 1366×768, 1024×768, 390×844 e 320×844 encerraram sem diagnóstico. As capturas estão em `output/posse-v0.5/`; a medição `automated-timings.json` identifica-se como latência Playwright e não representa tempo, esforço nem usabilidade do operador.

Esses fatos verificam software, persistência e responsividade automatizada. Eles não preenchem nenhuma métrica desta tabela, não demonstram operação em velocidade normal e não constituem aceite operacional. A ausência de mídia autorizada e de operador humano permanece; manter o estado **Verificada tecnicamente / Aguardando piloto** até a execução do protocolo abaixo.

## Feedback qualitativo recebido — 21/09/2026

O usuário relata registro tumultuado, muitas informações/janelas e pouca praticidade. Solicita reformulação completa em torno de posse, deslocamento e finalizações. Isso é evidência de insatisfação com a usabilidade, embora não seja um piloto cronometrado. A decisão foi reabrir M5, retirar formulários da coleta e preparar plano/prévia antes de alterar o aplicativo. M6 deve avaliar a tela reformulada; não insistir na tela anterior apenas porque passou em E2E.

## Material necessário antes da execução

- Um trecho autorizado de 10–15 minutos, com circulação, mudança de controle, parada e ao menos uma finalização, ou registro observacional equivalente com referências temporais.
- Um operador que não tenha treinado especificamente o trecho de comparação; se houver segundo trecho, que seja comparável e diferente do primeiro.
- Navegador local com a aplicação e relógio visível; não pausar durante a primeira coleta.
- Este arquivo aberto para registrar dados agregados, sem nomes pessoais desnecessários.

## Protocolo de coleta

1. Registrar a fonte, intervalo do trecho, duração efetiva, resolução/qualidade e limitações de relógio/vídeo na tabela A.
2. Na primeira passagem, assistir em velocidade normal e sem pausar. Registrar início/troca de controle, chegada relevante a terço/corredor/área, perda e chute. Não registrar todos os passes nem movimentos laterais de baixo valor.
3. Anotar cada instante em que o operador deixa de olhar o jogo para operar a interface, cada bloqueio/fila visível e cada correção posterior.
4. Na revisão pausada, usar as referências do vídeo para contar chutes, trocas, perdas e marcos observáveis; distinguir “não observável no vídeo” de “omitido pelo operador”.
5. Se houver ajuste estritamente motivado por essa observação, repetir todo o protocolo em um segundo trecho comparável. Não atribuir melhora à interface quando o operador apenas memorizou o primeiro trecho.
6. Executar, separadamente, o cenário breve de menus/cadastro: criar partida de futebol e de vôlei, colar lista, corrigir uma camisa e reutilizar uma equipe. Registrar êxito/falha e dificuldade, sem misturá-lo às métricas da coleta por posse.

## Medidas e fórmulas

| Medida | Como contar | Resultado A | Resultado B (após ajuste, se houver) |
|---|---|---:|---:|
| Duração efetiva | segundos assistidos em velocidade normal | Não executado | — |
| Posses observadas | segmentos de controle iniciados ou trocados explicitamente | Não executado | — |
| Interações por minuto | cliques/toques/atalhos realmente efetuados, incluindo navegação e correções, dividido pelos minutos do trecho | Não executado | — |
| Interações por posse | interações, dividido pelas posses observadas | Não executado | — |
| Atraso de captura | diferença entre referência do vídeo e timestamp do marco/ação; informar mediana e máximo | Não executado | — |
| Chutes omitidos | chutes na revisão que não existem no histórico da primeira passagem | Não executado | — |
| Trocas omitidas | trocas na revisão que não existem no histórico da primeira passagem | Não executado | — |
| Correções | alterações feitas após a primeira passagem, com motivo | Não executado | — |
| Cobertura de início/fim/marcos | por posse: início conhecido, fim conhecido e ao menos um marco espacial, cada qual com seu denominador | Não executado | — |
| Fila persistente | registros ainda pendentes após o trecho, com duração e recuperação | Não executado | — |

Não definir nesta preparação um limiar numérico artificial para atraso aceitável. A meta provisória do piloto é nenhum chute omitido no trecho e nenhuma fila persistente; o atraso tolerável deve ser acordado a partir dos dados e da percepção do operador.

## Tabela A — identificação e observabilidade do trecho

| Campo | Registro |
|---|---|
| Fonte/autorização | Pendente de fornecimento pelo usuário/operador |
| Intervalo do trecho | Pendente |
| Duração | Pendente |
| Qualidade e limitações do vídeo/relógio | Pendente |
| Eventos usados na revisão | Pendente |
| Eventos não observáveis com segurança | Pendente |

## Registro qualitativo e decisões

| Momento/referência | O que dificultou | O operador deixou de olhar o jogo? | Consequência na coleta | Ajuste testado |
|---|---|---|---|---|
| Pendente de piloto | — | — | — | — |

Se houver sobrecarga, a primeira intervenção deve reduzir granularidade espacial, detalhes opcionais ou acesso aos controles, preservando controle, perdas e chutes. Não preencher automaticamente atleta, passe ou trajetória para compensar omissões. Uma mudança de contrato deve ser registrada na etapa M4; contexto tático adicional pertence à M7 e não é parte deste piloto.

## Cenário curto de menus e cadastro

| Cenário | Resultado | Dificuldade percebida / observação |
|---|---|---|
| Futebol: criar partida e chegar ao registro | Pendente | — |
| Vôlei: criar partida e chegar ao registro | Pendente | — |
| Colar lista e revisar prévia | Pendente | — |
| Corrigir camisa | Pendente | — |
| Reutilizar equipe em nova partida | Pendente | — |

## Conclusão

**Não demonstrada.** Falta o trecho autorizado e a execução por operador humano. M7 não está elegível enquanto este relatório não contiver evidência operacional suficiente ou o usuário não revisar explicitamente esse requisito.
