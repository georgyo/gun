import type { SeaKeys, SeaSettings, SeaSha256, SeaShim, SeaStatic } from './types';
    var SEA: SeaStatic = require('./root');
    var shim: SeaShim = require('./shim');
    var S: SeaSettings = require('./settings');
    var sha: SeaSha256 = require('./sha256');
    var u: undefined;

    SEA.work = SEA.work || (async (data, pair, cb, opt) => { try { // used to be named `proof`
      var salt = ((pair||{}) as SeaKeys).epub || pair; // epub not recommended, salt should be random!
      opt = opt || {};
      if(salt instanceof Function){
        cb = salt;
        salt = u;
      }
      data = (typeof data == 'string')? data : await shim.stringify(data);
      if('sha' === (opt.name||'').toLowerCase().slice(0,3)){
        var rsha = shim.Buffer.from(await sha(data, opt.name), 'binary').toString(opt.encode || 'base64')
        if(cb){ try{ cb(rsha) }catch(e){console.log(e)} }
        return rsha;
      }
      salt = salt || shim.random(9);
      var key = await (shim.ossl || shim.subtle).importKey('raw', new shim.TextEncoder().encode(data as string), {name: opt.name || 'PBKDF2'}, false, ['deriveBits']);
      var work = await (shim.ossl || shim.subtle).deriveBits({
        name: opt.name || 'PBKDF2',
        iterations: opt.iterations || S.pbkdf2.iter,
        salt: new shim.TextEncoder().encode((opt.salt || salt) as string),
        hash: opt.hash || S.pbkdf2.hash,
      }, key, opt.length || (S.pbkdf2.ks * 8))
      data = shim.random((data as string).length)  // Erase data in case of passphrase
      var r = shim.Buffer.from(work, 'binary').toString(opt.encode || 'base64')
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) { 
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.work;
  