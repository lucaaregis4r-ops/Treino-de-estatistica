export class TimingEngine {
  duration(startedAt: number, submittedAt: number): number {
    return Math.max(0, submittedAt - startedAt);
  }
}
