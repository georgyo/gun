import type { AnyMeta, Chain, ChainBack, Dict, GunStatic } from './types';
var Gun: GunStatic = require('./root');
Gun.chain.back = function(this: Chain, n?: number | string | string[] | ((at: AnyMeta, opt: unknown) => unknown), opt?: unknown): unknown{ var tmp: unknown;
	n = n || 1;
	if(-1 === n || Infinity === n){
		return this._.root.$;
	} else
	if(1 === n){
		return (this._.back || this._).$;
	}
	var gun = this, at = gun._;
	if(typeof n === 'string'){
		n = n.split('.');
	}
	if(n instanceof Array){
		var i = 0, l = n.length, tmp: unknown = at;
		for(i; i < l; i++){
			tmp = ((tmp||empty) as Dict<unknown>)[n[i]];
		}
		if(u !== tmp){
			return opt? gun : tmp;
		} else
		if((tmp = at.back)){
			return (tmp as AnyMeta).$.back(n, opt);
		}
		return;
	}
	if('function' == typeof n){
		var yes: unknown, tmp: unknown = {back: at};
		while((tmp = (tmp as {back?: AnyMeta}).back)
		&& u === (yes = n(tmp as AnyMeta, opt))){}
		return yes;
	}
	if('number' == typeof n){
		return (at.back || at).$.back(n - 1);
	}
	return this;
} as ChainBack
var empty: Dict<never> = {}, u: undefined;
	
