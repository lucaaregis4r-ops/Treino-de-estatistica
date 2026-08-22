export class InputBuffer {
  private value = '';

  replace(value: string): void {
    this.value = value;
  }

  clear(): void {
    this.value = '';
  }

  snapshot(): string {
    return this.value;
  }
}
