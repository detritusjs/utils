import { EventEmitter } from 'events';


export class EventSpewer extends EventEmitter {
  /**
   * @ignore
   */
  declare _events: {[key: string]: any} | undefined;

  /**
   * @ignore
   */
  _subscriptions: Map<string | symbol, Array<EventSubscription>> | undefined = undefined;

  constructor() {
    super();
    Object.defineProperties(this, {
      _events: {enumerable: false},
      _eventsCount: {enumerable: false},
      _maxListeners: {enumerable: false},
      _subscriptions: {enumerable: false},
    });
  }

  hasEventListener(name: string | symbol): boolean {
    return !!this._events && (name in this._events);
  }

  subscribe(name: string | symbol, listener: (...args: any[]) => void): EventSubscription {
    const subscription = new EventSubscription(this, name, listener);
    this.on(name, subscription.wrapped!);

    if (!this._subscriptions) {
      this._subscriptions = new Map();
    }
    let subscriptions = this._subscriptions.get(name);
    if (!subscriptions) {
      this._subscriptions.set(name, subscriptions = []);
    }
    subscriptions.push(subscription);
    return subscription;
  }

  _deleteSubscriptions(name: string | symbol, subscriptions: Array<EventSubscription>): void {
    if (!subscriptions.length && this._subscriptions) {
      this._subscriptions.delete(name);
      if (!this._subscriptions.size) {
        this._subscriptions = undefined;
      }
    }
  }

  removeSubscription(subscription: EventSubscription): void {
    if (this._subscriptions) {
      const subscriptions = this._subscriptions.get(subscription.name);
      if (subscriptions) {
        const index = subscriptions.indexOf(subscription);
        if (index !== -1) {
          subscriptions.splice(index, 1);
        }
        this._deleteSubscriptions(subscription.name, subscriptions);
      }
    }
    if (subscription.wrapped) {
      // the wrapper is only ever attached by this subscription, so this can't take out another registration of the
      // same function (like a `once()`, which `removeListener(name, listener)` would remove first)
      (super.removeListener as Function).call(this, subscription.name, subscription.wrapped);
    }
  }

  removeListener(name: string | symbol, listener: (...args: any[]) => void, ...args: Array<any>): this {
    (super.removeListener as Function).call(this, name, listener, ...args);
    if (this._subscriptions) {
      const subscriptions = this._subscriptions.get(name);
      // `listener` is either the subscribed function or a subscription's wrapper (when node removes it, like in `removeAllListeners()`)
      if (subscriptions && subscriptions.some((subscription) => subscription.listener === listener || subscription.wrapped === listener)) {
        // drop the subscriptions whose wrapper isn't attached anymore
        const attached = new Set(this.rawListeners(name));
        for (let i = subscriptions.length - 1; 0 <= i; i--) {
          const subscription = subscriptions[i];
          if (!attached.has(subscription.wrapped!)) {
            subscriptions.splice(i, 1);
            subscription.listener = null;
            subscription.spewer = null;
            subscription.wrapped = null;
          }
        }
        this._deleteSubscriptions(name, subscriptions);
      }
    }
    return this;
  }

  off(name: string | symbol, listener: (...args: any[]) => void, ...args: Array<any>): this {
    return this.removeListener(name, listener, ...args);
  }

  removeAllListeners(name?: string | symbol): this {
    if (this._subscriptions) {
      if (name !== undefined) {
        const subscriptions = this._subscriptions.get(name);
        if (subscriptions) {
          for (let subscription of subscriptions.slice()) {
            subscription.remove();
          }
        }
      } else {
        for (let subscriptions of this._subscriptions.values()) {
          for (let subscription of subscriptions) {
            subscription.listener = null;
            subscription.spewer = null;
            subscription.wrapped = null;
          }
        }
        this._subscriptions = undefined;
      }
    }
    if (name === undefined) {
      return super.removeAllListeners();
    }
    if (!name) {
      for (let listener of this.listeners(name)) {
        this.removeListener(name, listener as (...args: any[]) => void);
      }
      return this;
    }
    return super.removeAllListeners(name);
  }

  removeAllSubscriptions(): this {
    if (this._subscriptions) {
      const subscriptions = Array.from(this._subscriptions.values()).flat();
      this._subscriptions = undefined;
      for (let subscription of subscriptions) {
        subscription.remove();
      }
    }
    return this;
  }
}


export class EventSubscription {
  listener: ((...args: any[]) => void) | null;
  name: string | symbol;
  spewer: EventSpewer | null;
  /**
   * What's actually attached to the spewer, a function only this subscription owns
   * Removing it can't remove another registration of `listener` (or bring one back)
   */
  wrapped: ((...args: any[]) => void) | null;

  constructor(spewer: EventSpewer, name: string | symbol, listener: (...args: any[]) => void) {
    this.name = name;
    this.listener = listener;
    this.spewer = spewer;

    const wrapped = function (this: any, ...args: any[]) {
      return listener.apply(this, args);
    };
    // the same trick node uses for `once()`, so `listeners()`, `listenerCount(name, listener)` and
    // `removeListener(name, listener)` still see the original function
    (wrapped as any).listener = listener;
    this.wrapped = wrapped;
  }

  remove(): void {
    if (this.spewer) {
      this.spewer.removeSubscription(this);
    }
    this.listener = null;
    this.spewer = null;
    this.wrapped = null;
  }
}
