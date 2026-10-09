;(function(){
// JSON: JavaScript Object Notation
// YSON: Yielding javaScript Object Notation
var yson = {} as Yson, u: undefined, sI: (f: Thunk) => unknown = setTimeout.turn || (typeof setImmediate != ''+u && setImmediate) || setTimeout;

yson.parseAsync = function(text: string, done: JsonParseCb, revive: unknown, M: number){
	if('string' != typeof text){ try{ done(u,JSON.parse(text)) }catch(e){ done(e) } return }
	var ctx: YsonParseCtx = {i: 0, text: text, done: done, l: text.length, up: []};
	//M = 1024 * 1024 * 100;
	//M = M || 1024 * 64;
	M = M || 1024 * 32;
	parse();
	function parse(){
		//var S = +new Date;
		var s = ctx.text;
		var i = ctx.i, l = ctx.l, j = 0;
		var w = ctx.w, b: boolean | undefined, tmp: number | boolean | string | null | YsonContainer | undefined;
		while(j++ < M){
			var c = s[i++];
			if(i > l){
				ctx.end = true;
				break;
			}
			if(w){
				i = s.indexOf('"', i-1); c = s[i];
				tmp = 0; while('\\' == s[i-(++tmp)]){}; tmp = !(tmp % 2);//tmp = ('\\' == s[i-1]); // json is stupid
				b = b || tmp;
				if('"' == c && !tmp){
					w = u;
					tmp = ctx.s;
					if(ctx.a){
						tmp = s.slice(ctx.sl, i);
						if(b || (1+tmp.indexOf('\\'))){ tmp = JSON.parse('"'+tmp+'"') as string } // escape + unicode :( handling
						if(ctx.at instanceof Array){
							ctx.at.push(ctx.s = tmp);
						} else {
							if(!ctx.at){ ctx.end = j = M; tmp = u }
							(ctx.at||{} as Dict<unknown>)[ctx.s as string] = ctx.s = tmp;
						}
						ctx.s = u;
					} else {
						ctx.s = s.slice(ctx.sl, i);
						if(b || (1+ctx.s.indexOf('\\'))){ ctx.s = JSON.parse('"'+ctx.s+'"'); } // escape + unicode :( handling
					}
					ctx.a = b = u;
				}
				++i;
			} else {
				switch(c){
				case '"':
					ctx.sl = i;
					w = true;
					break;
				case ':':
					ctx.ai = i;
					ctx.a = true;
					break;
				case ',':
					if(ctx.a || ctx.at instanceof Array){
						if(tmp = s.slice(ctx.ai, i-1)){
							if(u !== (tmp = value(tmp))){
								if(ctx.at instanceof Array){
									ctx.at.push(tmp);
								} else {
									(ctx.at as Dict<unknown>)[ctx.s as string] = tmp;
								}
							}
						}
					}
					ctx.a = u;
					if(ctx.at instanceof Array){
						ctx.a = true;
						ctx.ai = i;
					}
					break;
				case '{':
					ctx.up.push(ctx.at||(ctx.at = {}));
					if(ctx.at instanceof Array){
						ctx.at.push(ctx.at = {});
					} else
					if(u !== (tmp = ctx.s)){
						ctx.at[tmp] = ctx.at = {};
					}
					ctx.a = u;
					break;
				case '}':
					if(ctx.a){
						if(tmp = s.slice(ctx.ai, i-1)){
							if(u !== (tmp = value(tmp))){
								if(ctx.at instanceof Array){
									ctx.at.push(tmp);
								} else {
									if(!ctx.at){ ctx.end = j = M; tmp = u }
									(ctx.at||{} as Dict<unknown>)[ctx.s as string] = tmp;
								}
							}
						}
					}
					ctx.a = u;
					ctx.at = ctx.up.pop();
					break;
				case '[':
					if(u !== (tmp = ctx.s)){
						ctx.up.push(ctx.at);
						(ctx.at as Dict<unknown>)[tmp] = ctx.at = [];
					} else
					if(!ctx.at){
						ctx.up.push(ctx.at = []);
					}
					ctx.a = true;
					ctx.ai = i;
					break;
				case ']':
					if(ctx.a){
						if(tmp = s.slice(ctx.ai, i-1)){
							if(u !== (tmp = value(tmp))){
								if(ctx.at instanceof Array){
									ctx.at.push(tmp);
								} else {
									(ctx.at as Dict<unknown>)[ctx.s as string] = tmp;
								}
							}
						}
					}
					ctx.a = u;
					ctx.at = ctx.up.pop();
					break;
				}
			}
		}
		ctx.s = u;
		ctx.i = i;
		ctx.w = w;
		if(ctx.end){
			tmp = ctx.at;
			if(u === tmp){
				try{ tmp = JSON.parse(text)
				}catch(e){ return ctx.done(e) }
			}
			ctx.done(u, tmp);
		} else {
			sI(parse);
		}
	}
}
function value(s: string): number | boolean | null | undefined{
	var n = parseFloat(s);
	if(!isNaN(n)){
		return n;
	}
	s = s.trim();
	if('true' == s){
		return true;
	}
	if('false' == s){
		return false;
	}
	if('null' == s){
		return null;
	}
}

yson.stringifyAsync = function(data: unknown, done: YsonIfyCtx['done'], replacer: unknown, space: unknown, ctx: YsonIfyCtx){
	//try{done(u, JSON.stringify(data, replacer, space))}catch(e){done(e)}return;
	ctx = ctx || {} as YsonIfyCtx;
	ctx.text = ctx.text || "";
	ctx.up = [ctx.at = {d: data} as YsonIfyAt];
	ctx.done = done;
	ctx.i = 0;
	var j = 0;
	ify();
	function ify(): void{
		var at = ctx.at, data = at.d, add = '', tmp: string | string[] | undefined;
		if(at.i && (at.i - at.j) > 0){ add += ',' }
		if(u !== (tmp = at.k)){ add += JSON.stringify(tmp) + ':' } //'"'+tmp+'":' } // only if backslash
		switch(typeof data){
		case 'boolean':
			add += ''+data;
			break;
		case 'string':
			add += JSON.stringify(data); //ctx.text += '"'+data+'"';//JSON.stringify(data); // only if backslash
			break;
		case 'number':
			add += (isNaN(data)? 'null' : data);
			break;
		case 'object':
			if(!data){
				add += 'null';
				break;
			}
			if(data instanceof Array){	
				add += '[';
				at = {i: -1, as: data, up: at, j: 0} as YsonIfyAt;
				at.l = data.length;
				ctx.up.push(ctx.at = at);
				break;
			}
			if('function' != typeof ((data||'') as {toJSON?: unknown}).toJSON){
				add += '{';
				at = {i: -1, ok: Object.keys(data).sort(), as: data, up: at, j: 0} as YsonIfyAt;
				at.l = at.ok!.length;
				ctx.up.push(ctx.at = at);
				break;
			}
			if(tmp = (data as {toJSON(): string}).toJSON()){
				add += tmp;
				break;
			}
			// let this & below pass into default case...
		case 'function':
			if(at.as instanceof Array){
				add += 'null';
				break;
			}
		default: // handle wrongly added leading `,` if previous item not JSON-able.
			add = '';
			at.j++;
		}
		ctx.text += add;
		while(1+at.i >= at.l){
			ctx.text += (at.ok? '}' : ']');
			at = ctx.at = at.up;
		}
		if(++at.i < at.l){
			if(tmp = at.ok){
				at.d = (at.as as Dict<unknown>)[at.k = tmp[at.i]];
			} else {
				at.d = (at.as as unknown[])[at.i];
			}
			if(++j < 9){ return ify() } else { j = 0 }
			sI(ify);
			return;
		}
		ctx.done(u, ctx.text);
	}
}
if(typeof window != ''+u){ window.YSON = yson }
try{ if(typeof module != ''+u){ module.exports = yson } }catch(e){}
if(typeof JSON != ''+u){
	JSON.parseAsync = yson.parseAsync;
	JSON.stringifyAsync = yson.stringifyAsync;
}

}());
/** A JSON object or array being filled by `parseAsync`. */
type YsonContainer = Dict<unknown> | unknown[];

/** The state of a `parseAsync`, kept between turns. */
interface YsonParseCtx {
	/** Where to resume. */
	i: number;
	text: string;
	done: JsonParseCb;
	l: number;
	/** The containers above `at`. */
	up: Array<YsonContainer | undefined>;
	/** Inside a string. */
	w?: boolean;
	/** `true`, or `M` (a number) when the text is malformed. */
	end?: boolean | number;
	/** The last string read (an object key, until its value is read). */
	s?: string;
	/** Reading a value (after `:`, or in an array). */
	a?: boolean;
	/** Where the string started. */
	sl?: number;
	/** Where the value started. */
	ai?: number;
	/** The container being filled. */
	at?: YsonContainer;
}

declare global {
	interface Window {
		YSON?: Yson;
	}
}

import type { Dict, JsonParseCb, Thunk } from '../src/types';
import type { Yson, YsonIfyAt, YsonIfyCtx } from './types';
