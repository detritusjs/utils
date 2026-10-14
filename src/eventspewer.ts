import { EventEmitter } from 'events';

let Emitter = EventEmitter;
try {
  Emitter = require('eventemitter3');
} catch(e) {}


export class EventSpewer extends Emitter implements EventEmitter {
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
    this.on(name, listener);

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
    if (subscription.listener) {
      const { listener, name } = subscription;
      const count = () => this.listeners(name).filter((x) => x === listener).length;
      const before = count();
      (super.removeListener as Function).call(this, name, listener);
      for (let attached = count(); attached < before - 1; attached++) {
        (super.on as Function).call(this, name, listener);
      }
    }
  }

  removeListener(name: string | symbol, listener: (...args: any[]) => void, ...args: Array<any>): this {
    (super.removeListener as Function).call(this, name, listener, ...args);
    if (this._subscriptions) {
      const subscriptions = this._subscriptions.get(name);
      if (subscriptions && subscriptions.some((subscription) => subscription.listener === listener)) {
        let attached = this.listeners(name).filter((x) => x === listener).length;
        for (let i = subscriptions.length - 1; 0 <= i; i--) {
          const subscription = subscriptions[i];
          if (subscription.listener === listener) {
            if (attached) {
              attached--;
            } else {
              subscriptions.splice(i, 1);
              subscription.listener = null;
              subscription.spewer = null;
            }
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

  constructor(spewer: EventSpewer, name: string | symbol, listener: (...args: any[]) => void) {
    this.name = name;
    this.listener = listener;
    this.spewer = spewer;
  }

  remove(): void {
    if (this.spewer) {
      this.spewer.removeSubscription(this);
    }
    this.listener = null;
    this.spewer = null;
  }
}
