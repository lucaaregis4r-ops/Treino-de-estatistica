# 🏐 Scout Trainer

Aplicação desktop desenvolvida como um ambiente de treinamento para **scout e registro estatístico de partidas de voleibol**.

O projeto nasceu de uma necessidade prática: eu queria treinar o trabalho de estatístico, principalmente a velocidade e a lógica de registro das ações durante uma partida, mas não tinha acesso a uma licença de softwares profissionais utilizados na área.

Em vez de tentar reproduzir integralmente uma ferramenta comercial, desenvolvi um ambiente próprio voltado para **aprendizado e prática**.

## 🎯 O que é o projeto?

O **Scout Trainer** permite simular parte do fluxo de trabalho de um estatístico de voleibol.

A ideia principal é que o usuário consiga praticar o registro de acontecimentos de uma partida por meio de códigos inseridos de forma contínua, aproximando o treino da dinâmica encontrada durante um jogo real.

O foco não está apenas em registrar estatísticas, mas em treinar:

* identificação rápida das ações;
* associação entre ação e código;
* velocidade de digitação;
* consistência no registro;
* organização das informações de uma partida;
* familiaridade com a lógica utilizada no scout de voleibol.

## 💡 Por que eu criei isso?

Meu objetivo era encontrar uma maneira de praticar scout sem depender exclusivamente do acesso a softwares profissionais.

Durante o desenvolvimento percebi que isso também era um problema interessante de programação.

Não bastava criar uma tela com alguns botões. Eu precisava pensar em como representar uma partida, como interpretar uma sequência de códigos, como armazenar as informações e como permitir que diferentes configurações de treinamento fossem utilizadas.

O Scout Trainer acabou se tornando, portanto, tanto uma ferramenta de estudo de estatística esportiva quanto um projeto de desenvolvimento de software.

## ⚙️ O que desenvolvi

Entre as principais ideias implementadas no projeto estão:

### ⌨️ Entrada contínua de códigos

O registro foi pensado para acontecer de maneira contínua, permitindo que o usuário pratique a inserção de informações sem interromper constantemente o fluxo da partida.

Isso é importante porque, em uma situação real, o estatístico precisa acompanhar o jogo ao mesmo tempo em que registra o que está acontecendo.

### 🧩 Configuração dos códigos

A estrutura foi pensada para não depender de uma única lista fixa de comandos.

Os códigos utilizados durante o treinamento podem ser organizados de acordo com o tipo de prática desejada, permitindo trabalhar diferentes níveis de complexidade e diferentes convenções de registro.

### 🏐 Organização das informações da partida

Os registros realizados durante o treino são estruturados para que não sejam apenas texto digitado na tela.

A aplicação trata essas entradas como informações pertencentes a uma sessão ou partida, permitindo manter o histórico do que foi registrado.

### 💾 Persistência local

Os dados são armazenados localmente no computador.

Isso significa que o programa não precisa enviar as informações para um servidor externo para funcionar.

### 📦 Importação e exportação em JSON

As informações podem ser exportadas em **JSON**, permitindo:

* criar backups;
* transferir dados entre computadores;
* preservar sessões de treinamento;
* reutilizar informações posteriormente;
* facilitar futuras análises dos registros.

### 🖥️ Aplicação desktop portátil

A versão `0.2.0` foi empacotada como um executável portátil para **Windows 64 bits**.

Não é necessário realizar instalação: basta baixar e executar o arquivo.

### ✨ Novidades da versão 0.2.0

* ajuda contextual durante a captura do scout;
* escalações, rotações e substituições auditáveis;
* confirmação de uma nova escalação entre sets;
* cabeçalho fixo e navegação pelo manual sem reiniciar a partida;
* análises por atleta, rotação e posição do levantador;
* distribuição e direcionamento dos ataques em P1–P6;
* exportações CSV, TXT, JSON e relatório PDF redesenhado.

Consulte o [changelog completo](CHANGELOG.md).

## 🔄 Fluxo básico

A lógica do programa pode ser resumida assim:

```text
Configuração do treino
        ↓
Definição dos códigos
        ↓
Entrada contínua durante a simulação
        ↓
Interpretação e organização dos registros
        ↓
Persistência local
        ↓
Exportação / backup em JSON
```

Uma preocupação importante durante o desenvolvimento foi separar essas responsabilidades para que novas formas de treinamento possam ser adicionadas posteriormente sem a necessidade de reconstruir toda a aplicação.

## 🧠 O que trabalhei tecnicamente neste projeto

Além da aplicação em si, o projeto foi uma oportunidade para estudar e praticar conceitos como:

* arquitetura modular;
* separação de responsabilidades;
* modelagem de eventos esportivos;
* validação de entradas;
* configuração dinâmica;
* persistência local;
* serialização de dados em JSON;
* interface para aplicações desktop;
* construção e empacotamento de aplicações;
* distribuição de um executável para usuários finais.

Uma parte especialmente interessante foi transformar uma atividade que acontece de maneira muito rápida e contínua durante uma partida em uma estrutura que pudesse ser interpretada pelo programa.

## 📥 Download

A versão portátil para Windows pode ser baixada aqui:

**Scout Trainer 0.2.0 — Windows 64 bits**

https://github.com/lucaaregis4r-ops/Treino-de-estatistica/releases/download/v0.2.0/Scout-Trainer-0.2.0-Portable.exe

O executável possui aproximadamente **84 MB**.

### Como utilizar

1. Baixe `Scout-Trainer-0.2.0-Portable.exe`.
2. Abra o arquivo.
3. Não é necessário instalar o programa.
4. Os dados serão armazenados localmente.
5. Utilize a exportação JSON para criar backups ou transferir informações.

> O Windows pode apresentar um aviso ao executar o programa porque o executável não possui certificado de assinatura digital.

## 🔐 Verificação do arquivo

SHA-256 da versão `0.2.0`:

```text
3B674982FCEC30EC2DD4174552F287D065C019CB5648F636BF0435A5F711A8EB
```

O arquivo `.sha256.txt` também está disponível junto ao executável no Google Drive.

## 🚧 Status

**Versão atual: 0.2.0**

O projeto ainda está em desenvolvimento.

Algumas possibilidades para versões futuras incluem ampliar os modos de treinamento, melhorar o feedback sobre os registros realizados e aproximar progressivamente as simulações de diferentes situações encontradas durante partidas reais.

## ⚠️ Sobre o projeto

Este é um projeto independente e educacional.

O objetivo é criar um ambiente para estudo e treinamento de scout de voleibol. O projeto não pretende substituir softwares profissionais nem representa uma versão oficial de ferramentas, federações ou organizações esportivas citadas como referência durante o estudo.

## 👨‍💻 Autor

Desenvolvido por **Lucas Regis**.

