interface ManualScreenProps {
  readonly onBack: () => void;
}

const SKILLS = [
  ['S', 'Saque'],
  ['R', 'Recepção'],
  ['E', 'Levantamento'],
  ['A', 'Ataque'],
  ['B', 'Bloqueio'],
  ['D', 'Defesa'],
  ['F', 'Bola de graça'],
] as const;

const EVALUATIONS = [
  ['Saque', 'Ace', 'Positivo', 'Limita', 'Negativo', 'Bola de graça', 'Erro'],
  ['Recepção', 'Perfeita', 'Positiva', 'Limitada', 'Negativa', 'Overpass', 'Erro'],
  ['Levantamento', '0–1 bloqueio', 'Jogável', '—', '—', '—', 'Erro'],
  ['Ataque', 'Ponto', 'Positivo', 'Coberto', 'Defendido', 'Bloqueado', 'Erro'],
  ['Bloqueio', 'Ponto', 'Positivo', 'Cobertura', '—', 'Violação', 'Erro'],
  ['Defesa', 'Defendida', 'Positiva', '—', 'Devolvida', '—', 'Erro'],
] as const;

const QUALIFIER_GUIDES = [
  {
    code: 'S',
    name: 'Saque',
    purpose: 'Avalia quanto o saque dificultou a construção adversária.',
    qualifiers: [
      ['#', 'Ace', 'Ponto direto: a recepção não mantém a bola em jogo.'],
      [
        '+',
        'Positivo',
        'Quebra a recepção e deixa o ataque adversário previsível ou fora do sistema.',
      ],
      ['!', 'Limita', 'A recepção permanece jogável, mas reduz as opções rápidas do levantador.'],
      ['-', 'Negativo', 'Recepção confortável; o adversário organiza o ataque.'],
      [
        '/',
        'Muito negativo',
        'Saque sem pressão, tratado neste perfil como bola gratuita ao adversário.',
      ],
      ['=', 'Erro', 'Saque na rede, fora, falta de pé ou outra falha que entrega o ponto.'],
    ],
  },
  {
    code: 'R',
    name: 'Recepção',
    purpose: 'Avalia quantas opções o levantador conserva após o primeiro contato.',
    qualifiers: [
      ['#', 'Perfeita', 'Passe na zona ideal; todas as opções de ataque ficam disponíveis.'],
      ['+', 'Positiva', 'Passe controlado; ainda permite uma construção ampla.'],
      ['!', 'Limitada', 'Bola jogável, mas sem todas as opções, normalmente sem primeiro tempo.'],
      ['-', 'Negativa', 'Passe afastado; força levantamento previsível ou bola alta.'],
      ['/', 'Overpass', 'A recepção cruza ou fica diretamente disponível ao adversário.'],
      ['=', 'Erro', 'Ace sofrido ou bola que não pode ser mantida em jogo.'],
    ],
  },
  {
    code: 'E',
    name: 'Levantamento',
    purpose: 'Avalia a condição criada para o atacante, não apenas a precisão estética do toque.',
    qualifiers: [
      ['#', '0–1 bloqueador', 'O ataque seguinte enfrenta bloqueio simples ou sem bloqueio.'],
      ['+', 'Jogável', 'Levantamento utilizável nos demais casos.'],
      ['!', 'Não usado', 'Sem significado padrão neste perfil.'],
      ['-', 'Não usado', 'Sem significado padrão neste perfil.'],
      ['/', 'Não usado', 'Sem significado padrão neste perfil.'],
      ['=', 'Erro', 'Dois toques, condução, bola inalcançável ou ponto cedido pelo levantamento.'],
    ],
  },
  {
    code: 'A',
    name: 'Ataque',
    purpose: 'Avalia o resultado do ataque e a condição da jogada seguinte.',
    qualifiers: [
      ['#', 'Ponto', 'A bola toca o chão ou sai após toque do bloqueio/defesa.'],
      ['+', 'Positivo', 'Não pontua, mas impede contra-ataque organizado e mantém vantagem.'],
      [
        '!',
        'Coberto',
        'A bola retorna ao próprio lado e pode ser coberta para continuar a jogada.',
      ],
      ['-', 'Defendido', 'O adversário defende e pode organizar o contra-ataque.'],
      ['/', 'Bloqueado', 'Bloqueio adversário faz o ponto.'],
      ['=', 'Erro', 'Ataque para fora, na rede, invasão ou outra falha direta.'],
    ],
  },
  {
    code: 'B',
    name: 'Bloqueio',
    purpose: 'Avalia o efeito do contato do bloqueio sobre a continuidade.',
    qualifiers: [
      ['#', 'Ponto', 'Bloqueio terminal: a bola cai no campo adversário.'],
      ['+', 'Positivo', 'Amortece ou direciona a bola e permite contra-ataque organizado.'],
      ['!', 'Cobertura', 'Toque mantém a bola jogável, mas sem controle ideal.'],
      ['-', 'Sem efeito', 'Contato sem vantagem mensurável; uso opcional do perfil.'],
      [
        '/',
        'Violação',
        'Invasão, toque irregular ou ação de bloqueio classificada como muito negativa.',
      ],
      ['=', 'Erro', 'Falha que entrega diretamente o ponto.'],
    ],
  },
  {
    code: 'D',
    name: 'Defesa',
    purpose: 'Avalia o controle obtido depois do ataque adversário.',
    qualifiers: [
      ['#', 'Perfeita', 'Defesa controlada na zona de levantamento, com todas as opções.'],
      ['+', 'Positiva', 'Defesa controlada e utilizável para contra-atacar.'],
      ['!', 'Limitada', 'Bola mantida em jogo, mas com construção restrita.'],
      ['-', 'Devolvida', 'A equipe apenas devolve a bola, sem ataque organizado.'],
      ['/', 'Muito negativa', 'Contato de emergência sem controle; uso opcional do perfil.'],
      ['=', 'Erro', 'A bola cai ou sai após a tentativa de defesa.'],
    ],
  },
  {
    code: 'F',
    name: 'Bola de graça',
    purpose: 'Registra uma devolução sem ataque; a avaliação descreve o controle da devolução.',
    qualifiers: [
      ['#', 'Alvo perfeito', 'Bola de graça direcionada exatamente ao alvo planejado.'],
      ['+', 'Controlada', 'Devolução segura e dirigida.'],
      ['!', 'Neutra', 'Devolução mantém a bola em jogo sem vantagem clara.'],
      ['-', 'Fácil', 'Entrega construção confortável ao adversário.'],
      ['/', 'Muito negativa', 'Devolução extremamente favorável ao adversário.'],
      ['=', 'Erro', 'A devolução não passa ou sai da quadra.'],
    ],
  },
] as const;

const SERVE_TYPES = [
  ['YQ', 'Viagem/potência', 'Saque com salto e rotação forte.'],
  ['YM', 'Flutuante em salto', 'Contato flutuante executado com salto.'],
  ['YH', 'Flutuante em apoio', 'Saque flutuante sem salto.'],
  ['YT', 'Híbrido', 'Ação que mistura sinais de flutuante e potência.'],
] as const;

const TRAINING_TOKENS = [
  ['yM', 'tipo'],
  ['o3', 'origem/contato'],
  ['t6', 'destino'],
  ['lK1', 'chamada'],
  ['cX1', 'combinação'],
  ['q1', 'tempo'],
  ['b2', 'bloqueadores'],
] as const;

export function ManualScreen({ onBack }: ManualScreenProps) {
  return (
    <section className="page-section manual-screen" aria-labelledby="manual-title">
      <div className="section-heading">
        <div>
          <h1 id="manual-title">Códigos</h1>
          <p>Ajuda de códigos do vôlei — perfil Data Volley.</p>
          <p className="section-support">
            Para futebol, use os controles e a ajuda contextual no Registro da partida.
          </p>
        </div>
        <button className="button ghost" type="button" onClick={onBack}>
          Voltar
        </button>
      </div>

      <nav className="manual-index" aria-label="Seções do manual">
        <a href="#estrutura">Estrutura</a>
        <a href="#fundamentos">Fundamentos</a>
        <a href="#avaliacoes">Avaliações</a>
        <a href="#saque">Saque</a>
        <a href="#qualificadores">Qualificadores</a>
        <a href="#zonas">Zonas</a>
        <a href="#treino">Treino</a>
      </nav>

      <section id="estrutura" className="manual-section manual-primary-reference">
        <h2>Estrutura</h2>
        <div className="manual-code-anatomy" aria-label="Anatomia do código Data Volley">
          <span>
            <code>*</code>
            <small>casa</small>
          </span>
          <span>
            <code>08</code>
            <small>jogador</small>
          </span>
          <span>
            <code>S</code>
            <small>fundamento</small>
          </span>
          <span>
            <code>#</code>
            <small>avaliação</small>
          </span>
        </div>
        <div className="manual-examples">
          <article>
            <strong>Equipe da casa</strong>
            <code>*08S#</code>
          </article>
          <article>
            <strong>Equipe visitante</strong>
            <code>a12R+</code>
          </article>
          <article>
            <strong>Linha contínua</strong>
            <code>*08S#a12R+*03E+*10A#</code>
          </article>
          <article>
            <strong>Destino na mesma ação</strong>
            <code>*01S!T5</code>
          </article>
        </div>
      </section>

      <section id="fundamentos" className="manual-section">
        <h2>Fundamentos</h2>
        <div className="manual-card-grid manual-skill-grid compact">
          {SKILLS.map(([code, name]) => (
            <article key={code}>
              <kbd>{code}</kbd>
              <strong>{name}</strong>
            </article>
          ))}
        </div>
      </section>

      <section id="avaliacoes" className="manual-section">
        <h2>Avaliações</h2>
        <div className="manual-table-wrap">
          <table className="manual-table">
            <caption className="sr-only">Avaliações disponíveis por fundamento</caption>
            <thead>
              <tr>
                <th>Fundamento</th>
                <th>#</th>
                <th>+</th>
                <th>!</th>
                <th>-</th>
                <th>/</th>
                <th>=</th>
              </tr>
            </thead>
            <tbody>
              {EVALUATIONS.map(([skill, ...values]) => (
                <tr key={skill}>
                  <th>{skill}</th>
                  {values.map((value, index) => (
                    <td key={`${skill}-${index}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="saque" className="manual-section manual-serve-guide">
        <div className="manual-section-heading">
          <div>
            <p className="eyebrow">S · Saque</p>
            <h2>Como registrar</h2>
          </div>
          <code>*08S+YQO1T1</code>
        </div>
        <div className="manual-code-breakdown" aria-label="Leitura do exemplo de saque">
          <span>
            <code>*08</code>
            <small>casa · jogador 8</small>
          </span>
          <span>
            <code>S+</code>
            <small>saque positivo</small>
          </span>
          <span>
            <code>YQ</code>
            <small>viagem</small>
          </span>
          <span>
            <code>O1</code>
            <small>origem 1</small>
          </span>
          <span>
            <code>T1</code>
            <small>destino 1</small>
          </span>
        </div>
        <p className="manual-warning">
          Um saque 1→1 pode ser escrito como <code>*08S+O1T1</code>. Se também foi observado como
          viagem, use <code>*08S+YQO1T1</code>. Origem é opcional; quando você só conhece o destino,
          registre <code>*08S+T1</code>. Os prefixos Y/O/T são a extensão tática local do Scout
          Trainer; o núcleo Data Volley continua sendo <code>*08S+</code>.
        </p>
        <div className="manual-serve-layout">
          <div>
            <h3>Qualidade do saque</h3>
            <div className="manual-qualifier-list compact">
              {QUALIFIER_GUIDES[0].qualifiers.map(([symbol, label, description]) => (
                <div key={symbol}>
                  <kbd>{symbol}</kbd>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Tipo observado</h3>
            <div className="manual-qualifier-list compact">
              {SERVE_TYPES.map(([token, label, description]) => (
                <div key={token}>
                  <kbd>{token}</kbd>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="manual-example-stack">
          <p>
            <code>*08S#YQO1T1</code>
            <span>Ace em saque viagem, da origem 1 ao destino 1.</span>
          </p>
          <p>
            <code>*08S!YMT5</code>
            <span>Flutuante em salto que limitou a recepção e terminou na 5.</span>
          </p>
          <p>
            <code>a12S=YH</code>
            <span>Visitante 12 errou um flutuante; sem inventar destino.</span>
          </p>
        </div>
      </section>

      <section id="qualificadores" className="manual-section">
        <div className="manual-section-heading">
          <div>
            <h2>Qualificadores por fundamento</h2>
          </div>
        </div>
        <p className="manual-warning">
          O mesmo símbolo muda de significado conforme o fundamento. Estas são as definições do
          perfil padrão do Scout Trainer; perfis de clubes podem ajustar os critérios
          intermediários.
        </p>
        <div className="manual-skill-reference-list">
          {QUALIFIER_GUIDES.slice(1).map((guide, index) => (
            <details key={guide.code} open={index === 0}>
              <summary>
                <kbd>{guide.code}</kbd>
                <span>
                  <strong>{guide.name}</strong>
                  <small>{guide.purpose}</small>
                </span>
                <span aria-hidden="true">+</span>
              </summary>
              <div className="manual-qualifier-list">
                {guide.qualifiers.map(([symbol, label, description]) => (
                  <div key={symbol}>
                    <kbd>{symbol}</kbd>
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section id="zonas" className="manual-section manual-reference-row">
        <div>
          <h2>Zonas</h2>
          <div className="manual-court" aria-label="Meia quadra com as seis posições">
            <div className="manual-net">rede</div>
            <div className="manual-zone front">
              <span>4</span>
              <small>entrada</small>
            </div>
            <div className="manual-zone front">
              <span>3</span>
              <small>meio</small>
            </div>
            <div className="manual-zone front">
              <span>2</span>
              <small>saída</small>
            </div>
            <div className="manual-zone back">
              <span>5</span>
              <small>fundo esquerdo</small>
            </div>
            <div className="manual-zone back">
              <span>6</span>
              <small>fundo central</small>
            </div>
            <div className="manual-zone back">
              <span>1</span>
              <small>saque/defesa</small>
            </div>
          </div>
        </div>
        <div>
          <h2>Trajetória</h2>
          <dl className="manual-definition-list">
            <div>
              <dt>Origem</dt>
              <dd>contato</dd>
            </div>
            <div>
              <dt>Destino</dt>
              <dd>queda/toque</dd>
            </div>
            <div>
              <dt>Direção</dt>
              <dd>derivada</dd>
            </div>
          </dl>
          <p className="manual-warning">
            Origem e destino pertencem à trajetória da bola. P1–P6 continuam sendo posições de
            rotação; não são uma grade 3×3.
          </p>
        </div>
      </section>

      <section id="treino" className="manual-section">
        <h2>Detalhes do treino</h2>
        <p className="manual-warning">
          Estes tokens pertencem ao Scout Trainer; não ao núcleo básico Data Volley. No scout ao
          vivo podem ser colados ao código: *01S!YHT5. O próximo jogador/equipe encerra o evento;
          Enter encerra o último.
        </p>
        <div className="manual-token-list">
          {TRAINING_TOKENS.map(([token, meaning]) => (
            <div key={token}>
              <code>{token}</code>
              <span>{meaning}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
