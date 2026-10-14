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
  declare _order?: Map<K, true>;

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
      _order: {enumerable: false, writable: true},
      cache: {enumerable: false},
      expire: {configurable: true, writable: false},
      interval: {enumerable: false, writable: true},
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

  touch(key: K): void {
    const lastUsed = this.lastUsed;
    lastUsed.delete(key);
    lastUsed.set(key, Date.now());
  }

  get shouldStartInterval(): boolean {
    return !!this.intervalTime && (!this.interval || !this.interval.hasStarted);
  }

  setExpire(value: number): this {
    const wasExpiring = !!this.expire;
    Object.defineProperty(this, 'expire', {value});
    if (value) {
      Object.defineProperty(this, 'intervalTime', {value: Math.min(value, this.intervalTime)});
      const now = Date.now();
      const lastUsed = this.lastUsed;
      for (let key of this.cache.keys()) {
        if (!wasExpiring || !lastUsed.has(key)) {
          lastUsed.set(key, now);
        }
      }
      if (this.size) {
        this.startInterval();
      }
    } else {
      this.stopInterval();
      if (this._lastUsed) {
        this._lastUsed.clear();
      }
    }
    return this;
  }

  setLimit(value: number): this {
    this.limit = value;
    this.evict(0);
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
          for (let [key, lastUsed] of this.lastUsed) {
            if (now - lastUsed <= expire) {
              break;
            }
            this.delete(key);
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
    if (this._order) {
      this._order.clear();
    }
  }

  clone(): BaseCollection<K, V> {
    const collection = new BaseCollection<K, V>(this);
    // insert least recently used first so the clone keeps the same eviction order
    const keys = (this.limit !== Infinity) ? this.getOrder().keys() : this.cache.keys();
    for (let key of keys) {
      collection.set(key, this.cache.get(key)!);
    }
    return collection;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (this._lastUsed) {
      this._lastUsed.delete(key);
    }
    if (this._order) {
      this._order.delete(key);
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
    if ((this.limit !== Infinity || this.expire) && (value !== undefined || this.cache.has(key))) {
      if (this.limit !== Infinity) {
        // mark it as the most recently used
        const order = this.getOrder();
        order.delete(key);
        order.set(key, true);
      }
      if (this.expire) {
        this.touch(key);
      }
    }
    return value;
  }

  getOrInsert(key: K, defaultValue: V): V {
    if (this.has(key)) {
      return this.get(key)!;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }

  getOrInsertComputed(key: K, func: (key: K) => V): V {
    if (this.has(key)) {
      return this.get(key)!;
    }
    const value = func(key);
    this.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  keys(): IterableIterator<K>  {
    return this.cache.keys();
  }

  set(key: K, value: V): this {
    if (this.limit !== Infinity) {
      if (this.limit <= 0) {
        this.evict(0);
        return this;
      }
      const order = this.getOrder();
      if (this.cache.has(key)) {
        order.delete(key);
      } else {
        // make room for the new key, evicting the least recently used ones
        this.evict(1);
      }
      order.set(key, true);
    }
    this.cache.set(key, value);
    if (this.expire) {
      this.touch(key);
      if (this.shouldStartInterval) {
        this.startInterval();
      }
    }
    return this;
  }

  /**
   * Evicts the least recently used items until there's `room` free under the limit
   */
  evict(room: number = 0): void {
    if (this.limit === Infinity) {
      return;
    }
    const max = Math.max(this.limit - room, 0);
    if (this.cache.size <= max) {
      return;
    }
    const order = this.getOrder();
    for (let key of order.keys()) {
      if (this.cache.size <= max) {
        break;
      }
      this.delete(key);
    }
  }

  /**
   * The recency order (least recently used first), synced with the cache
   * keys added before `limit` was set (or while it was `Infinity`) aren't tracked yet, so they count as the least recently used
   */
  getOrder(): Map<K, true> {
    let order = this._order;
    if (!order || order.size !== this.cache.size) {
      const synced = new Map<K, true>();
      for (let key of this.cache.keys()) {
        if (!order || !order.has(key)) {
          synced.set(key, true);
        }
      }
      if (order) {
        for (let key of order.keys()) {
          if (this.cache.has(key)) {
            synced.set(key, true);
          }
        }
      }
      order = this._order = synced;
    }
    return order;
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
