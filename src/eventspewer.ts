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
  _subscriptions: Array<EventSubscription> | undefined = undefined;

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
      this._subscriptions = [];
    }
    this._subscriptions.push(subscription);
    return subscription;
  }

  removeSubscription(subscription: EventSubscription): void {
    if (this._subscriptions) {
      const index = this._subscriptions.indexOf(subscription);
      if (index !== -1) {
        if (this._subscriptions.length === 1) {
          this._subscriptions.pop();
        } else {
          this._subscriptions.splice(index, 1);
        }
      }
      if (!this._subscriptions.length) {
        this._subscriptions = undefined;
      }
    }
    if (subscription.listener) {
      this.removeListener(subscription.name, subscription.listener);
    }
  }

  removeListener(name: string | symbol, listener: (...args: any[]) => void, ...args: Array<any>): this {
    (super.removeListener as Function).call(this, name, listener, ...args);
    if (this._subscriptions) {
      let attached = this.listeners(name).filter((x) => x === listener).length;
      for (let i = this._subscriptions.length - 1; 0 <= i; i--) {
        const subscription = this._subscriptions[i];
        if (subscription.name === name && subscription.listener === listener) {
          if (attached) {
            attached--;
          } else {
            this._subscriptions.splice(i, 1);
            subscription.listener = null;
            subscription.spewer = null;
          }
        }
      }
      if (!this._subscriptions.length) {
        this._subscriptions = undefined;
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
        for (let subscription of this._subscriptions.slice()) {
          if (subscription.name === name) {
            subscription.remove();
          }
        }
      } else {
        while (this._subscriptions.length) {
          const subscription = this._subscriptions.shift();
          if (subscription) {
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
      const subscriptions = this._subscriptions;
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
