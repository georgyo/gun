import type { SeaBytes, SeaKeyArg, SeaSettings, SeaSha256, SeaShim } from './types';
    var shim: SeaShim = require('./shim');
    var S: SeaSettings = require('./settings');
    var sha256hash: SeaSha256 = require('./sha256');

    const importGen = async (key: SeaKeyArg, salt?: SeaBytes, opt?: unknown) => {
      //const combo = shim.Buffer.concat([shim.Buffer.from(key, 'utf8'), salt || shim.random(8)]).toString('utf8') // old
      opt = opt || {};
      const combo = key + (salt || shim.random(8)).toString('utf8'); // new
      const hash = shim.Buffer.from(await sha256hash(combo), 'binary')
      
      const jwkKey = S.keyToJwk(hash)      
      return await shim.subtle.importKey('jwk', jwkKey, {name:'AES-GCM'}, false, ['encrypt', 'decrypt'])
    }
    module.exports = importGen;
  