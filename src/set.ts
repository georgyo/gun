import type { Chain, Dict, GunStatic, Link, NodeLike, NodeMeta, PutAs, SetCb, Soul } from './types';
var Gun: GunStatic = require('./root');
Gun.chain.set = function(this: Chain, item: unknown, cb?: SetCb, opt?: PutAs): Chain{
	var gun = this, root = gun.back(-1), soul: Soul | undefined, tmp: boolean | Soul | Dict<Link>;
	cb = cb || function(){};
	opt = opt || {}; opt.item = opt.item || item;
	if(soul = ((((item||'') as NodeLike)._||'') as NodeMeta)['#']){ (item = {} as Link)['#'] = soul } // check if node, make link.
	if('string' == typeof (tmp = Gun.valid(item))){ return gun.get(soul = tmp).put(item, cb, opt) } // check if link
	if(!Gun.is(item)){
		if(Object.plain(item)){
			item = root.get(soul = gun.back('opt.uuid')()).put(item);
		}
		return gun.get(soul || root.back('opt.uuid')(7)).put(item, cb, opt);
	}
	gun.put(function(go: (data: unknown) => void){
		item.get(function(soul, o, msg){ // TODO: BUG! We no longer have this option? & go error not handled?
			if(!soul){ return cb.call(gun, {err: Gun.log('Only a node can be linked! Not "' + msg.put + '"!')}) }
			(tmp = {} as Dict<Link>)[soul as Soul] = {'#': soul as Soul}; go(tmp);
		},true);
	})
	return item;
}
	
