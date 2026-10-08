function Nomem(): NomemStore{
  var opt = {} as NomemStore, u: undefined;
  opt.put = function(file, data, cb){ cb(null, -9) }; // dev/null!
  opt.get = function(file, cb){ cb(null) };
  return opt;
}
if(typeof window !== "undefined"){
  window.Nomem = Nomem;
} else {
	try{ module.exports = Nomem }catch(e){}
}
/** A store for lib/radisk.js that keeps nothing: writes ack `-9`, reads find nothing. */
interface NomemStore extends RadiskStore {}

/** `require('gun/lib/nomem')`, `window.Nomem`. */
type NomemStatic = () => NomemStore;

declare global {
	interface Window {
		Nomem?: NomemStatic;
	}
}

import type { RadiskStore } from './types';
