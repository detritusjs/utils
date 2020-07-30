import * as Timers from './timers';


export class BaseCollectionMixin<K, V> {
  get length(): number {
    return this.size;
  }

  get size(): number {
    return 0;
  }

  clear(): void {
    
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  every(func: (v: V, k: K) => boolean): boolean {
    for (let [key, value] of this) {
        if (!func(value, key)) {
          return false;
      }
    }
    return true;
  }

  filter(func: (v: V, k: K) => boolean): Array<V> {
    const map = [];
    for (let [key, value] of this) {
      if (func(value, key)) {
        map.push(value);
      }
    }
    return map;
  }

  find(func: (v: V, k: K) => boolean): V | undefined {
    for (let [key, value] of this) {
      if (func(value, key)) {
        return value;
      }
    }
    return undefined;
  }

  first(): V | undefined {
    for (let [key, value] of this) {
      return value;
    }
  }

  forEach(func: (v: V, k: K, map: Map<K, V>) => void, thisArg?: any): void {

  }

  join(separator?: string): string {
    return this.toArray().join(separator);
  }

  map(func: (v: V, k: K) => any): Array<any> {
    const map = [];
    for (let [key, value] of this) {
        map.push(func(value, key));
    }
    return map;
  }

  reduce(func: (intial: any, v: V) => any, initialValue?: any): any {
    let reduced = initialValue;
    for (let [key, value] of this) {
      reduced = func(reduced, value);
    }
    return reduced;
  }

  some(func: (v: V, k: K) => boolean): boolean {
    for (let [key, value] of this) {
        if (func(value, key)) {
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

  *keys(): IterableIterator<K> {

  }

  *values(): IterableIterator<V> {

  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    
  }

  get [Symbol.toStringTag]() {
    return 'BaseCollection';
  }
}


export interface BaseCollectionOptions {
  expire?: number,
  intervalTime?: number,
  limit?: number,
}

export class BaseCollection<K, V> extends BaseCollectionMixin<K, V> {
  readonly cache = new Map<K, V>();
  _lastUsed?: Map<K, number>;

  expire?: number;
  interval?: Timers.Interval = undefined;
  intervalTime = 5000;
  limit: number = Infinity;

  constructor({expire, intervalTime, limit}: BaseCollectionOptions = {}) {
    super();

    if (expire !== undefined) {
      this.expire = expire;
    }
    if (intervalTime !== undefined) {
      this.intervalTime = intervalTime;
    }
    if (limit !== undefined) {
      this.limit = limit;
    }

    if (this.expire) {
      this.intervalTime = Math.min(this.expire, this.intervalTime);
    }

    Object.defineProperties(this, {
      _lastUsed: {enumerable: false, writable: true},
      cache: {enumerable: false},
      expire: {configurable: true, writable: false},
      interval: {enumerable: false, writeable: true},
      intervalTime: {configurable: true, enumerable: false, writable: false},
      limit: {enumerable: false},
    });
  }

  get lastUsed(): Map<K, number> {
    if (this._lastUsed) {
      return this._lastUsed;
    }
    if (this.expire) {
      return this._lastUsed = new Map<K, number>();
    }
    return new Map<K, number>();
  }

  get shouldStartInterval(): boolean {
    return !!this.intervalTime && (!this.interval || !!this.interval.hasStarted);
  }

  setExpire(value: number): this {
    Object.defineProperty(this, 'expire', {value});
    if (value) {
      if (this.size) {
        this.startInterval();
      }
    } else {
      this.stopInterval();
    }
    return this;
  }

  setIntervalTimeout(value: number): this {
    Object.defineProperty(this, 'intervalTime', {value});
    if (value) {
      if (this.size) {
        this.startInterval();
      }
    } else {
      this.stopInterval();
    }
    return this;
  }

  startInterval() {
    if (this.intervalTime && this.expire) {
      if (!this.interval) {
        this.interval = new Timers.Interval();
      }
      this.interval.start(this.intervalTime, () => {
        const expire = this.expire;
        if (expire) {
          const now = Date.now();
          for (let [key, value] of this.cache) {
            const lastUsed = this.lastUsed.get(key);
            if (lastUsed && expire < now - lastUsed) {
              this.delete(key);
            }
          }
        } else {
          this.stopInterval();
        }
      });
    } else {
      this.stopInterval();
    }
  }

  stopInterval() {
    if (this.interval) {
      this.interval.stop();
    }
    this.interval = undefined;
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.stopInterval();
    this.cache.clear();
    if (this._lastUsed) {
      this._lastUsed.clear();
    }
  }

  clone(): BaseCollection<K, V> {
    const collection = new BaseCollection<K, V>(this);
    for (let [key, value] of this) {
      collection.set(key, value);
    }
    return collection;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (this._lastUsed) {
      this._lastUsed.delete(key);
    }
    if (!this.cache.size) {
      this.stopInterval();
    }
    return deleted;
  }

  forEach(func: (v: V, k: K, map: Map<K, V>) => void, thisArg?: any): void {
    return this.cache.forEach(func, thisArg);
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (this.expire && value) {
      this.lastUsed.set(key, Date.now());
    }
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  keys(): IterableIterator<K>  {
    return this.cache.keys();
  }

  set(key: K, value: V): this {
    this.cache.set(key, value);
    if (this.expire) {
      this.lastUsed.set(key, Date.now());
      if (this.shouldStartInterval) {
        this.startInterval();
      }
    }
    if (this.limit !== Infinity) {
      if (this.limit <= this.cache.size) {
        for (let [key, value] of this.cache) {
          this.delete(key);
          break;
        }
      }
    }
    return this;
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.cache[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return `BaseCollection (${this.size.toLocaleString()} items)`;
  }
}
