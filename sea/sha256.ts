import type { SeaBytes, SeaShim } from './types';
    var shim: SeaShim = require('./shim');
    module.exports = async function(d: unknown, o?: string): Promise<SeaBytes>{
      var t = (typeof d == 'string')? d : await shim.stringify(d);
      var hash = await shim.subtle.digest({name: o||'SHA-256'}, new shim.TextEncoder().encode(t));
      return shim.Buffer.from(hash);
    }
  