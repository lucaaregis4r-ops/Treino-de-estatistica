# Scout Trainer 0.45 — pacote de implementação para Luna

## Missão da versão

A 0.45 é uma versão de **consolidação + inteligência analítica**, não uma reescrita do Scout Trainer.

O projeto já possui uma base madura de voleibol: quatro modos de registro, evento canônico, rally/rotação, replay determinístico, persistência IndexedDB, dados espaciais, analytics, probabilidade estimada de vitória, análises salvas e exportação. A 0.45 deve usar essa base para responder perguntas de **sequência + espaço**, especialmente:

- quais estados e ações aumentaram a probabilidade de ganhar o rally;
- quais transições aparecem antes de um ponto ou erro;
- como recepção, rotação, fase, atleta e contexto alteram o desfecho;
- **para quais áreas a recepção levou a bola quando o sideout/rally win foi maior**;
- **para onde sacar esteve associado a maior breakpoint**;
- **quais origens, destinos e trajetórias de ataque tiveram maior valor observado**;
- quais sequências têm maior ou menor valor;
- como explicar essas leituras em linguagem natural sem entregar o cálculo ao LLM.

Decisão central: o `x,y` **não vira stateId bruto**. Coordenadas, regiões e trajetórias são contexto analítico usado para condicionar/segmentar o Markov e produzir mapas de valor com `n`, baseline e delta.

A versão também cria uma camada **BYOK (Bring Your Own Key)** opcional para Gemini. A IA recebe somente resultados analíticos já calculados pelo sistema e os interpreta. Ela **não calcula placar, Markov, eficiência, rotação ou probabilidade**.

Basquete, futsal e futebol não são implementados nesta versão. A 0.45 só evita decisões que tornem impossível reaproveitar o núcleo sequencial depois.

## Fonte de verdade

1. Código executável atual.
2. Testes atuais.
3. `CHANGELOG.md`.
4. `docs/scout-trainer-interface-0.4/ENTREGA.md` e `VALIDACAO.md`.
5. Este pacote.
6. Planos históricos somente como contexto.

Não reconstruir algo apenas porque um plano antigo diz que está ausente.

## Regra de execução para Luna

Executar **uma macroetapa por solicitação**.

Antes de editar:
- ler ` AGENTS.md` (há um espaço inicial no nome);
- verificar `git status`;
- ler somente os arquivos indicados na etapa;
- confirmar se a funcionalidade já existe.

Durante:
- não atualizar dependências sem necessidade;
- não executar `npm install` se `node_modules` já estiver válido;
- não formatar o repositório inteiro;
- não alterar schema/banco se a etapa não exigir;
- não mover arquitetura existente;
- preferir funções pequenas, puras e testáveis.

Depois:
- rodar somente testes direcionados + `typecheck`;
- rodar build apenas nas etapas indicadas;
- atualizar `STATUS_0_45.md`;
- parar. Não começar a etapa seguinte.

## Versão

Nome de produto/roadmap: **0.45**.

Se o projeto seguir SemVer no `package.json`, o fechamento pode usar `0.4.5`. Não alterar versão antes da etapa final.

## Fora de escopo

- análise automática de vídeo;
- visão computacional;
- criação do núcleo completo de futebol/futsal/basquete;
- banco remoto/cloud;
- autenticação;
- sincronização multiusuário;
- substituir IndexedDB;
- treinar modelo de IA;
- enviar eventos crus ou nuvem bruta de coordenadas para IA por padrão;
- tornar a IA obrigatória;
- calibrar uma previsão universal de vitória com dados externos inexistentes.
