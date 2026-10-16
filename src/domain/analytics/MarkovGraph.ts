export interface MarkovNode {
  id: string;
  stage: 1 | 2 | 3;
  title: string;
  subtitle: string;
  sampleN: number;
  rate: number;
  rateLabel?: string;
  status: 'positive' | 'warning' | 'negative' | 'neutral';
}

export interface MarkovLink {
  fromId: string;
  toId: string;
  volume: number;
  probability: number;
  type: 'kill' | 'rally' | 'error';
}
