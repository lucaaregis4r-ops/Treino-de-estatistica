import type { BasketballPressure, BasketballTactic } from '../../../domain/basketball/BasketballScout';

export const basketballTactics: Record<BasketballTactic, string> = {
  pick_roll: 'Pick and roll · bloqueio direto',
  pick_pop: 'Pick and pop · bloqueio e abertura',
  low_post: 'Post up · jogo de poste',
  isolation: 'Isolação',
  cut: 'Corte sem bola',
  give_and_go: 'Passa e corta · give and go',
  drive_kick: 'Penetração e passe · drive and kick',
  transition: 'Transição rápida',
  handoff: 'Handoff · entrega de mão',
  spot_up: 'Spot up · recepção e arremesso',
  off_ball_screen: 'Bloqueio sem bola',
  putback: 'Segunda chance · putback',
  other: 'Outra ação',
};

export const basketballPressures: Record<BasketballPressure, string> = {
  none: 'Sem pressão observada',
  on_ball: 'Pressão na bola',
  half_court: 'Pressão na meia quadra',
  full_court: 'Pressão quadra inteira',
  trap: 'Dobra / armadilha',
};
