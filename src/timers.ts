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
    // schedule first, so a bad handler throws before the running interval is stopped
    const reference = setInterval(handler, milliseconds);
    this.stop();
    this.reference = reference;
    if (this.shouldRef) {
      this.ref();
    } else {
      this.unref();
    }
  }

  /**
   * Returns if it was running
   */
  stop(): boolean {
    if (this.hasStarted) {
      clearInterval(this.reference);
      this.reference = null;
      return true;
    }
    return false;
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

  /**
   * Returns if it was scheduled, `false` when it's already running and `override` is `false`
   * `hasStarted` is `false` again by the time `handler` runs, so the handler can start it again
   */
  start(
    milliseconds: number,
    handler: Function,
    override: boolean = true,
  ): boolean {
    if (this.hasStarted && !override) {
      return false;
    }
    if (typeof(handler) !== 'function') {
      // like `setTimeout()` would, instead of throwing later from inside the timer
      throw new TypeError(`The "handler" argument must be of type function. Received ${typeof(handler)}`);
    }
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
    return true;
  }

  /**
   * Returns if it was running
   */
  stop(): boolean {
    if (this.hasStarted) {
      clearTimeout(this.reference);
      this.reference = null;
      return true;
    }
    return false;
  }
}


export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
