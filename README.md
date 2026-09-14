Scout Trainer

Scout de voleibol local, visual, configurável e open source.

O Scout Trainer é uma aplicação para registro, treinamento e análise de partidas de voleibol, criada para tornar o trabalho de scout mais acessível sem depender obrigatoriamente de plataformas comerciais.

O projeto combina diferentes formas de registrar uma partida — por códigos, interface visual ou gestos sobre a quadra — com reconstrução do estado do jogo, análises estatísticas, dados espaciais e exportação dos registros.

A aplicação funciona em arquitetura local-first: as partidas ficam armazenadas no próprio dispositivo e continuam acessíveis mesmo sem conexão com a internet.

Versão atual: 0.4.0

Por que o Scout Trainer existe?

Softwares profissionais de scout são extremamente poderosos, mas normalmente exigem treinamento específico, licenças comerciais ou uma rotina de registro bastante rígida.

O Scout Trainer nasceu como uma ferramenta de treinamento de códigos e evoluiu para experimentar uma pergunta mais ampla:

É possível registrar uma partida de voleibol de forma rápida e intuitiva sem abrir mão de dados táticos e estatísticos mais profundos?

Por isso, o projeto tenta combinar duas ideias:

registrar o mínimo necessário durante o rally;

enriquecer e analisar os dados posteriormente.

O objetivo não é substituir soluções profissionais, mas criar uma alternativa aberta para treinadores, analistas, estudantes, pesquisadores e profissionais do esporte.

O que já existe

Quatro formas de registrar uma partida

O Scout Trainer permite trabalhar com diferentes níveis de velocidade e detalhamento.

Digitado

Registro contínuo por códigos de scout.

Ideal para:

treinamento de operadores;

quem já utiliza códigos de voleibol;

registro rápido por teclado;

partidas com grande volume de ações.

Exemplo:

*08S# a05R+ a12A#

O sistema interpreta os códigos, registra os eventos e atualiza automaticamente o contexto da partida.

Visual

O operador registra a ação diretamente pela interface.

É possível informar:

fundamento;

qualidade;

atleta;

origem;

destino;

direção;

contexto tático.

A quadra utiliza coordenadas contínuas, permitindo análises espaciais posteriores.

Híbrido

Combina a velocidade da digitação com o enriquecimento visual.

O usuário pode registrar o núcleo da ação por código e complementar informações como:

trajetória;

zona;

direção;

tipo de ataque;

contexto tático.

Gestual

O modo gestual foi desenvolvido pensando principalmente em touch, tablet, caneta e mouse.

Em vez de preencher diversos campos, o operador pode representar a trajetória da bola diretamente sobre a quadra.

O fluxo utiliza o próprio contexto do rally para sugerir:

equipe da ação;

atleta provável;

saque;

recepção;

ataque;

rotação atual.

O levantamento pode ser tratado implicitamente quando o contexto permite, reduzindo a quantidade de ações necessárias durante rallies rápidos.

Registro espacial

A quadra não funciona apenas como ilustração.

Cada trajetória pode gerar dados de:

origem → destino

Isso permite construir análises como:

origem dos ataques;

destino dos ataques;

regiões de recepção;

distribuição espacial;

mapas de calor;

direção das ações;

padrões por atleta;

padrões por rotação.

Também existe uma área externa à quadra para representar bolas para fora sem criar coordenadas inválidas.

Contexto real da partida

O Scout Trainer não trata cada ação como um registro isolado.

O sistema mantém o estado da partida, incluindo:

set;

placar;

equipe sacadora;

rotação;

posições P1–P6;

atletas em quadra;

levantador;

substituições;

rally atual;

histórico de eventos.

O objetivo é utilizar informações que já podem ser derivadas da partida em vez de exigir que o operador as informe repetidamente.

Rotação e atletas

A aplicação possui cadastro reutilizável de:

atletas;

equipes;

escalações.

Durante a partida, o sistema acompanha a rotação e apresenta os atletas nas posições regulamentares:

P4  P3  P2
P5  P6  P1

O levantador é identificado no contexto da rotação e pode ser utilizado posteriormente nas análises.

Substituições também são registradas no histórico da partida.

Correção sem perder o histórico

Erros durante um scout são inevitáveis.

Por isso, o Scout Trainer utiliza um histórico de eventos que permite:

corrigir;

desfazer;

refazer;

reconstruir o estado da partida.

A intenção é preservar a rastreabilidade das alterações sem precisar reescrever toda a partida.

Análises

A aplicação já possui diferentes níveis de análise.

Estatísticas tradicionais

Entre as métricas disponíveis estão indicadores relacionados a:

saque;

recepção;

ataque;

bloqueio;

sideout;

breakpoint;

distribuição do levantador;

desempenho por rotação;

eficiência por atleta.

Analytics espaciais

Os registros realizados sobre a quadra podem ser filtrados por:

fundamento;

atleta;

qualidade;

set;

posição do levantador;

origem;

destino.

A mesma seleção pode ser visualizada como:

pontos;

jogadas;

heatmap.

Probabilidade de vitória

O Scout Trainer também possui uma estimativa de probabilidade baseada no estado do placar.

É possível acompanhar:

probabilidade estimada do set;

probabilidade estimada da partida;

evolução ao longo dos rallies;

impacto das mudanças de placar.

Esses valores devem ser interpretados como estimativas, e não como previsões absolutas.

O modelo será aprimorado conforme o projeto ganhar uma base histórica maior de partidas.

Filosofia do projeto

Alguns princípios orientam o desenvolvimento do Scout Trainer.

Local-first

Os dados pertencem ao usuário.

O funcionamento principal não depende de servidor externo.

Evento como fonte de verdade

As análises são derivadas do histórico da partida.

A interface não é responsável por calcular as estatísticas.

Símbolo não é significado

Códigos como:

#
+
-
=

são formas de entrada.

Internamente, o projeto busca representar o significado esportivo dessas ações de maneira estruturada.

Registrar rápido primeiro

O sistema tenta inferir automaticamente tudo aquilo que pode ser conhecido pelo contexto.

Detalhes adicionais podem ser registrados quando forem realmente úteis.

Estatística antes de IA

A evolução planejada do projeto segue um princípio simples:

IA pergunta. Analytics calcula. IA interpreta.

Modelos de linguagem poderão futuramente ajudar o usuário a explorar os dados, mas os cálculos estatísticos permanecerão determinísticos dentro da aplicação.

Próximas evoluções

A versão 0.4 consolidou principalmente a interface, o registro visual e o registro gestual.

As próximas versões devem aprofundar a parte analítica.

0.45 — Analytics & Capture Foundation

Planejado:

normalização semântica dos eventos;

reconstrução completa de rallies;

análise sequencial;

cadeias de Markov;

probabilidade de vencer o rally a partir de diferentes estados;

valor estimado de cada ação;

identificação de sequências recorrentes;

comparação de padrões por rotação e contexto;

apresentação de tamanho de amostra e incerteza das estimativas.

Uma das ideias centrais será analisar não apenas ações isoladas, mas a construção do ponto.

Exemplo:

Saque
  ↓
Recepção
  ↓
Levantamento
  ↓
Ataque
  ↓
Defesa
  ↓
Contra-ataque

Evoluções futuras

O projeto também está sendo preparado para estudar:

Dados de performance

Possível integração entre:

scout;

treino;

carga;

PSE;

recuperação;

participação do atleta.

Outros esportes

A arquitetura poderá futuramente servir como base para módulos de:

futebol;

futsal;

basquete.

A ideia não é tratar todos os esportes da mesma maneira, mas compartilhar conceitos como:

Evento
Sequência
Estado
Transição
Atleta
Equipe
Tempo
Contexto

No voleibol, uma sequência é principalmente um rally.

Nos esportes de invasão, poderá ser uma posse.

Assistente de IA

Também está prevista uma camada opcional em que o usuário poderá utilizar seu próprio provedor de IA para fazer perguntas sobre os dados.

Exemplo:

Qual rotação apresentou maior dificuldade de sideout?

ou:

Quais sequências mais frequentemente terminaram em ponto depois de uma recepção positiva?

O modelo de IA não calculará a estatística. Ele consultará os resultados produzidos pelo motor analítico do Scout Trainer.

Vídeo

Análise de vídeo também é uma possibilidade futura.

A ideia inicial é relacionar eventos e timestamps antes de explorar reconhecimento automático de ações.

Fluxo básico

Cadastros
   ↓
Partida
   ↓
Registro
 ┌───────┬────────┬─────────┬─────────┐
Digitado Visual  Híbrido   Gestual
 └───────┴────────┴─────────┴─────────┘
   ↓
Histórico de eventos
   ↓
Resumo
   ↓
Análise
   ↓
Exportação

Persistência

Os dados são armazenados localmente utilizando IndexedDB.

Atualmente são preservados dados como:

atletas;

equipes;

partidas;

eventos;

rotações;

configurações;

snapshots analíticos.

A arquitetura foi construída para permitir reconstrução do estado da partida a partir do histórico.

Exportação

Dependendo do fluxo utilizado, o Scout Trainer pode gerar dados e relatórios em formatos como:

JSON;

CSV;

TXT;

PDF.

Para análises mais aprofundadas, os formatos estruturados como CSV e JSON são normalmente os mais indicados.

Tecnologias

O projeto utiliza principalmente:

TypeScript

React

Vite

Electron

IndexedDB

Recharts

Vitest

Playwright

A aplicação também possui suporte a funcionamento como PWA.

Desenvolvimento

Clone o repositório e instale as dependências:

npm install

Execute em desenvolvimento:

npm run dev

Verificação de tipos:

npm run typecheck

Build de produção:

npm run build

Testes:

npm test

Testes end-to-end:

npm run test:e2e

Estrutura geral

O projeto separa domínio, aplicação, infraestrutura e interface.

src/
├── application/
├── core/
├── domain/
│   ├── analytics/
│   ├── match/
│   ├── rally/
│   ├── scout/
│   ├── statistics/
│   └── training/
├── infrastructure/
├── profiles/
└── ui/

A intenção é manter regras esportivas e estatísticas independentes da interface.

Download

O código-fonte mais recente está disponível neste repositório.

Builds portáteis podem ser disponibilizados na área de Releases conforme novas versões forem estabilizadas.

Caso queira apenas testar ou estudar o projeto, também é possível executá-lo diretamente pelo ambiente de desenvolvimento.

Estado do projeto

O Scout Trainer está em desenvolvimento ativo.

A versão 0.4 representa uma etapa importante de consolidação do registro visual e gestual, mas ainda existem pontos de interface, testes de fluxo e refinamentos que continuarão sendo trabalhados antes das próximas grandes evoluções.

Consulte o CHANGELOG.md para acompanhar as mudanças entre as versões.

Os planos técnicos e documentos de implementação ficam disponíveis na pasta docs/.

Sobre

O Scout Trainer é um projeto independente e open source voltado à experimentação de novas formas de registrar e analisar dados esportivos.

Não possui vínculo oficial com Data Volley, federações, confederações ou organizações esportivas.

O objetivo é aprender, experimentar e desenvolver ferramentas que possam ser úteis para quem trabalha com esporte e dados.

Desenvolvido por Lucas Regis.



