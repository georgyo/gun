import type { JsonReplacer, JsonReviver, NodeCrypto, PeculiarWebCrypto, SeaShim, SeaStatic, TextEncodingModule } from './types';
    const SEA: SeaStatic = require('./root')
    const api = {Buffer: require('./buffer')} as SeaShim
    var o: Partial<Crypto> = {}, u: undefined;

    // ideally we can move away from JSON entirely? unlikely due to compatibility issues... oh well.
    JSON.parseAsync = JSON.parseAsync || function(t,cb,r){ var u: undefined; try{ cb(u, JSON.parse(t,r as Exclude<typeof r, null>)) }catch(e){ cb(e) } }
    JSON.stringifyAsync = JSON.stringifyAsync || function(v,cb,r,s){ var u: undefined; try{ cb(u, JSON.stringify(v,r as Exclude<typeof r, null>,s)) }catch(e){ cb(e) } }

    api.parse = function<T>(t: string, r?: JsonReviver){ return new Promise<T>(function(res, rej){
      JSON.parseAsync!(t,function(err, raw){ err? rej(err) : res(raw as T) },r);
    })}
    api.stringify = function(v: unknown, r?: JsonReplacer, s?: string | number){ return new Promise<string | undefined>(function(res, rej){
      JSON.stringifyAsync!(v,function(err, raw){ err? rej(err) : res(raw) },r,s);
    })}

    if(SEA.window){
      api.crypto = SEA.window.crypto || SEA.window.msCrypto
      api.subtle = (api.crypto||o).subtle || (api.crypto||o).webkitSubtle!;
      api.TextEncoder = SEA.window.TextEncoder;
      api.TextDecoder = SEA.window.TextDecoder;
      api.random = (len) => api.Buffer.from(api.crypto.getRandomValues(new Uint8Array(api.Buffer.alloc(len))));
    }
    if(!api.TextDecoder)
    {
      const { TextEncoder, TextDecoder } = require((u+'' == typeof MODULE?'.':'')+'./lib/text-encoding', 1) as TextEncodingModule;
      api.TextDecoder = TextDecoder;
      api.TextEncoder = TextEncoder;
    }
    if(!api.crypto)
    {
      try
      {
      var crypto = require('crypto', 1) as NodeCrypto;
      Object.assign(api, {
        crypto,
        random: (len: number) => api.Buffer.from(crypto.randomBytes(len))
      });      
      const { Crypto: WebCrypto } = require('@peculiar/webcrypto', 1) as PeculiarWebCrypto;
      api.ossl = api.subtle = new WebCrypto({directory: 'ossl'}).subtle // ECDH
    }
    catch(e){
      console.log("Please `npm install @peculiar/webcrypto` or add it to your package.json !");
    }}

    module.exports = api
  