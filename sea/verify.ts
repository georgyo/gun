import type { Dict, PutAtom } from '../src/types'; import type { SeaCb, SeaKeyArg, SeaKeys, SeaSettings, SeaSha256, SeaShim, SeaSigned, SeaStatic, SeaVerifyOpt } from './types';
    var SEA: SeaStatic = require('./root');
    var shim: SeaShim = require('./shim');
    var S: SeaSettings = require('./settings');
    var sha: SeaSha256 = require('./sha256');
    var u: undefined;

    SEA.verify = SEA.verify || (async <T>(data: unknown, pair: SeaKeyArg | false, cb?: SeaCb<T> | null, opt?: SeaVerifyOpt | null): Promise<T | undefined> => { try {
      var json = await S.parse<SeaSigned>(data);
      if(false === pair){ // don't verify!
        var raw = await S.parse<T>(json.m);
        if(cb){ try{ cb(raw) }catch(e){console.log(e)} }
        return raw;
      }
      opt = opt || {};
      // SEA.I // verify is free! Requires no user permission.
      var pub = (pair as SeaKeys).pub || pair as string;
      var key = SEA.opt.slow_leak? await SEA.opt.slow_leak(pub) : await (shim.ossl || shim.subtle).importKey('jwk', S.jwk(pub), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
      var hash = await sha(json.m);
      var buf, sig, check, tmp: undefined; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64'); // NEW DEFAULT!
        sig = new Uint8Array(buf);
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash));
        if(!check){ throw "Signature did not match." }
      }catch(e){
        if(SEA.opt.fallback){
          return await SEA.opt.fall_verify(data, pair, cb, opt);
        }
      }
      var r = check? await S.parse<T>(json.m) : u;

      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e); // mismatched owner FOR MARTTI
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.verify;
    // legacy & ossl memory leak mitigation:

    var knownKeys: Dict<Promise<CryptoKey>> = {};
    var keyForPair = SEA.opt.slow_leak = pair => {
      if (knownKeys[pair]) return knownKeys[pair];
      var jwk = S.jwk(pair);
      knownKeys[pair] = (shim.ossl || shim.subtle).importKey("jwk", jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ["verify"]);
      return knownKeys[pair]!;
    };

    var O = SEA.opt;
    SEA.opt.fall_verify = async function<T>(data: unknown, pair: SeaKeyArg, cb: SeaCb<T> | null | undefined, opt: SeaVerifyOpt, f?: number): Promise<T | undefined>{
      if(f === SEA.opt.fallback){ throw "Signature did not match" } f = f || 1;
      var tmp = (data||'') as Partial<PutAtom>;
      data = SEA.opt.unpack(data) || data;
      var json = await S.parse<SeaSigned>(data), pub = (pair as SeaKeys).pub || pair as string, key = await SEA.opt.slow_leak(pub);
      var hash = (f <= SEA.opt.fallback)? shim.Buffer.from(await shim.subtle.digest({name: 'SHA-256'}, new shim.TextEncoder().encode(await S.parse<string>(json.m)))) : await sha(json.m); // this line is old bad buggy code but necessary for old compatibility.
      var buf; var sig; var check; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64') // NEW DEFAULT!
        sig = new Uint8Array(buf)
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash))
        if(!check){ throw "Signature did not match." }
      }catch(e){ try{
        buf = shim.Buffer.from(json.s, 'utf8') // AUTO BACKWARD OLD UTF8 DATA!
        sig = new Uint8Array(buf)
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash))
        }catch(e){
        if(!check){ throw "Signature did not match." }
        }
      }
      var r = check? await S.parse<T>(json.m) : u;
      O.fall_soul = tmp['#']; O.fall_key = tmp['.']; O.fall_val = data; O.fall_state = tmp['>'];
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    }
    SEA.opt.fallback = 2;

  