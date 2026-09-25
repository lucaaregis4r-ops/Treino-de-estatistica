> **Versão/escopo:** Base 0.4.0; recuperação funcional de 19–20/09/2026.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

# Scout Trainer — plano de recuperação funcional para Luna

## Objetivo e limites do diagnóstico

Recuperar um fluxo utilizável de criação e registro de partidas de futebol, preservando o funcionamento do vôlei. O usuário precisa acompanhar uma partida e registrar eventos sem lutar contra o programa.

Este plano parte de duas capturas fornecidas em 19/09/2026. Não houve inspeção do código, execução do aplicativo ou confirmação de que a segunda captura pertence à partida criada na primeira. As imagens demonstram problemas visuais; as causas técnicas abaixo são hipóteses a verificar no repositório. Não inventar arquivos, componentes ou bugs confirmados.

## 1. Diagnóstico: o que precisa ser corrigido

| Evidência nas telas | Consequência | Prioridade |
|---|---|---|
| Criação com Futebol selecionado e instruções de levantador, rotação, set e líbero | Formulário não acompanha a modalidade | P0 |
| Registro com saque, set, R1 e posições P1–P6, junto de ações/contexto de posse | Se for futebol, há mistura de interfaces e possivelmente de regras; confirmar associação entre as telas | P0 |
| Área central de registro mostra uma linha, sem superfície de jogo visível | Não é possível reconhecer onde marcar origem e destino | P0 |
| Botões de ação claros com texto quase branco | Ações ficam ilegíveis; verificar estilos e estados desabilitados | P0 |
| Equipes A e B desalinhadas, uma estreita no alto e outra larga abaixo | Cadastro desperdiça espaço e exige rolagem excessiva | P1 |
| Muitos controles, painéis duplicados e texto pequeno | Operador perde atenção e tempo durante a partida | P1 |
| Quatro modos de entrada e opção de registrar ao soltar | Comportamento básico fica pouco evidente; verificar implementação de cada modo | P1 |

Não resolver a mistura apenas escondendo palavras com CSS. Não considerar build bem-sucedido prova de funcionalidade. Não começar por novas análises, Markov, animações ou decoração.

## 2. Experiência que deve existir ao final

### Criar partida

Fluxo: modalidade → equipes → configuração específica → iniciar partida.

- Modalidade ocupa uma linha própria, antes dos elencos.
- Equipes A e B aparecem em duas colunas iguais em desktop; em telas estreitas, uma abaixo da outra, ambas com largura completa.
- Cada equipe tem origem do cadastro, nome e elenco opcional. Identificar atletas por camisa e nome em linhas editáveis; permitir colagem de lista como facilidade adicional.
- Permitir scout de equipe sem cadastrar atletas. Nunca preencher jogadores fictícios silenciosamente. Dados de demonstração só com ação explícita.
- Futebol usa períodos, relógio e opções de escalação próprias. Formação e titulares podem ser informados depois; não exigir onze nomes para iniciar um scout coletivo.
- Vôlei mantém suas regras de set, rotação e líbero em formulário próprio.
- Trocar a modalidade preserva nomes/elencos compatíveis, mas limpa rascunhos exclusivos da anterior. Se houver perda de informação já preenchida, avisar antes.
- Botão “Iniciar partida” claramente visível e erros associados aos campos que precisam de correção.

### Registrar futebol

| Região | Conteúdo essencial |
|---|---|
| Cabeçalho compacto | Equipes, placar, período, relógio e estado de gravação |
| Coluna de seleção | Equipe do evento, atleta opcional e ações principais |
| Área central dominante | Campo completo, orientação e interação espacial |
| Faixa junto ao campo | Resultado, instrução atual, desfazer marcação, cancelar e registrar |
| Histórico próximo | Últimos eventos com tempo, equipe, atleta, ação e resultado; editar/desfazer |

Detalhes extensos, elenco completo, contexto tático e análises ficam em abas ou painéis secundários. Não ocupar a tela principal com dois quadros de rotação no futebol. Equipe observada, equipe do evento e posse são conceitos distintos; a interface e o estado devem distingui-los.

Adotar inicialmente um modo visual confiável: selecionar ação → preencher seus dados → marcar localização quando aplicável → confirmar. Atalhos aceleram esse mesmo fluxo. Modos alternativos existentes só permanecem acessíveis se funcionarem integralmente; os incompletos devem ficar explicitamente indisponíveis, sem remover dados ou recursos válidos do vôlei.

## 3. Etapa 1 — separar as modalidades e eliminar estados incompatíveis

### Trabalho

1. Ler AGENTS.md e identificar scripts reais de execução e verificação. Criar branch de recuperação e preservar alterações existentes do usuário.
2. Reproduzir criação de futebol e abertura dessa mesma partida. Mapear formulário, persistência, carregamento, tela de registro, ações, regras, campo e seletores de atleta. Registrar os caminhos reais encontrados.
3. Confirmar onde a modalidade se perde ou deixa de controlar a interface: valor do formulário, objeto salvo, carregamento, valor padrão, escolha de componentes e inicialização do estado.
4. Definir uma fonte autoritativa da modalidade na partida persistida. Estado ausente/ilegível não deve virar vôlei silenciosamente. Para partidas antigas, aplicar apenas migração justificável pelos dados; caso ambíguo, solicitar identificação no fluxo de recuperação.
5. Isolar configuração, estado inicial, ações, regras, superfície espacial e seletores de cada esporte. Usar a arquitetura existente quando possível; nomes como `sportConfig` ou `FootballRecorder` são sugestões, não arquivos presumidos.
6. Proibir dependências de rotação, saque ou set nos eventos de futebol. Compartilhar componentes neutros — botões, armazenamento, histórico — sem compartilhar regras incompatíveis.
7. Caso futsal/basquete ainda não tenham fluxo funcional, não apresentá-los como modalidades prontas. Preservar qualquer dado existente.

### Aceite

- Criar futebol, salvar, recarregar e abrir mantém Futebol e usa seus controles próprios.
- No fluxo de futebol não aparecem líbero, levantador, rotação R1, P1–P6, set, ace ou equipe sacando.
- Criar e abrir vôlei mantém as regras e controles esperados dessa modalidade.
- Partidas antigas ambíguas não são convertidas automaticamente nem têm dados apagados.

**Entrega:** correção estrutural, relação dos arquivos alterados e evidência dos dois fluxos. Não avançar com modalidade ainda incoerente.

## 4. Etapa 2 — recuperar campo, layout e legibilidade

### Campo

- Investigar dimensões do contêiner, altura colapsada, estilos herdados, montagem condicional, SVG/canvas e redimensionamento. A linha visível é um sintoma; a causa deve ser reproduzida.
- Renderizar superfície com limites, linha central, círculo, áreas e gols reconhecíveis. Reservar dimensões estáveis antes da primeira interação.
- Em SVG, usar sistema de coordenadas e `viewBox` coerentes; em canvas, sincronizar dimensões visuais, buffer e escala. A escolha depende da implementação real, sem impor troca de tecnologia gratuita.
- Converter ponteiro para coordenadas do campo usando o retângulo efetivamente desenhado, incluindo margens internas quando houver. Não usar coordenadas da janela diretamente.
- Manter uma única transformação entre dados e exibição. Inverter a visualização não modifica eventos armazenados. Separar orientação visual, lado físico e direção de ataque.
- Preservar a convenção espacial já definida pelo projeto e validar o adaptador StatsBomb contra a especificação oficial antes de alterá-lo. Não confundir dimensões normalizadas do provedor com metros físicos. Não alegar compatibilidade por apenas renomear campos.
- Oferecer origem/destino por cliques como fluxo padrão. Arraste pode ser complementar, com prévia, cancelamento e confirmação. Nenhum redimensionamento pode deslocar os pontos salvos.

### Layout

- Usar grid explícito, sem posicionamento absoluto para organizar os painéis principais. Eliminar espaçadores improvisados e elementos decorativos que disputem espaço com campos.
- Dar ao campo a maior região da tela. Meta inicial em desktop: cerca de dois terços da largura útil, ajustada à proporção do desenho e ao espaço real disponível.
- Validar a janela de 1366×768 mostrada nas capturas, descontando navegador e barra do sistema; validar também 1280×720 e 1920×1080. Números são alvos de teste, não garantia de área útil.
- Nessas janelas, campo inteiro, ação, resultado e confirmação devem estar acessíveis simultaneamente no fluxo básico. Recolher histórico/contexto secundário antes de reduzir tudo a letras minúsculas.
- Em janela estreita, empilhar painéis sem rolagem horizontal ou controles sobrepostos.
- Texto principal próximo de 14–16 px; secundário legível, evitando o padrão atual de microtexto. Contraste verificável nos estados normal, selecionado, foco, desabilitado e erro.
- Cor de destaque sinaliza seleção e ação principal. Resultado deve ser legível por texto/símbolo, sem depender apenas de cor. Um botão branco com texto branco nunca é aceitável, mesmo desabilitado.

### Aceite

- Campo visível ao abrir, após navegar entre abas e após redimensionar.
- Marcar centro e quatro cantos produz coordenadas coerentes dentro da tolerância de arredondamento definida; repetir após resize e inversão visual.
- Botões e rótulos podem ser lidos nas capturas em tamanho real, sem zoom.
- Cadastro apresenta duas equipes alinhadas e nenhuma instrução da modalidade errada.
- A interação básica não exige rolar entre o campo e o botão Registrar.

**Entrega:** screenshots reais antes/depois nas resoluções-alvo. Não entregar apenas mockup ou descrição do resultado esperado.

## 5. Etapa 3 — construir um ciclo de registro previsível

### Contrato de interação

Estados explícitos: escolher ação → preencher campos/localização → revisar → confirmar → evento salvo. Cancelar descarta somente o rascunho. Falha de gravação preserva o rascunho e permite tentar novamente.

| Ação | Interação mínima proposta | Regra de implementação |
|---|---|---|
| Passe | Equipe, atleta opcional, origem, destino, resultado | Recebedor opcional; sucesso não implica destino inventado |
| Condução | Equipe, atleta opcional, origem e destino | Não exigir jogador adversário |
| Finalização | Equipe, atleta opcional, origem, resultado | Destino no gol e qualificadores só se conhecidos; não exigir trajetória fictícia |
| Recuperação/interceptação | Equipe, atleta opcional e local | Evento pontual, sem destino obrigatório |
| Falta | Equipe infratora, atleta opcional e local quando conhecido | Não criar automaticamente gol ou posse sem regra definida |
| Substituição | Equipe e atletas envolvidos, quando identificados | Não exigir clique no campo; tratar elenco incompleto sem inventar identidade |

Essa tabela define UX mínima, não um esquema de exportação. Confirmar catálogo real, campos obrigatórios e mapeamentos no projeto. Preservar eventos adicionais já implementados que tenham fluxo correto.

- Rótulos claros (“Completo”, “Incompleto”, “Gol”, conforme a ação) substituem códigos de qualidade próprios do vôlei no futebol.
- Instrução contextual: “Marque a origem do passe”, depois “Marque o destino”. Mostrar visualmente ponto, seta e seleção atual.
- Disponibilizar “Desfazer marcação”, “Cancelar evento” e “Desfazer último evento” com funções distintas.
- Enter confirma apenas um rascunho válido e não interfere em campos de texto. Escape cancela rascunho. Atalhos não disparam quando o foco está em entrada de texto.
- Um clique/Enter não pode gerar dois eventos. Registrar ao soltar começa desligado e só pode ser ativado se passar pelos mesmos validadores.
- Ao salvar, adicionar imediatamente ao histórico e limpar localização, resultado e qualificadores do rascunho. Preservar somente escolhas persistentes intencionais, como equipe observada.
- Permitir “Sem atleta identificado” como ausência explícita; não inventar jogador #0. O exportador trata limites do formato de destino sem declarar compatibilidade falsa.
- Trocar tipo de ação limpa campos incompatíveis. Cancelar ou falhar na gravação não altera placar, posse ou relógio.
- Relógio de futebol permite iniciar, pausar, ajustar e trocar período. Preservar período e tempo dos eventos. Ao recarregar, recuperar o estado por referência temporal persistida, conforme a política escolhida, sem zerar ou avançar silenciosamente.
- Gol confirmado altera placar uma vez. Editar/excluir esse evento reconcilia placar. Ajuste manual de placar deve ficar distinguível do registro de gol.
- Tratar posse como estado explícito e corrigível. Não assumir que cada passe inicia uma posse nem que toda falta a encerra. Sem tracking, não exigir localização dos 22 atletas.

### Aceite

Registrar uma sequência: recuperação → passe completo → condução → passe incompleto → recuperação adversária → finalização para fora. Acrescentar gol, desfazer gol e confirmar restauração do placar. Repetir um evento sem atleta. Cancelar um passe incompleto. Editar um evento anterior e recarregar.

Todos devem aparecer uma única vez, com equipe, período, tempo, tipo, resultado e localização corretos quando aplicáveis. Eventos pontuais não pedem destino. Ações administrativas não pedem trajetória.

**Entrega:** fluxo demonstrável e testes focados nas transições, duplicação e consistência do placar.

## 6. Etapa 4 — dados confiáveis e compatibilidade verificável

- Auditar esquema atual antes de modificá-lo. Fazer migração versionada quando necessária, preservando dados e mantendo forma de recuperação.
- Cada evento recebe ID estável, modalidade, partida, sequência e tempo esportivo. Horário de gravação não substitui tempo da partida.
- Coordenadas ausentes permanecem ausentes; nunca usar centro do campo como preenchimento automático.
- Edição/exclusão atualiza projeções dependentes: placar, posse, totais e visualizações. Definir fonte de verdade para não manter contadores contraditórios.
- Testar persistência real: salvar partida, fechar/reabrir e comparar eventos e localização. Mostrar falha de armazenamento, sem anunciar sucesso inexistente.
- Conferir o contrato StatsBomb já presente no projeto e sua documentação oficial atual. Manter representação interna e adaptadores claramente definidos, incluindo equipe, atleta, ação, tempo, posição e resultados.
- Documentar o subconjunto exportável, campos sem equivalência e metadados extras. Dados desconhecidos não devem virar fatos fabricados para satisfazer exportação.
- Usar fixture real autorizada ou amostra mínima documentada para validar mapeamentos. Testar ida e volta somente nos campos que o contrato declara preserváveis; relatório deve explicitar perdas.
- Separar dados observados das probabilidades/modelos importados. Recuperar usabilidade primeiro; não alterar Markov, xG ou parâmetros de referência como efeito colateral do conserto de interface.

### Aceite

Uma partida com os eventos da etapa anterior sobrevive a reabertura. Exportação identifica modalidade e versão. Adaptador possui validação do subconjunto declarado; incompatibilidades ficam explícitas, sem falsa promessa de intercâmbio completo.

## 7. Etapa 5 — validação operacional e regressão

Executar um roteiro manual de aproximadamente dez minutos, preferencialmente acompanhando um trecho de jogo. Registrar dificuldades de uso, não apenas exceções no console.

| Cenário | Resultado necessário |
|---|---|
| Futebol sem elenco | Inicia e registra evento coletivo sem dados fictícios |
| Futebol com elenco | Seleção por camisa/nome legível; atleta pertence à equipe correta |
| 20 eventos variados | Nenhuma duplicação; rascunhos limpos e histórico conferível |
| Cancelamento e edição | Sem efeitos residuais no placar, localização ou posse |
| Resize/inversão visual | Campo e pontos continuam alinhados; coordenadas salvas preservadas |
| Reabertura | Mesma modalidade, eventos, placar e estado temporal conforme política |
| Falha de persistência simulada | Erro visível; rascunho recuperável; nenhuma confirmação falsa |
| Vôlei existente | Registro, rotação, saque, set e campo continuam funcionais |
| Janelas-alvo | Nenhum botão ilegível, sobreposição ou campo colapsado |

Automatizar somente verificações com risco concreto: seleção/persistência de modalidade, validação por ação, transformação espacial, duplicação, desfazer gol e regressão de vôlei. Executar os checks existentes exigidos pelo repositório. Evitar testes que apenas repetem detalhes de implementação.

## 8. Regras de entrega para Luna

1. Executar na ordem; concluir e verificar cada etapa antes de avançar.
2. Apresentar evidência de execução: comando utilizado, resultado, screenshot real quando houver mudança visual e limitações restantes.
3. Se não puder abrir navegador ou testar uma interação, declarar exatamente o que ficou sem validar. Nunca substituir evidência por “deve funcionar”.
4. Não reescrever o projeto inteiro, introduzir dependências pesadas ou eliminar recursos válidos para simplificar a entrega.
5. Não mexer em análises para disfarçar dados inconsistentes. Não declarar uma modalidade pronta só porque aparece no seletor.
6. No encerramento, informar problema corrigido, arquivos efetivamente alterados, verificações realizadas e pendências reais.

## Prompt pronto para iniciar a execução

> Recupere a funcionalidade do Scout Trainer seguindo este plano. Primeiro leia AGENTS.md e inspecione o repositório real. As capturas mostram Futebol no cadastro com campos de vôlei, layout quebrado, botões ilegíveis e superfície espacial não visível. Confirme cada causa no código e reproduza a abertura da mesma partida antes de concluir que o registro ignora a modalidade. Execute as cinco etapas em sequência, com verificação ao fim de cada uma. Priorize separação das regras esportivas, campo visível e preciso, fluxo de registro completo, persistência e regressão do vôlei. Preserve a convenção espacial e o contrato StatsBomb existentes, validando-os antes de mudar adaptadores. Não invente atletas ou coordenadas; permita scout sem atleta. Não considere compilação suficiente: demonstre uma partida de futebol criada, eventos registrados, gol desfeito e dados recuperados após recarga. Apresente screenshots reais nas resoluções-alvo e diga claramente se alguma verificação não pôde ser executada. Continue até cumprir os critérios de aceite; peça esclarecimento apenas se houver uma decisão material que o código e este plano não resolvam.
