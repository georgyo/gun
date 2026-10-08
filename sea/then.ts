import type { Chain, ChainData, GunStatic, OnceOpt } from '../src/types'; declare var GUN: GunStatic | undefined;
    var u: undefined, Gun = (''+u != typeof GUN)? (GUN||{chain:{}} as GunStatic) : require((''+u === typeof MODULE?'.':'')+'./gun', 1) as GunStatic;
    Gun.chain.then = function(this: Chain, cb?: (data: ChainData | undefined) => unknown, opt?: OnceOpt){
      var gun = this, p = (new Promise<ChainData | undefined>(function(res, rej){
        gun.once(res, opt);
      }));
      return cb? p.then(cb) : p;
    } as Chain['then']
  