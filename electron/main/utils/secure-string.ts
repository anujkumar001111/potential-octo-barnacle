export class SecureString {
  private buffer: Uint8Array | null;

  constructor(value: string) {
    const encoder = new TextEncoder();
    this.buffer = encoder.encode(value);
  }

  getValue(): string {
    if (!this.buffer) {
      throw new Error('SecureString has been zeroized');
    }
    const decoder = new TextDecoder();
    return decoder.decode(this.buffer);
  }

  zeroize(): void {
    if (this.buffer) {
      // Overwrite with zeros
      this.buffer.fill(0);
      this.buffer = null;
    }
  }

  // Automatic cleanup
  [Symbol.dispose](): void {
    this.zeroize();
  }
}