<div align="center">
  <img src="public/icons/scout-trainer-192.png" width="112" alt="Scout Trainer" />

# Scout Trainer

### Scout de voleibol local, visual e orientado por dados

Registre a partida do jeito que fizer mais sentido — **digitando códigos, tocando na interface ou desenhando trajetórias na quadra** — e transforme o histórico do jogo em informação tática e estatística.

<br />

![Versão](https://img.shields.io/badge/vers%C3%A3o-0.4.0-5b5bd6?style=for-the-badge)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b?style=for-the-badge)
![Local first](https://img.shields.io/badge/local--first-offline-16a34a?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-React-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-desktop-47848f?style=for-the-badge&logo=electron&logoColor=white)

<br />

[**Visão geral**](#-visão-geral) · [**Registro**](#-quatro-formas-de-registrar) · [**Análises**](#-análises) · [**Roadmap**](#-roadmap) · [**Desenvolvimento**](#-desenvolvimento)

</div>

---

## 🏐 Visão geral

O **Scout Trainer** é uma aplicação para **registro, treinamento e análise de partidas de voleibol**.

O projeto começou como uma ferramenta para praticar códigos de scout e evoluiu para uma plataforma experimental de dados esportivos: além do registro tradicional por teclado, hoje é possível trabalhar com **entrada visual, modo híbrido, registro gestual, rotação, contexto da partida, trajetórias espaciais, heatmaps e analytics**.

A pergunta que guia o projeto é simples:

> **Como registrar uma partida com velocidade sem abrir mão de contexto, rastreabilidade e profundidade analítica?**

A resposta do Scout Trainer é tentar pedir menos durante o rally e aproveitar melhor aquilo que o próprio estado da partida já permite inferir.

### Para quem ele pode ser útil?

| | |
| --- | --- |
| 🧑‍🏫 **Treinadores** | Registro e leitura tática sem depender de uma estrutura pesada. |
| 📊 **Analistas** | Dados espaciais, filtros, métricas e exportações estruturadas. |
| 🎓 **Estudantes** | Ambiente para aprender scout, estatística e análise esportiva. |
| 🧪 **Pesquisadores** | Base local e auditável para experimentação com dados de voleibol. |
| ⌨️ **Operadores de scout** | Treino de velocidade, consistência e leitura do jogo. |

---

## ✨ O que já existe na 0.4

<table>
<tr>
<td width="50%" valign="top">

### 🎯 Registro contextual

- placar, set e equipe sacadora;
- rotação P1–P6;
- atletas em quadra;
- levantador ativo;
- substituições;
- rally atual;
- histórico reconstruível.

</td>
<td width="50%" valign="top">

### 🗺️ Dados espaciais

- origem e destino da bola;
- zonas da quadra;
- direção das ações;
- ataques para fora;
- pontos e jogadas;
- heatmaps;
- filtros por contexto.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ↩️ Histórico auditável

- correção de eventos;
- desfazer e refazer;
- replay determinístico;
- reconstrução do estado;
- persistência local;
- continuidade de partidas.

</td>
<td width="50%" valign="top">

### 📈 Analytics

- saque e recepção;
- eficiência de ataque;
- sideout e breakpoint;
- desempenho por rotação;
- distribuição do levantador;
- análise espacial;
- probabilidade estimada de set e partida.

</td>
</tr>
</table>

---

## 🎮 Quatro formas de registrar

O Scout Trainer não obriga o operador a trabalhar de uma única maneira. Todos os modos convergem para o mesmo histórico de partida.

| Modo | Como funciona | Melhor para |
| --- | --- | --- |
| ⌨️ **Digitado** | Linha contínua com códigos de scout. | Velocidade, treinamento e operadores habituados a códigos. |
| 🖱️ **Visual** | Ação, qualidade, atleta e trajetória escolhidos pela interface. | Uso mais guiado e registro espacial. |
| 🔀 **Híbrido** | Código rápido + enriquecimento visual/tático. | Equilibrar velocidade e detalhe. |
| 👆 **Gestual** | Trajetória desenhada diretamente na quadra com touch, mouse ou caneta. | Tablet, telas touch e registro durante rallies rápidos. |

### ⌨️ Digitado

Um registro pode começar por uma sequência compacta como:

```text
*08S# a05R+ a12A#
```

O parser interpreta os contatos, registra os eventos e atualiza o contexto da partida.

### 🖱️ Visual e híbrido

A interface permite complementar o evento com informações como:

`fundamento` · `qualidade` · `atleta` · `origem` · `destino` · `direção` · `contexto tático`

### 👆 Gestual

No modo gestual, a própria quadra vira uma entrada de dados. O contexto do rally ajuda a sugerir **equipe, ação esperada e atletas compatíveis com a rotação**, reduzindo cliques desnecessários.

O levantamento pode ser tratado implicitamente quando o contexto permite, sem obrigar o operador a registrar um contato que não acrescentaria informação naquele momento.

---

## 🗺️ A quadra é dado, não decoração

As trajetórias são armazenadas como informação espacial.

```text
origem  ───────────────→  destino
```

Com isso, o projeto pode responder perguntas como:

- de onde determinado atleta mais ataca?
- para onde os ataques estão sendo direcionados?
- em quais regiões a recepção está acontecendo?
- quais padrões mudam conforme a rotação?
- onde uma ação teve mais sucesso ou mais erro?

A mesma base espacial alimenta visualizações em **pontos, jogadas e heatmap**.

---

## 🔄 A partida como sequência, não como planilha

Cada evento existe dentro de um contexto.

```text
Saque → Recepção → Ataque → Defesa → Contra-ataque → ... → fim do rally
```

O Scout Trainer mantém informações de placar, saque, rotação, atleta, levantador e rally para que as análises não precisem tratar cada contato como uma linha isolada.

Errou durante o scout? O histórico foi pensado para isso:

```text
registrar → corrigir → desfazer → refazer → reconstruir
```

A intenção é preservar a rastreabilidade sem obrigar o usuário a refazer uma partida inteira.

---

## 📊 Análises

### Estatísticas de jogo

A aplicação já trabalha com métricas relacionadas a:

- saque;
- recepção;
- ataque;
- bloqueio;
- sideout;
- breakpoint;
- distribuição do levantador;
- desempenho por rotação;
- eficiência por atleta.

### Analytics espaciais

Os registros podem ser recortados por diferentes dimensões, como:

`ação` · `atleta` · `qualidade` · `set` · `posição do levantador` · `origem` · `destino`

### Probabilidade de vitória

Existe também uma leitura estimativa da probabilidade do **set** e da **partida** a partir do estado do placar, incluindo sua evolução ao longo dos rallies.

> Essas probabilidades são **estimativas**, não previsões absolutas. A calibração será aprofundada conforme o projeto ganhar histórico suficiente.

---

## 🧭 Princípios do projeto

<table>
<tr>
<td width="33%" valign="top">

### 📴 Local-first

O funcionamento principal não depende de servidor externo. Partidas e cadastros ficam no dispositivo do usuário.

</td>
<td width="33%" valign="top">

### 🧱 Evento como fonte de verdade

A interface apresenta os dados; regras esportivas e cálculos pertencem ao domínio.

</td>
<td width="33%" valign="top">

### ⚡ Registrar rápido

Se o sistema pode inferir um contexto com segurança, ele não deve obrigar o operador a digitá-lo de novo.

</td>
</tr>
</table>

### Símbolo não é significado

`#`, `+`, `-`, `=` e outros símbolos continuam úteis para captura, mas as análises devem trabalhar cada vez mais com **significado esportivo normalizado**, e não apenas com o caractere digitado.

### Estatística antes de IA

> **IA pergunta. Analytics calcula. IA interpreta.**

Uma futura camada de IA poderá ajudar o usuário a consultar e explicar os dados, mas o cálculo estatístico central continuará determinístico dentro do Scout Trainer.

---

## 🚀 Roadmap

### `0.4.x` — consolidação

Fechar a versão atual: documentação, testes de fluxo antigos, consistência da interface e refinamentos operacionais.

### `0.45` — Analytics & Capture Foundation

A próxima evolução planejada aprofunda a análise da **construção do ponto**:

- normalização semântica dos eventos;
- reconstrução estruturada de rallies;
- análise sequencial;
- cadeias de Markov;
- probabilidade de vencer o rally por estado;
- valor estimado das ações;
- padrões recorrentes de sequência;
- comparação por rotação e contexto;
- tamanho de amostra e incerteza explícitos.

```text
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
```

### Depois da 0.45

| Horizonte | Direção |
| --- | --- |
| 🧍 **Performance** | Integrar identidade de atletas, treino, carga, PSE/PSR e outros registros sem misturar domínios. |
| ⚽ **Multi-esporte** | Explorar um núcleo compartilhado para futebol, futsal e basquete, preservando regras específicas de cada modalidade. |
| 🤖 **IA opcional** | Permitir consultas em linguagem natural usando o próprio provedor do usuário sobre analytics determinísticos. |
| 🎥 **Vídeo** | Relacionar eventos e timestamps antes de experimentar classificação automática assistida. |

---

## 🧠 Arquitetura em uma frase

```text
Entrada → Evento canônico → Timeline da partida → Estado/replay → Estatísticas → Análise/relatório
```

<details>
<summary><strong>Ver estrutura técnica do projeto</strong></summary>

<br />

```text
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
```

A intenção é manter regras esportivas e estatísticas independentes de React, DOM e persistência.

</details>

---

## 💾 Persistência e exportação

O projeto usa **IndexedDB** para persistência local de partidas, equipes, atletas, eventos e configurações.

Os registros podem alimentar exportações em formatos como:

`JSON` · `CSV` · `TXT` · `PDF`

Para auditoria e análises externas mais profundas, **JSON e CSV** são os formatos mais indicados.

---

## 🛠️ Tecnologias

<div align="center">

**TypeScript** · **React** · **Vite** · **Electron** · **IndexedDB** · **Recharts** · **Vitest** · **Playwright**

</div>

---

## 💻 Desenvolvimento

Instale as dependências:

```bash
npm install
```

Execute em desenvolvimento:

```bash
npm run dev
```

Validações principais:

```bash
npm run typecheck
npm run build
npm test
```

Testes end-to-end:

```bash
npm run test:e2e
```

> A versão 0.4 está em consolidação. Build e typecheck fazem parte do fluxo de validação; alguns testes de fluxo antigos ainda estão sendo ajustados à interface atual.

---

## 📦 Download

O código-fonte mais recente está disponível neste repositório.

Builds portáteis podem ser publicados na área de **Releases** conforme cada versão for estabilizada.

---

## 📚 Documentação

- [`CHANGELOG.md`](CHANGELOG.md) — histórico das versões e mudanças relevantes.
- [`docs/`](docs/) — planos, decisões, guias e documentação técnica.
- [`docs/REGISTRO_RAPIDO.md`](docs/REGISTRO_RAPIDO.md) — detalhes do fluxo de registro rápido.

---

## 🤝 Sobre o projeto

O Scout Trainer é um projeto independente voltado à experimentação de formas mais acessíveis de **registrar, estruturar e analisar dados esportivos**.

Não possui vínculo oficial com Data Volley, federações, confederações ou organizações esportivas.

<div align="center">

**Desenvolvido por Lucas Regis**

`voleibol` · `scout` · `sports analytics` · `data` · `open source`

</div>
