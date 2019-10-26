import { EventEmitter } from 'events';

let Emitter = EventEmitter;
try {
  Emitter = require('eventemitter3');
} catch(e) {}


export class EventSpewer extends Emitter implements EventEmitter {
  /**
   * @ignore
   */
  _events: any;

  constructor() {
    super();
    Object.defineProperties(this, {
      _events: {enumerable: false},
      _eventsCount: {enumerable: false},
      _maxListeners: {enumerable: false},
    });
  }

  hasEventListener(name: string): boolean {
    return !!this._events && (name in this._events);
  }

  subscribe(event: string | symbol, listener: (...args: any[]) => void): EventSubscription {
    const subscription = new EventSubscription(this, event, listener);
    this.on(event, listener);
    return subscription;
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
    if (this.listener && this.spewer) {
      this.spewer.removeListener(this.name, this.listener);
    }
    this.listener = null;
    this.spewer = null;
  }
}
