function Rmem(): RmemStore{
  var opt = {} as RmemStore, store: Dict<string> = {}, u: undefined;
  opt.put = function(file, data, cb){
  	//setTimeout(function(){ // make async
    store[file] = data;
    cb(null, 1);
    //}, 1);
  };
  opt.get = function(file, cb){
    //setTimeout(function(){ // make async
    var tmp = store[file] || u;
    cb(null, tmp);
    //}, 1);
  };
  return opt;
}

if(typeof window !== "undefined"){
  window.Rmem = Rmem;
} else {
	try{ module.exports = Rmem }catch(e){}
}
/** An in-memory store for lib/radisk.js (files are lost on restart). */
interface RmemStore extends RadiskStore {}

/** `require('gun/lib/rmem')`, `window.Rmem`. */
type RmemStatic = () => RmemStore;

declare global {
	interface Window {
		Rmem?: RmemStatic;
	}
}

import type { Dict } from '../src/types';
import type { RadiskStore } from './types';
