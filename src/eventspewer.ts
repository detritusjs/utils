import { EventEmitter } from 'events';

let Emitter = EventEmitter;
try {
  Emitter = require('eventemitter3');
} catch(e) {}


export class EventSpewer extends Emitter implements EventEmitter {
  /**
   * @ignore
   */
  _events: {[key: string]: any} | undefined;

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
    if (subscription.listener) {
      this.removeListener(subscription.name, subscription.listener);
    }
    if (this._subscriptions) {
      const index = this._subscriptions.indexOf(subscription);
      if (index !== 1) {
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
  }

  removeAllListeners(name?: string | symbol): this {
    if (this._subscriptions) {
      if (name !== undefined) {
        for (let subscription of this._subscriptions) {
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
      }
    }
    return super.removeAllListeners(name);
  }

  removeAllSubscriptions(): this {
    if (this._subscriptions) {
      while (this._subscriptions.length) {
        const subscription = this._subscriptions.shift();
        if (subscription) {
          subscription.remove();
        }
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
