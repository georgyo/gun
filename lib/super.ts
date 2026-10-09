;(function(){
	var Gun: SuperGun = (typeof window !== "undefined")? window.Gun : require('../gun');
	var Rad: RadixStatic = (Gun.window||{} as Partial<Window>).Radix || require('./radix');
	/// Store the subscribes
	Gun.subs = Rad();
	function input(this: OntoListener<Msg, RootMeta>, msg: Msg){
		var at = this.as, to = this.to, peer = (msg._||empty).via;
		var get = msg.get, soul, key: Lex['.'];
		if(!peer || !get){ return to.next(msg) }
		// console.log("super", msg);
		if(soul = get['#'] as /* a LEX match on souls is not handled */ Soul){
			if(key = get['.']){

			} else {

			}
			if (!peer.id) {console.log('[*** WARN] no peer.id %s', soul);}
			var subs = Gun.subs(soul) as string | undefined || null;
			var tmp: string[] | string = subs ? subs.split(',') : [], p = at.opt.peers;
			if (subs) {
				Gun.obj.map(subs.split(','), function(peerid) {
					if (peerid in p) { (tmp as string[]).push(peerid); }
				});
			}
			if (tmp.indexOf(peer.id as /* or undefined (warned above) */ string) === -1) { tmp.push(peer.id as string);}
			tmp = tmp.join(',');
			Gun.subs(soul, tmp);
			var dht: Dict<string> = {};
			dht[soul] = tmp;
			at.opt.mesh!.say({dht:dht}, peer);
		}
		to.next(msg);
	}
	var empty: Partial<MsgMeta> = {}, u: undefined;
	if(Gun.window){ return }
	try{module.exports = input}catch(e){}
}());


/** `require('gun/lib/super')`: a root `in` listener for relay peers that tracks which peers subscribed to which souls (`Gun.subs`) and tells them (`dht`). */
type SuperInput = (this: OntoListener<Msg, RootMeta>, msg: Msg) => void;

/** `Gun` with what lib/super.js sets (`subs`) and the deprecated utilities (src/deprecated.ts) it uses. */
type SuperGun = GunStatic & Pick<GunDeprecated, 'obj'> & {
	subs: RadixFn;
};

declare module '../src/types' {
	interface GunStatic {
		/** lib/super.js: the comma separated ids of the peers subscribed to each soul. */
		subs?: RadixFn;
	}
	interface Msg {
		/** lib/super.js: the peers subscribed to a soul (comma separated ids, by soul). */
		dht?: Dict<string>;
	}
}

import type { Dict, GunDeprecated, GunStatic, Lex, Msg, MsgMeta, OntoListener, RootMeta, Soul } from '../src/types'; import type { RadixFn, RadixStatic } from './types';
