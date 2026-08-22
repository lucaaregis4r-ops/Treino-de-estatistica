export const SKILLS = ['serve', 'reception', 'set', 'attack', 'block', 'dig', 'free_ball'] as const;

export type Skill = (typeof SKILLS)[number];

export function isSkill(value: string): value is Skill {
  return SKILLS.some((skill) => skill === value);
}
