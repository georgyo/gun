(function(){

  /**
  Radix AsyncStorage adapter
  make sure to pass AsyncStorage instance in opt.AsyncStorage
  example:
  import AsyncStorage from 'react-native'
  const store = Store({AsyncStorage})
  const gun = new Gun({store,peers:[...]})
  **/
  function Store(opt?: RasOpt): RasStore{
    opt = opt || {};
    const store = function(){}
    const as = opt.AsyncStorage!; // required (it throws without)
    store.put = function(key: string, data: string, cb: StoreAck)
      { 
        as.setItem(''+key,data)
          .then(_ => cb(null,1))
          .then(_ => console.log("ok put"))
          .catch(_ => {
            console.error(`failed saving to asyncstorage`,{key, data})
            cb(null,0)
          })
      }

    store.get = (key: string,cb: RasGetCb) => {
        as.getItem(''+key)
          .then(data => cb(null,data))
          .then(_ => console.log("ok get"))
          .catch(_ => {
            console.error(`failed fetching from asyncstorage`,{key})
            cb(null,0)
          })
      }
    
    return store;
  }

  module.exports = Store

}());

/** The parts of React Native's AsyncStorage lib/ras.js uses. */
interface AsyncStorageLike {
  setItem(key: string, value: string): Promise<unknown>;
  getItem(key: string): Promise<string | null>;
}

interface RasOpt {
  /** The AsyncStorage instance to store in (required). */
  AsyncStorage?: AsyncStorageLike;
}

/** A `get` callback: `null` when the file does not exist, `0` when reading failed. */
type RasGetCb = (err: null, data?: StoreData | null | 0) => void;

/**
 * A store for radisk (`opt.store`, see `RadiskStore`) in AsyncStorage.
 * Failures are acked with `0`, not an error; a missing file with `null`.
 */
interface RasStore {
  (): void;
  put(file: string, data: string, cb: StoreAck): void;
  get(file: string, cb: RasGetCb): void;
}

/** `require('gun/lib/ras')`: `Store({AsyncStorage})`. */
type RasStatic = (opt?: RasOpt) => RasStore;

import type { StoreAck, StoreData } from './types';
