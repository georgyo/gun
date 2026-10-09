var Gun: GunStatic = (typeof window !== "undefined")? window.Gun : require('../gun');

// Returns a gun reference in a promise and then calls a callback if specified
Gun.chain.promise = function(this: Chain, cb?: (ack: PromiseAck) => unknown) {
  var gun = this, cb: ((ack: PromiseAck) => unknown) | undefined = cb || function(ctx: PromiseAck) { return ctx };
  return (new Promise<PromiseAck>(function(res, rej) {
    gun.once(function(data, key){
    	res({put: data, get: key, gun: this}); // gun reference is returned by promise
    });
  })).then(cb); //calling callback with resolved data
} as Chain['promise'];

// Returns a promise for the data, key of the gun call
Gun.chain.then = function(this: Chain, cb?: (data: ChainData | undefined) => unknown) {
	var gun = this;
  var p = (new Promise((res: (data: ChainData | undefined, key?: string) => void, rej)=>{
    gun.once(function (data, key) {
      res(data, key); //call resolve when data is returned
    })
  }))
  return cb ? p.then(cb) : p;
} as Chain['then'];


/** What `.promise()` resolves with. */
interface PromiseAck {
  put: ChainData | undefined;
  get: string | undefined;
  gun: Chain;
}

declare module '../src/types' {
  interface Chain {
    /** lib/then.js: the data once, with its key and chain. */
    promise(this: Chain): Promise<PromiseAck>;
    promise<R>(this: Chain, cb: (ack: PromiseAck) => R | PromiseLike<R>): Promise<R>;
    // `then` (lib/then.js and sea/then.js) is declared in sea/types.ts.
  }
}

import type { Chain, ChainData, GunStatic } from '../src/types';
