import type { AnyMeta, Chain, ChainMeta, GunOptions, GunStatic, NodeLike, NodeMeta, RootMeta } from '../src/types'; import type { ProtoCtor, SeaStatic, SeaUserIs, SeaUuidCb, UserChain, UserStatic } from './types'; declare namespace User { var GUN: GunStatic; var SEA: SeaStatic }
    var SEA: SeaStatic = require('./sea'), Gun: GunStatic, u: undefined;
    if(SEA.window){
      Gun = SEA.window.GUN || {chain:{}} as GunStatic;
    } else {
      Gun = require((u+'' == typeof MODULE?'.':'')+'./gun', 1) as GunStatic;
    }
    SEA.GUN = Gun;

    function User(this: Chain<ChainMeta>, root?: unknown){ 
      this._ = {$: this} as ChainMeta;
    }
    User.prototype = (function(){ function F(){}; F.prototype = Gun.chain; return new (F as ProtoCtor)() }()) // Object.create polyfill
    User.prototype.constructor = User as UserStatic;

    // let's extend the gun chain with a `user` function.
    // only one user can be logged in at a time, per gun instance.
    Gun.chain.user = function(this: Chain, pub?: string | NodeLike): Chain{
      var gun = this, root: Chain<RootMeta> | RootMeta = gun.back(-1), user;
      if(pub){
        pub = SEA.opt.pub(((pub as NodeLike)._||'' as NodeMeta)['#']) || pub;
        return root.get('~'+pub);
      }
      if(user = root.back('user')){ return user }
      var root: Chain<RootMeta> | RootMeta = (root._), at: AnyMeta = root, uuid = at.opt.uuid || lex;
      (at = (user = at.user = gun.chain(new (User as UserStatic)) as UserChain)._).opt = {} as GunOptions;
      at.opt.uuid = function(cb?: number | SeaUuidCb){
        var id = uuid(), pub: UserChain | SeaUserIs | string | undefined = (root as RootMeta).user;
        if(!pub || !(pub = pub.is) || !(pub = pub.pub)){ return id }
        id = '~' + pub + '/' + id;
        if(cb && (cb as SeaUuidCb).call){ (cb as SeaUuidCb)(null, id) }
        return id;
      }
      return user;
    } as Chain['user']
    function lex(){ return Gun.state().toString(36).replace('.','') }
    Gun.User = User as UserStatic;
    User.GUN = Gun;
    User.SEA = Gun.SEA = SEA;
    module.exports = User;
  