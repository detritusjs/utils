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
}
