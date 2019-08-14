export class Interval {
  reference: any = null;

  get hasStarted(): boolean {
    return this.reference !== null;
  }

  start(
    milliseconds: number,
    handler: Function,
  ): void {
    this.stop();
    this.reference = setInterval(handler, milliseconds);
  }

  stop(): void {
    if (this.hasStarted) {
      clearInterval(this.reference);
      this.reference = null;
    }
  }
}


export class Timeout {
  reference: any = null;

  get hasStarted(): boolean {
    return this.reference !== null;
  }

  start(
    milliseconds: number,
    handler: Function,
    override: boolean = true,
  ): void {
    if (this.hasStarted && override) {
      this.stop();
      this.reference = setTimeout(() => {
        this.reference = null;
        handler();
      }, milliseconds);
    }
  }

  stop(): void {
    if (this.hasStarted) {
      clearTimeout(this.reference);
      this.reference = null;
    }
  }
}


export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
