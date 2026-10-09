import type { SeaAesKey, SeaBytes, SeaCb, SeaDecryptOpt, SeaEncrypted, SeaKeyArg, SeaKeys, SeaSettings, SeaShim, SeaStatic } from './types';
    var SEA: SeaStatic = require('./root');
    var shim: SeaShim = require('./shim');
    var S: SeaSettings = require('./settings');
    var aeskey: SeaAesKey = require('./aeskey');

    SEA.decrypt = SEA.decrypt || (async <T>(data: unknown, pair?: SeaKeyArg | null, cb?: SeaCb<T> | null, opt?: SeaDecryptOpt | null): Promise<T | undefined> => { try {
      opt = opt || {};
      var key = ((pair||opt) as SeaKeys).epriv || pair;
      if(!key){
        if(!SEA.I){ throw 'No decryption key.' }
        pair = await SEA.I(null, {what: data, how: 'decrypt', why: opt.why});
        key = pair.epriv || pair;
      }
      var json = await S.parse<SeaEncrypted>(data);
      var buf: SeaBytes, bufiv: SeaBytes, bufct: SeaBytes; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64');
        bufiv = shim.Buffer.from(json.iv, opt.encode || 'base64');
        bufct = shim.Buffer.from(json.ct, opt.encode || 'base64');
        var ct: ArrayBuffer | undefined = await aeskey(key, buf, opt).then((aes) => (/*shim.ossl ||*/ shim.subtle).decrypt({  // Keeping aesKey scope as private as possible...
          name: opt!.name || 'AES-GCM', iv: new Uint8Array(bufiv), tagLength: 128
        }, aes, new Uint8Array(bufct)));
      }catch(e){
        if('utf8' === opt.encode){ throw "Could not decrypt" }
        if(SEA.opt.fallback){
          opt.encode = 'utf8';
          return await SEA.decrypt(data, pair, cb, opt);
        }
      }
      var raw = new shim.TextDecoder('utf8').decode(ct);
      var r = opt.skipParse ? raw as T : await S.parse<T>(raw);
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) { 
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.decrypt;
  