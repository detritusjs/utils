export class Interval {
  shouldRef: boolean = true;
  reference: any = null;

  get hasStarted(): boolean {
    return this.reference !== null;
  }

  hasRef(): boolean {
    return this.shouldRef;
  }

  ref(): void {
    this.shouldRef = true;
    if (this.reference) {
      this.reference.ref();
    }
  }

  unref(): void {
    this.shouldRef = false;
    if (this.reference) {
      this.reference.unref();
    }
  }

  start(
    milliseconds: number,
    handler: Function,
  ): void {
    this.stop();
    this.reference = setInterval(handler, milliseconds);
    if (this.shouldRef) {
      this.ref();
    } else {
      this.unref();
    }
  }

  stop(): void {
    if (this.hasStarted) {
      clearInterval(this.reference);
      this.reference = null;
    }
  }
}


export class Timeout {
  shouldRef: boolean = true;
  reference: any = null;

  get hasStarted(): boolean {
    return this.reference !== null;
  }

  hasRef(): boolean {
    return this.shouldRef;
  }

  ref(): void {
    this.shouldRef = true;
    if (this.reference) {
      this.reference.ref();
    }
  }

  unref(): void {
    this.shouldRef = false;
    if (this.reference) {
      this.reference.unref();
    }
  }

  start(
    milliseconds: number,
    handler: Function,
    override: boolean = true,
  ): void {
    if (!this.hasStarted || override) {
      this.stop();
      this.reference = setTimeout(() => {
        this.reference = null;
        handler();
      }, milliseconds);
      if (this.shouldRef) {
        this.ref();
      } else {
        this.unref();
      }
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
