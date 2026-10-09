;(function(){
/* // from @jabis
if (navigator.storage && navigator.storage.estimate) {
  const quota = await navigator.storage.estimate();
  // quota.usage -> Number of bytes used.
  // quota.quota -> Maximum number of bytes available.
  const percentageUsed = (quota.usage / quota.quota) * 100;
  console.log(`You've used ${percentageUsed}% of the available storage.`);
  const remaining = quota.quota - quota.usage;
  console.log(`You can write up to ${remaining} more bytes.`);
}
*/
  function Store(opt?: RindexedOpt): RindexedStore{
    opt = opt || {};
    opt.file = String(opt.file || 'radata');
    var store: RindexedStore | undefined = (Store as RindexedFiles)[opt.file], db: IDBDatabase | null = null, u: undefined;

    if(store){
      console.log("Warning: reusing same IndexedDB store and options as 1st.");
      return (Store as RindexedFiles)[opt.file]!;
    }
    store = (Store as RindexedFiles)[opt.file] = function(){} as RindexedStore;

    try{opt.indexedDB = opt.indexedDB || (Store as RindexedStatic).indexedDB || indexedDB}catch(e){}
    try{if(!opt.indexedDB || 'file:' == location.protocol){
      var s = store.d || (store.d = {});
      store.put = function(f, d, cb){ s[f] = d; setTimeout(function(){ cb(null, 1) },250) };
      store.get = function(f, cb){ setTimeout(function(){ cb(null, s[f] || u) },5) };
      console.log('Warning: No indexedDB exists to persist data to!');
      return store;
    }}catch(e){}
    

    store.start = function(){
      var o = indexedDB.open(opt.file!, 1);
      o.onupgradeneeded = function(eve){ ((eve.target as IDBOpenDBRequest).result).createObjectStore(opt.file!) }
      o.onsuccess = function(){ db = o.result }
      o.onerror = function(eve){ console.log(eve||1); }
    }; store.start();

    store.put = function(key, data, cb){
      if(!db){ setTimeout(function(){ store!.put(key, data, cb) },1); return }
      var tx = db.transaction([opt.file!], 'readwrite');
      var obj = tx.objectStore(opt.file!) as RindexedObjectStore;
      var req = obj.put(data, ''+key) as RindexedRequest;
      req.onsuccess = obj.onsuccess = (tx as RindexedTransaction).onsuccess = function(){ cb(null, 1) }
      req.onabort = obj.onabort = tx.onabort = function(eve: Event){ cb(eve||'put.tx.abort') }
      req.onerror = obj.onerror = tx.onerror = function(eve: Event){ cb(eve||'put.tx.error') }
    }

    store.get = function(key, cb){
      if(!db){ setTimeout(function(){ store!.get(key, cb) },9); return }
      var tx = db.transaction([opt.file!], 'readonly');
      var obj = tx.objectStore(opt.file!);
      var req = obj.get(''+key) as RindexedRequest<StoreData | undefined>;
      req.onsuccess = function(){ cb(null, req.result) }
      req.onabort = function(eve: Event){ cb(eve||4) }
      req.onerror = function(eve: Event){ cb(eve||5) }
    }
    setInterval(function(){ db && db.close(); db = null; store!.start!() }, 1000 * 15); // reset webkit bug?
    return store;
  }

  if(typeof window !== "undefined"){
    ((Store as RindexedStatic).window = window).RindexedDB = Store;
    (Store as RindexedStatic).indexedDB = window.indexedDB; // safari bug
  } else {
    try{ module.exports = Store }catch(e){}
  }

  try{
    var Gun: GunStatic = (Store as /* outside a browser `window` is unset: this throws and the hook is not installed (upstream behaviour) */ RindexedStatic).window!.Gun || require('../gun');
    Gun.on('create', function(root){
      this.to.next(root);
      root.opt.store = root.opt.store || Store(root.opt);
    });
  }catch(e){}

}());
/** The options of lib/rindexed.js (the root's `opt`). */
interface RindexedOpt {
	/** The database and object store name (default `'radata'`), also the key of the cached store. */
	file?: string;
	/** The IndexedDB to use (default: `window.indexedDB`, else the global). Only checked: the global `indexedDB` is the one used. */
	indexedDB?: IDBFactory;
}

/** An IndexedDB store for lib/radisk.js. Without IndexedDB (or from `file:`), files are kept in memory in `d`. */
interface RindexedStore extends RadiskStore {
	(): void;
	/** The in-memory fallback. */
	d?: Dict<string>;
	/** (Re)open the database (every 15s, for a webkit bug). */
	start?: () => void;
}

/** `require('gun/lib/rindexed')`, `window.RindexedDB`. It also keeps the stores by name. */
interface RindexedStatic {
	(opt?: RindexedOpt): RindexedStore;
	/** The browser window, set when loaded in a browser. */
	window?: Window & typeof globalThis;
	/** `window.indexedDB`, kept at load (safari bug). */
	indexedDB?: IDBFactory;
}

/** The stores by name, kept on `Store` itself (upstream quirk: a store named `window` or `indexedDB` would clash). */
interface RindexedFiles {
	(opt?: RindexedOpt): RindexedStore;
	[file: string]: RindexedStore | undefined;
}

/** Requests get an `onabort` too (never fired by IndexedDB: harmless). */
interface RindexedRequest<T = IDBValidKey> extends IDBRequest<T> {
	onabort?: ((this: IDBRequest<T>, eve: Event) => unknown) | null;
}

/** Upstream also sets `onsuccess` / `onabort` / `onerror` on the object store and the transaction (which only fires `complete`): harmless. */
interface RindexedObjectStore extends IDBObjectStore {
	onsuccess?: ((this: IDBRequest, eve: Event) => unknown) | null;
	onabort?: ((this: IDBRequest, eve: Event) => unknown) | null;
	onerror?: ((this: IDBRequest, eve: Event) => unknown) | null;
}

interface RindexedTransaction extends IDBTransaction {
	onsuccess?: ((this: IDBRequest, eve: Event) => unknown) | null;
}

declare global {
	interface Window {
		RindexedDB?: RindexedStatic;
	}
}

import type { Dict, GunStatic } from '../src/types';
import type { RadiskStore, StoreData } from './types';
