import type { Dict, Each, Thunk, Turn } from './types';
// Shim for generic javascript utilities.
String.random = function(l, c){
	var s = '';
	l = l || 24; // you are not going to make a 0 length random number, so no need to check type
	c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
	while(l-- > 0){ s += c.charAt(Math.floor(Math.random() * c.length)) }
	return s;
}
String.match = function(t, o){ var tmp: string | undefined, u: undefined;
	if('string' !== typeof t){ return false }
	if('string' == typeof o){ o = {'=': o} }
	o = o || {};
	tmp = (o['='] || o['*'] || o['>'] || o['<']);
	if(t === tmp){ return true }
	if(u !== o['=']){ return false }
	tmp = (o['*'] || o['>']);
	if(t.slice(0, (tmp||'').length) === tmp){ return true }
	if(u !== o['*']){ return false }
	if(u !== o['>'] && u !== o['<']){
		return (t >= o['>'] && t <= o['<'])? true : false;
	}
	if(u !== o['>'] && t >= o['>']){ return true }
	if(u !== o['<'] && t <= o['<']){ return true }
	return false;
}
String.hash = function(s, c){ // via SO
	if(typeof s !== 'string'){ return }
	    c = c || 0; // CPU schedule hashing by
	    if(!s.length){ return c }
	    for(var i=0,l=s.length,n: number; i<l; ++i){
	      n = s.charCodeAt(i);
	      c = ((c<<5)-c)+n;
	      c |= 0;
	    }
	    return c;
	  }
var has = Object.prototype.hasOwnProperty;
Object.plain = function(o: unknown): o is Dict<unknown> { return o? (o instanceof Object && o.constructor === Object) || Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)![1] === 'Object' : false }
Object.empty = function(o, n){
	for(var k in o as object){ if(has.call(o, k) && (!n || -1==n.indexOf(k))){ return false } }
	return true;
}
Object.keys = Object.keys || function(o: object): string[] {
	var l: string[] = [];
	for(var k in o){ if(has.call(o, k)){ l.push(k) } }
	return l;
}
;(function(){
	var u: undefined, sT = setTimeout, l = 0, c = 0
	, sI: (f: Thunk, c?: number) => unknown = (typeof setImmediate !== ''+u && setImmediate) || (function(c?: MessageChannel, f?: Thunk){
		if(typeof MessageChannel == ''+u){ return sT }
		(c = new MessageChannel()).port1.onmessage = function(e){ ''==e.data && f!() }
		return function(q: Thunk){ f=q;c.port2.postMessage('') }
	}()), check = sT.check = sT.check || (typeof performance !== ''+u && performance)
	|| {now: function(){ return +new Date }};
	sT.hold = sT.hold || 9; // half a frame benchmarks faster than < 1ms?
	sT.poll = sT.poll || function(f){
		if((sT.hold >= (check.now() - l)) && c++ < 3333){ f(); return }
		sI(function(){ l = check.now(); f() },c=0)
	}
}());
;(function(){ // Too many polls block, this "threads" them in turns over a single thread in time.
	var sT = setTimeout, t = sT.turn = sT.turn || function(f){ 1 == s.push(f) && p(T) } as Turn
	, s: Thunk[] = t.s = [], p = sT.poll, i = 0, f: Thunk | undefined, T = function(){
		if(f = s[i++]){ f() }
		if(i == s.length || 99 == i){
			s = t.s = s.slice(i);
			i = 0;
		}
		if(s.length){ p(T) }
	}
}());
;(function(){
	var u: undefined, sT = setTimeout, T = sT.turn;
	(sT.each = sT.each || function<I>(l: I[] | null | undefined, f: (item: I) => unknown, e?: ((r: unknown) => void) | 0 | false | null, S?: number){ S = S || 9; (function t(s?: I[], L?: number, r?: unknown): void{
	  if(L = (s = (l||[]).splice(0,S)).length){
	  	for(var i = 0; i < L; i++){
	  		if(u !== (r = f(s[i]))){ break }
	  	}
	  	if(u === r){ T(t); return }
	  } e && e(r);
	}())} as Each)();
}());
	
