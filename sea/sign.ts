import type { SeaCb, SeaKeyArg, SeaKeys, SeaPair, SeaSettings, SeaSha256, SeaShim, SeaSign, SeaSignOpt, SeaSigned, SeaStatic } from './types';
    var SEA: SeaStatic = require('./root');
    var shim: SeaShim = require('./shim');
    var S: SeaSettings = require('./settings');
    var sha: SeaSha256 = require('./sha256');
    var u: undefined;

    SEA.sign = SEA.sign || (async (data: unknown, pair: SeaKeyArg | null | undefined, cb?: SeaCb<string | SeaSigned> | null, opt?: SeaSignOpt): Promise<string | SeaSigned | undefined> => { try {
      opt = opt || {};
      if(!((pair||opt) as SeaKeys).priv){
        if(!SEA.I){ throw 'No signing key.' }
        pair = await SEA.I(null, {what: data, how: 'sign', why: opt.why});
      }
      if(u === data){ throw '`undefined` not allowed.' }
      var json = await S.parse(data);
      var check = opt.check = opt.check || json;
      if(SEA.verify && (SEA.opt.check(check) || (check && (check as SeaSigned).s && (check as SeaSigned).m))
      && u !== await SEA.verify(check, pair!)){ // don't sign if we already signed it.
        var r: string | SeaSigned = await S.parse<SeaSigned>(check);
        if(!opt.raw){ r = 'SEA' + await shim.stringify(r) }
        if(cb){ try{ cb(r) }catch(e){console.log(e)} }
        return r;
      }
      var pub = (pair as SeaPair).pub;
      var priv = (pair as SeaPair).priv;
      var jwk = S.jwk(pub, priv);
      var hash = await sha(json);
      var sig = await (shim.ossl || shim.subtle).importKey('jwk', jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign'])
      .then((key) => (shim.ossl || shim.subtle).sign({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, new Uint8Array(hash))) // privateKey scope doesn't leak out from here!
      var r: string | SeaSigned = {m: json, s: shim.Buffer.from(sig, 'binary').toString(opt.encode || 'base64')}
      if(!opt.raw){ r = 'SEA' + await shim.stringify(r) }

      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }}) as SeaSign;

    module.exports = SEA.sign;
  