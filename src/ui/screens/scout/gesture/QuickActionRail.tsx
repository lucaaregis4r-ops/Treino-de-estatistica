export type QuickAction =
  | 'free_ball'
  | 'net_touch'
  | 'invasion'
  | 'double_touch'
  | 'rotation_error';

const secondaryActions: readonly [QuickAction, string][] = [
  ['net_touch', 'Toque na rede'],
  ['invasion', 'Invasão'],
  ['double_touch', 'Dois toques'],
  ['rotation_error', 'Erro de rotação'],
];

export function QuickActionRail({
  selectedAction,
  onAction,
}: {
  readonly selectedAction?: QuickAction;
  readonly onAction?: (action: QuickAction) => void;
}) {
  return (
    <div className="gesture-quick-actions" role="group" aria-label="Ações rápidas">
      <button
        type="button"
        aria-pressed={selectedAction === 'free_ball'}
        onClick={() => onAction?.('free_ball')}
      >
        Bola de graça
      </button>
      <details>
        <summary aria-pressed={selectedAction !== undefined && selectedAction !== 'free_ball'}>
          Outras ações
        </summary>
        <div>
          {secondaryActions.map(([action, label]) => (
            <button
              key={action}
              type="button"
              aria-pressed={selectedAction === action}
              onClick={() => onAction?.(action)}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
