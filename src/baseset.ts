export class BaseSet<V> extends Set<V> {
  get length(): number {
    return this.size;
  }

  clone(): BaseSet<V> {
    return new BaseSet<V>(this.values());
  }

  every(func: any): boolean {
    return this.toArray().every(func);
  }

  filter(func: (v: V) => boolean): Array<V> {
    const map: Array<V> = [];
    for (let value of this) {
      if (func(value)) {
        map.push(value);
      }
    }
    return map;
  }

  find(func: (v: V) => boolean): undefined | V {
    for (let value of this) {
      if (func(value)) {
        return value;
      }
    }
  }

  first(): undefined | V {
    return this.values().next().value;
  }

  join(separator?: string): string {
    return this.toArray().join(separator);
  }

  map(func: (v: V) => any): Array<any> {
    const map: Array<any> = [];
    for (let value of this) {
      map.push(func(value));
    }
    return map;
  }

  reduce(cb: any, initialValue?: any): any {
    return this.toArray().reduce(cb, initialValue);
  }

  some(func: (v: V) => boolean): boolean {
    for (let value of this) {
      if (func(value)) {
        return true;
      }
    }
    return false;
  }

  sort(func?: (x: V, y: V) => number): Array<V> {
    return this.toArray().sort(func);
  }

  toArray(): Array<V> {
    return Array.from(this.values());
  }

  toJSON(): Array<V> {
    return this.toArray();
  }

  toString(): string {
    return this[Symbol.toStringTag];
  }

  get [Symbol.toStringTag](): string {
    return `BaseSet (${this.size.toLocaleString()} items)`;
  }
}
