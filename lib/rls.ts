;(function(){

  function Store(opt?: RlsOpt): RlsStore{
    opt = opt || {};
    opt.file = String(opt.file || 'radata');
    var store = function Store(){} as RlsStore;

    var ls: Storage = localStorage;
    store.put = function(key, data, cb){ ls[''+key] = data; cb(null, 1) }
    store.get = function(key, cb){ cb(null, ls[''+key]) }

    return store;
  }

  if(typeof window !== "undefined"){
    (Store.window = window).RlocalStorage = Store;
  } else {
    try{ module.exports = Store }catch(e){}
  }

  try{
    var Gun: GunStatic = (Store as /* outside a browser `window` is unset: this throws and the hook is not installed (upstream behaviour) */ RlsStatic).window!.Gun || require('../gun');
    Gun.on('create', function(root){
      this.to.next(root);
      root.opt.store = root.opt.store || Store(root.opt);
    });
  }catch(e){}

}());
/** The options of lib/rls.js (the root's `opt`). */
interface RlsOpt {
	/** Normalized (default `'radata'`), unused otherwise: every file is a key of `localStorage`. */
	file?: string;
}

/** A `localStorage` store for lib/radisk.js. */
interface RlsStore extends RadiskStore {
	(): void;
}

/** `require('gun/lib/rls')`, `window.RlocalStorage`. */
interface RlsStatic {
	(opt?: RlsOpt): RlsStore;
	/** The browser window, set when loaded in a browser. */
	window?: Window & typeof globalThis;
}

declare global {
	interface Window {
		RlocalStorage?: RlsStatic;
	}
}

import type { GunStatic } from '../src/types';
import type { RadiskStore } from './types';
