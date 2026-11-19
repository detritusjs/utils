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
    const values = this.values();
    let reduced = initialValue;
    // like `Array.prototype.reduce`, no initial value starts from the first item
    if (arguments.length < 2) {
      const first = values.next();
      if (first.done) {
        throw new TypeError('Reduce of empty collection with no initial value');
      }
      reduced = first.value;
    }
    for (let value of values) {
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
  /**
   * Don't let the expiry interval keep the process alive
   */
  unref?: boolean,
}

// a `NaN` limit would evict everything on each insert
function normalizeLimit(value: number | null | undefined): number {
  return (value === undefined || value === null || Number.isNaN(value)) ? Infinity : value;
}

export class BaseCollection<K, V> extends BaseCollectionMixin<K, V> {
  readonly cache = new Map<K, V>();
  _lastUsed?: Map<K, number>;
  declare _order?: Map<K, true>;
  // the interval time asked for, `intervalTime` is this capped to `expire`
  declare _intervalTime: number;

  // read only, use `setExpire()` and `setIntervalTimeout()` to change them
  readonly expire?: number;
  interval?: Timers.Interval = undefined;
  readonly intervalTime: number = 5000;
  limit: number = Infinity;

  constructor({expire, intervalTime, limit, unref}: BaseCollectionOptions = {}) {
    super();
    if (unref) {
      this.interval = new Timers.Interval();
      this.interval.unref();
    }

    if (expire !== undefined) {
      this.expire = expire;
    }
    if (intervalTime !== undefined) {
      this.intervalTime = intervalTime;
    }
    this._intervalTime = this.intervalTime;
    if (limit !== undefined) {
      this.limit = normalizeLimit(limit);
    }

    if (this.expire) {
      this.intervalTime = Math.min(this.expire, this.intervalTime);
    }

    Object.defineProperties(this, {
      _intervalTime: {enumerable: false, writable: true},
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

  _hasExpired(key: K): boolean {
    if (this.expire && this._lastUsed) {
      const lastUsed = this._lastUsed.get(key);
      return lastUsed !== undefined && this.expire < Date.now() - lastUsed;
    }
    return false;
  }

  touch(key: K): void {
    if (!this.cache.has(key)) {
      // a timestamp for a missing key would later be swept for nothing
      return;
    }
    const lastUsed = this.lastUsed;
    lastUsed.delete(key);
    lastUsed.set(key, Date.now());
  }

  get shouldStartInterval(): boolean {
    return !!this.expire && !!this.intervalTime && (!this.interval || !this.interval.hasStarted);
  }

  /**
   * If the expiry interval is running, only while items expire and the collection isn't empty
   */
  get isSweeping(): boolean {
    return !!this.interval && this.interval.hasStarted;
  }

  setExpire(value: number): this {
    const wasExpiring = !!this.expire;
    Object.defineProperty(this, 'expire', {value});
    if (value) {
      // from the asked for interval, so raising `expire` again doesn't keep a smaller cap
      Object.defineProperty(this, 'intervalTime', {value: Math.min(value, this._intervalTime)});
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
      Object.defineProperty(this, 'intervalTime', {value: this._intervalTime});
      this.stopInterval();
      if (this._lastUsed) {
        this._lastUsed.clear();
      }
    }
    return this;
  }

  setLimit(value: number): this {
    this.limit = normalizeLimit(value);
    this.evict(0);
    return this;
  }

  setIntervalTimeout(value: number): this {
    this._intervalTime = value;
    // capped to `expire`, so expired items linger at most another `expire`
    Object.defineProperty(this, 'intervalTime', {value: (this.expire) ? Math.min(this.expire, value) : value});
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
        if (this.expire) {
          this.sweep();
        } else {
          this.stopInterval();
        }
      });
    } else {
      this.stopInterval();
    }
  }

  /**
   * Deletes every expired item now, returns how many were deleted
   */
  sweep(): number {
    const expire = this.expire;
    let deleted = 0;
    if (expire && this._lastUsed) {
      const now = Date.now();
      // oldest first, so everything after the first fresh item is fresh too
      for (let [key, lastUsed] of this._lastUsed) {
        if (now - lastUsed <= expire) {
          break;
        }
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  stopInterval() {
    // keep the object around so an `unref()` still applies on the next start
    if (this.interval) {
      this.interval.stop();
    }
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
    // the asked for interval, not the one capped to `expire`
    const collection = new BaseCollection<K, V>({
      expire: this.expire,
      intervalTime: this._intervalTime,
      limit: this.limit,
      unref: !!this.interval && !this.interval.hasRef(),
    });
    // insert least recently used first so the clone keeps the same eviction order
    const keys = (this.limit !== Infinity) ? this.getOrder().keys() : this.cache.keys();
    for (let key of keys) {
      collection.set(key, this.cache.get(key)!);
    }
    if (collection.expire && this._lastUsed) {
      // `set` stamped every item as just used, keep their real ages (the map is already oldest first)
      collection._lastUsed = new Map(this._lastUsed);
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
      if (this._hasExpired(key)) {
        // expired but not swept yet
        this.delete(key);
        return undefined;
      }
      if (this.limit !== Infinity) {
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
    const value = this.get(key);
    if (value !== undefined || this.cache.has(key)) {
      return value!;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }

  getOrInsertComputed(key: K, func: (key: K) => V): V {
    const value = this.get(key);
    if (value !== undefined || this.cache.has(key)) {
      return value!;
    }
    const computed = func(key);
    this.set(key, computed);
    return computed;
  }

  has(key: K): boolean {
    if (this._hasExpired(key)) {
      this.delete(key);
      return false;
    }
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
   * untracked keys (added while `limit` was `Infinity`) count as the least recently used
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
