;(function(){

	function Radix(): Radix2Fn{
		var radix = function(key: RadixKey, val?: unknown, t?: RadixTree): unknown{
			key = ''+key;
			if(!t && u !== val){ 
				radix.last = (key < (radix.last as /* undefined at first, which compares false */ string))? radix.last! : key;
				delete (radix.$||{} as RadixTree)[_];
			}
			t = t || radix.$ || (radix.$ = {});
			if(!key && Object.keys(t).length){ return t }
			var i = 0, l = key.length-1, k = key[i], at: RadixTree | undefined, tmp: unknown;
			while(!(at = t[k] as RadixTree | undefined) && i < l){
				k += key[++i];
			}
			radix.at = t; /// caching to external access.
			if(!at){
				if(!map(t, function(r, s){
					var ii: number | string = 0, kk = '';
					if((s||'').length){ while(s[ii] == key[ii]){
						kk += s[ii++];
					} }
					if(kk){
						if(u === val){
							if(ii <= l){ return }
							return ((tmp || (tmp = {})) as RadixTree)[s.slice(ii)] = r;
						}
						var __: RadixTree = {};
						__[s.slice(ii)] = r;
						ii = key.slice(ii);
						('' === ii)? (__[''] = val) : ((__[ii] = {} as RadixTree)[''] = val);
						t[kk] = __;
						delete t[s];
						return true;
					}
				})){
					if(u === val){ return; }
					((t[k] || (t[k] = {})) as RadixTree)[''] = val;
				}
				if(u === val){
					return tmp;
				}
			} else 
			if(i == l){
				if(u === val){ return (u === (tmp = at['']))? at : tmp }
				at[''] = val;
			} else {
				if(u !== val){ delete at[_] }
				return radix(key.slice(++i), val, at || (at = {}));
			}
		} as Radix2Fn
		return radix;
	};

	Radix.map = function map(radix: RadixFn | RadixTree, cb: RadixEach, opt?: true | RadixMapOpt, pre?: string[]): unknown{ pre = pre || [];
		var t = ('function' == typeof radix)? radix.$ || {} : radix;
		if(!t){ return }
		var keys = ((t[_]||no) as Partial<RadixSort>).sort || (t[_] = function $(): RadixSort{ ($ as RadixSort).sort = Object.keys(t).sort(); return $ as RadixSort }()).sort;
		//var keys = Object.keys(t).sort();
		opt = (true === opt)? {branch: true} : (opt || {});
		if(opt.reverse){ keys = keys.slice().reverse() }
		var start = opt.start, end = opt.end;
		var i = 0, l = keys.length;
		for(;i < l; i++){ var key = keys[i], tree = t[key] as RadixTree | undefined, tmp: unknown, p: string[], pt: string;
			if(!tree || '' === key || _ === key){ continue }
			p = pre.slice(); p.push(key);
			pt = p.join('');
			if(u !== start && pt < (start||'').slice(0,pt.length)){ continue }
			if(u !== end && (end || '\uffff') < pt){ continue }
			if(u !== (tmp = tree[''])){
				tmp = cb(tmp, pt, key, pre);
				if(u !== tmp){ return tmp }
			} else
			if(opt.branch){
				tmp = cb(u, pt, key, pre);
				if(u !== tmp){ return tmp }
			}
			pre = p;
			tmp = map(tree, cb, opt, pre);
			if(u !== tmp){ return tmp }
			pre.pop();
		}
	};

	Object.keys = Object.keys || function(o){ return map(o, function(v,k,t){t(k)}) as string[] }

	if(typeof window !== "undefined"){
	  var Gun: Radix2Gun = window.Gun as Radix2Gun;
	  window.Radix = Radix as RadixStatic; // radix2 has no `Radix.object` (lib/radisk.js needs it).
	} else { 
	  var Gun: Radix2Gun = require('../gun');
		try{ module.exports = Radix satisfies Radix2Static }catch(e){}
	}
	
	var map = Gun.obj.map, no = {}, u: undefined;
	var _ = String.fromCharCode(24);
	
}());

/** `Gun` with the deprecated `Gun.obj.map` (src/deprecated.ts) radix2 relies on. */
type Radix2Gun = GunStatic & Pick<GunDeprecated, 'obj'>;

import type { GunDeprecated, GunStatic } from '../src/types';
import type { Radix2Fn, Radix2Static, RadixEach, RadixFn, RadixKey, RadixMapOpt, RadixSort, RadixStatic, RadixTree } from './types';
