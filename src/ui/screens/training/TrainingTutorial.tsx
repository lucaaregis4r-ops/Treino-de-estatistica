const SKILL_GUIDES = [
  {
    code: 'S',
    name: 'Saque',
    syntax: '08S+ yM t5',
    explanation:
      'Registre o tipo quando observado (Q viagem, M flutuante em salto, H flutuante, T híbrido) e a zona final. Use origem somente quando a posição atrás da linha de fundo for realmente conhecida.',
  },
  {
    code: 'R',
    name: 'Recepção',
    syntax: '12R# o5',
    explanation:
      'A avaliação descreve a qualidade: # perfeita, + boa, ! limitada, - negativa, / devolvida e = erro. A zona é o local do contato.',
  },
  {
    code: 'E',
    name: 'Levantamento',
    syntax: '03E+ lK1 t3',
    explanation:
      'Acrescente a chamada do central (por exemplo K1, K7, K2 ou KD) e o destino do levantamento quando forem observáveis.',
  },
  {
    code: 'A',
    name: 'Ataque',
    syntax: '10A# cX5 o4 t6 q1 b2',
    explanation:
      'Informe combinação, zona inicial, zona final, tempo e bloqueadores. Como referência: central parte normalmente da 3, oposto da 2 e ponteiro da 4; registre a exceção mostrada na jogada.',
  },
  {
    code: 'B',
    name: 'Bloqueio',
    syntax: '06B# b2',
    explanation:
      'Informe quantos jogadores formaram o bloqueio. # é ponto de bloqueio; + é toque que permite contra-ataque; = é erro.',
  },
  {
    code: 'D',
    name: 'Defesa',
    syntax: '09D# o6',
    explanation:
      'Informe a zona do contato. # ou + mantêm condição de contra-ataque, / devolve a bola e = encerra com erro.',
  },
  {
    code: 'F',
    name: 'Free ball',
    syntax: '07F+ o6 t3',
    explanation:
      'Use para bola devolvida sem ataque. Origem e destino são opcionais e só entram quando observados.',
  },
] as const;

export function TrainingTutorial() {
  return (
    <details className="training-tutorial">
      <summary>
        <span>
          <strong>Tutorial de registro</strong>
          <small>Fundamentos, avaliações, zonas e códigos táticos</small>
        </span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="tutorial-content">
        <div className="tutorial-principles">
          <p>
            O código básico é <code>jogador + fundamento + avaliação</code>. Depois dele, acrescente
            apenas os detalhes que você realmente viu.
          </p>
          <ul>
            <li>
              <code>o5</code> zona inicial/contato
            </li>
            <li>
              <code>t1</code> zona final
            </li>
            <li>
              <code>yM</code> tipo do fundamento
            </li>
            <li>
              <code>lK1</code> chamada do central
            </li>
            <li>
              <code>cX5</code> combinação de ataque
            </li>
            <li>
              <code>q1</code> tempo de ataque
            </li>
            <li>
              <code>b2</code> dois bloqueadores
            </li>
          </ul>
          <p>
            Quando origem e destino existem, a trajetória é derivada automaticamente. Campo não
            observado fica ausente: o sistema não deve inventar o dado.
          </p>
        </div>
        <div className="tutorial-skill-grid">
          {SKILL_GUIDES.map((guide) => (
            <article key={guide.code}>
              <header>
                <kbd>{guide.code}</kbd>
                <strong>{guide.name}</strong>
              </header>
              <code>{guide.syntax}</code>
              <p>{guide.explanation}</p>
            </article>
          ))}
        </div>
        <p className="tutorial-note">
          Em rally completo, separe os contatos com ponto e vírgula:{' '}
          <code>12R# o5 ; 03E+ lK1 t3 ; 10A# cX5 o3 t6 q1 b2</code>.
        </p>
      </div>
    </details>
  );
}
