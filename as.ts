;(function(){
	function as(el: AsTarget | AsQuery, gun: Chain, cb?: AsCb | null, opt?: AsOpt | null){
		el = $(el);
		if(gun === (as as AsFn).gui && (as as AsFn).el && (as as AsFn).el!.is(el)){ return }

		opt = opt || {};
		opt.match = opt.match || '{{ ';
		opt.end = opt.end || ' }}';
		;(function(){ // experimental
			function nest(t: string | undefined, s: string,e?: string, r?: undefined, i?: number,tmp?: number,u?: undefined): string[]; function nest(t: string | undefined, s: string,e: string | undefined, r: unknown[], i?: number,tmp?: number,u?: undefined): string | never[]; function nest(t: string | undefined, s: string,e?: string, r?: unknown[], i?: number,tmp?: number,u?: undefined): string | string[] {
				if(r && !r.length){ return t||'' }
				if(!t){ return [] }
				e = e || s;
				i = t.indexOf(s, i||0);
				if(0 > i){ return [] }
				tmp = t.indexOf(e, i+1);
				if(!r){ return [t.slice(i+s.length, tmp)].concat(nest(t, s,e, r, tmp,tmp,u)) }
				return t.slice(0,i)+r[0]+nest(t.slice(tmp+e.length), s,e, r.slice(1), 0,tmp,u);
			}

			/* experimental */
			function template(tag: AsTarget | AsQuery, attr?: string): AsQuery | undefined {
				var html = (tag = $(tag))[0].outerHTML, sub, tmp;
				if(html && (0 > html.indexOf(opt!.match!))){ return }
				if(!attr){
					$.each(tag[0].attributes, function(i,v){
						if(!v){ return }
						if(!nest(v.value, opt!.match!, opt!.end).length){ return }
						template(tag, v.name)
					});
					if((sub = tag.children()).length){
						return sub.each(function(){ template(this) });
					}
				}
				var data: unknown[] = [], plate = attr? tag.attr(attr) : tag.html();
				tmp = nest(plate, opt!.match!, opt!.end);
				if(!tmp.length){ return }
				$.each(tmp, function(pos, match){
					var expr: string[] | string | AsExpr = match.split(' ');
					var path = (expr[0]).split('.');
					if(expr = expr.slice(1).join(' ')){
						expr = new Function("_", "b", "return (_)" + expr) as AsExpr;
					}
					var val = (expr && (expr as AsExpr)('')) || '';
					data.push(val);
					if(!attr){ tag.text(val) }

					var ref = gun, sup: string[] = [], tmp;
					if(tmp = tag.attr('name')){ sup.push(tmp) }
					tag.parents("[name]").each(function(){
						sup.push($(this).attr('name')!);
					});
					$.each(path = sup.reverse().concat(path), function(i,v){
						ref = ref.get(v);
					});
					ref.on(function(v: unknown){
						v = data[pos] = expr? (expr as AsExpr)(v) : v;
						var tmp = nest(plate, opt!.match!, opt!.end, data);
						if(attr){
							tag.attr(attr, tmp);
						} else {
							tag.text(tmp);
						}
					});
				});
			}
			template(el);

		}());

		(as as AsFn).gui = gun;
		(as as AsFn).el = el;
		if(el.data('as')){
			el.html(el.data('as')!.fresh);
		} else {
			el.data('as', {
				fresh: el.html()
			})
		}
		el.find("[name]").each(function(){
			if($(this).find("[name]").length){ return }
			var name = $(this),
				parents = name.parents("[name]"),
				path: string[] = [],
				ref = gun;

			path.push(name.attr('name')!);
			parents.each(function(){
				path.push($(this).attr('name')!);
			});
			path = path.reverse();

			path.forEach(function(key){
				if('#' === key){
					ref = ref.map()
				} else {
					ref = ref.get(key);
				}
			});
			
			var many: number | false = path.slice().reverse().indexOf('#'), model: AsQuery | AsModel | undefined;
			many = (0 < ++many)? many : false;
			if(many){
				model = name.closest("[name='#']");
				model = model.data('model') || model.data('model', {$: model.clone(), on: model.parent(), has: {}}).hide().data('model');
			} 

			ref.get(function(at){
				var data = at.put, key = at.get, gui = at.gun || at.$!, ui: AsQuery | undefined = name, back;
				if(model){
					ui = (model as AsModel).has[(gui._).id!];
					if(!ui){
						back = gui.back(many as number - 1);
						ui = (model as AsModel).has[(back._).id!];
						if(!ui){
							if(!(back._).get){ return }
							ui = ((model as AsModel).has[(back._).id!] = (model as AsModel).$.clone(true).prependTo((model as AsModel).on));
						}
						ui = ui.find("[name='"+key+"']").first();
						(model as AsModel).has[(gui._).id!] = ui;
					}
				}
				ui.data('gun', gui);
				if(ui.data('was') === data){ return }
				if(many && ui.is('.sort')){
					var up = ui.closest("[name='#']");
					var tmp = as.sort(data, up.parent().children().last());
					tmp? up.insertAfter(tmp) : up.prependTo(up.parent());
				}
				if((as as AsFn).lock === gui){ return }
				if(!(data && data instanceof Object)){
					(ui[0] && u === ui[0].value)? ui.text(data) : ui.val(data);
				}
				ui.data('was', data);
				if(cb){
					cb(data, key, ui);
				}
			});
		});
	}
	as.wait = function<T>(cb: AsWaitCb<T>, wait?: number, to?: Timer){
		return function(this: T, a?: unknown,b?: unknown,c?: unknown){
			var me: T | false = (as as AsFn).typing = this;
			clearTimeout(to);
			to = setTimeout(function(){
				cb.call(me as T, a,b,c);
				(as as AsFn).typing = me = false;
			}, wait || 200);
		}
	}
	as.sort = function sort(num: unknown, li: AsQuery): AsQuery { return parseFloat(num as string) >= parseFloat(($(li).find('.sort').text() || -Infinity) as string)? li : sort(num, li.prev()) } // `parseFloat` stringifies (the data, a sort text or -Infinity).
	$(document).on('keyup', 'input, textarea, [contenteditable]', as.wait(function(){
		var el = $(this);
		var data = (el[0] && u === el[0].value)? el.text() : el.val();
		var g = el.data('gun');
		if(!g){ return }
		(as as AsFn).lock = g;
		g.put(data);
	}, 99));
	//$(document).on('submit', 'form', function(e){ e.preventDefault() });
	var u: undefined;
	window.as = as as /* (not narrowed: the router below checks it) */ AsFn | undefined;
	$.as = as;
}());

;(function(){
	$(document).on('click', 'a, button', function(e){
		var tmp = $(this).attr('href') || '';
		if(0 === tmp.indexOf('http')){ return }
		e.preventDefault();
		r(tmp);
	});
	function r(href?: string): AsRoute | undefined {
		if(!href){ return }
		if(href[0] == '#'){ href = href.slice(1) }
		var h = href.split('/')[0];
		$('.page').hide();
		$('#' + h).show();
		if((r as AsRoute).on === h){ return }
		location.hash = href;
		(r.page[h] || {on:function(){}}).on();
		(r as AsRoute).on = h;
		return r;
	};
	r.page = function(h: string, cb: () => void){
		r.page[h] = r.page[h] || {on: cb};
		return r;
	} as AsPages
	r.render = function(id: string, model: string, onto: AsTarget | AsQuery, data: { [field: string]: unknown }){
		var $data = $(
			$('#' + id).get(0) ||
			$('.model').find(model).clone(true).attr('id', id).appendTo(onto)
		);
		$.each(data, function(field, val){
			if($.isPlainObject(val)){ return }
			$data.find("[name='" + field + "']").val(val).text(val);
		});
		return $data;
	}
	window.onhashchange = function(){ r(location.hash.slice(1)) };
	$.as && ($.as.route = r);
	if(window.as){
		as.route = r;
	} else {
		$.route = r;
	}
}());

;$(function(){
	$('.page').not(':first').hide();
	$.as!.route!(location.hash.slice(1));
	$(JOY.start = JOY.start || function(){ $.as!(document, gun, null, JOY.opt) });

	if($('body').attr('peers')){ (console.warn || console.log)('Warning: Please upgrade <body peers=""> to https://github.com/eraeco/joydb#peers !') }

});
;(function(){ // need to isolate into separate module!
	var joy: Joy = window.JOY = function(){};
	joy.auth = function(a: string,b: string,cb?: JoyAuthArg,o?: JoyAuthArg){
		if(!o){ o = cb ; cb = 0 }
		if(o === true){
			gun.user().create(a, b);
			return;
		}
		gun.user().auth(a,b, cb as /* the 0: auth() only picks the function */ SeaAuthCb | undefined,o as SeaAuthCb | SeaAuthOpt | undefined);
	}

	var opt: JoyOpt = joy.opt = window.CONFIG || {}, peers: string[] | undefined;
	$('link[type=peer]').each(function(){ (peers || (peers = [])).push($(this).attr('href') as /* a peer link without href is a mistake */ string) });
	!window.gun && (opt.peers = opt.peers || peers || (function(){
		(console.warn || console.log)('Warning: No peer provided, defaulting to DEMO peer. Do not run in production, or your data will be regularly wiped, reset, or deleted. For more info, check https://github.com/eraeco/joydb#peers !');
		return ['https://gunjs.herokuapp.com/gun'];
	}()));
	window.gun = window.gun || Gun(opt);

	gun.on('auth', function(ack){
		console.log("Your namespace is publicly available at", ack.soul);
	});
}());

/** jQuery, which as.js needs. Only what is used here. */
declare var $: AsJQueryStatic;
/** The app's root chain (`window.gun`: made by JOY below, unless the page has one). */
declare var gun: Chain<RootMeta>;
/** `window.JOY`. */
declare var JOY: Joy;
/** `window.as` (the first part of as.js). */
declare var as: AsFn;
/** `window.Gun`. */
declare var Gun: GunStatic;

/** What jQuery selects from. */
type AsTarget = string | Element | Document;

/** An element of a jQuery selection (`value` on inputs). */
type AsElement = HTMLElement & { value?: string };

/** A jQuery event. */
interface AsEvent {
	preventDefault(): void;
}

/** A jQuery selection. Only what as.js uses. */
interface AsQuery {
	[i: number]: AsElement;
	length: number;
	is(s: AsQuery | string): boolean;
	each(fn: (this: AsElement, i: number, el: AsElement) => unknown): AsQuery;
	attr(name: string): string | undefined;
	/** jQuery stringifies `value`. */
	attr(name: string, value: unknown): AsQuery;
	html(): string;
	html(html: string): AsQuery;
	text(): string;
	/** jQuery stringifies `text`. */
	text(text: unknown): AsQuery;
	val(): string;
	val(value: unknown): AsQuery;
	/** as.js' own data. */
	data(key: 'as'): AsData | undefined;
	data(key: 'model'): AsModel | undefined;
	data(key: 'gun'): Chain | undefined;
	data(key: string): unknown;
	data(key: string, value: unknown): AsQuery;
	find(selector: string): AsQuery;
	children(): AsQuery;
	parent(): AsQuery;
	parents(selector: string): AsQuery;
	closest(selector: string): AsQuery;
	first(): AsQuery;
	last(): AsQuery;
	prev(): AsQuery;
	not(selector: string): AsQuery;
	get(i: number): AsElement | undefined;
	clone(deep?: boolean): AsQuery;
	hide(): AsQuery;
	show(): AsQuery;
	prependTo(target: AsTarget | AsQuery): AsQuery;
	appendTo(target: AsTarget | AsQuery): AsQuery;
	insertAfter(target: AsTarget | AsQuery): AsQuery;
	on(events: string, selector: string, fn: (this: AsElement, eve: AsEvent) => unknown): AsQuery;
}

/** `$`. Only what as.js uses. */
interface AsJQueryStatic {
	(s: AsTarget | AsQuery): AsQuery;
	/** Run `ready` once the document is loaded. */
	(ready: () => void): AsQuery;
	each<T>(list: ArrayLike<T>, fn: (this: T, i: number, v: T) => unknown): ArrayLike<T>;
	each<T>(o: { [key: string]: T }, fn: (this: T, key: string, v: T) => unknown): { [key: string]: T };
	isPlainObject(o: unknown): boolean;
	/** as.js. */
	as?: AsFn;
	/** as.js' router, when there is no `window.as`. */
	route?: AsRoute;
}

/** `el.data('as')`: the template of a bound element. */
interface AsData {
	fresh: string;
}

/** `el.data('model')`: the template of the items of a list (`name="#"`), and their elements by chain id. */
interface AsModel {
	$: AsQuery;
	/** Where the items go. */
	on: AsQuery;
	has: Dict<AsQuery>;
}

/** The options of `as(...)`: the template delimiters (default `{{ ` and ` }}`). */
interface AsOpt {
	match?: string;
	end?: string;
}

/** Called with each update of a bound element. */
type AsCb = (data: ChainMsg['put'], key: string | undefined, ui: AsQuery) => void;

/** The transform of a template expression (`{{ path expr }}`): `return (_)expr`. */
type AsExpr = (v: unknown) => unknown;

/** A callback that `as.wait` debounces. */
type AsWaitCb<T> = (this: T, a?: unknown, b?: unknown, c?: unknown) => void;

/** `as` (`window.as`, `$.as`): bind the `name`d elements of `el` to the data of `gun`, and their edits back. */
interface AsFn {
	(el: AsTarget | AsQuery, gun: Chain, cb?: AsCb | null, opt?: AsOpt | null): void;
	/** The chain last bound. */
	gui?: Chain;
	/** The element last bound. */
	el?: AsQuery;
	/** The chain the user last edited (its echo is not rendered). */
	lock?: Chain;
	/** What the user is typing in, `false` once saved. */
	typing?: unknown;
	/** Debounce `cb` by `wait` ms (default 200). */
	wait<T>(cb: AsWaitCb<T>, wait?: number, to?: Timer): (this: T, a?: unknown, b?: unknown, c?: unknown) => void;
	/** The item of a sorted list that `num` goes after. */
	sort(num: unknown, li: AsQuery): AsQuery;
	/** The router. */
	route?: AsRoute;
}

/** A page of the router. */
interface AsPage {
	on(): void;
}

/** `route.page(h, cb)`: run `cb` when page `h` is shown. Also the pages by id. */
interface AsPages {
	(h: string, cb: () => void): AsRoute;
	[h: string]: AsPage | undefined;
}

/** The router (`as.route`): show the `.page` of `#href`. */
interface AsRoute {
	(href?: string): AsRoute | undefined;
	/** The page shown. */
	on?: string;
	page: AsPages;
	/** Show `data` in `#id` (made from a clone of the `model` of `.model`, in `onto`). */
	render(id: string, model: string, onto: AsTarget | AsQuery, data: { [field: string]: unknown }): AsQuery;
}

/** The options of JOY (`window.CONFIG`): GUN's and as.js'. */
type JoyOpt = GunOptionsInit & AsOpt;

/** An argument of `JOY.auth` (`0` is passed on in place of a callback). */
type JoyAuthArg = SeaAuthCb | SeaAuthOpt | true | 0;

/** `JOY` (`window.JOY`). */
interface Joy {
	(): void;
	/** Log in, or with `true` as the last argument sign up. */
	auth?: (alias: string, pass: string, cb?: SeaAuthCb | SeaAuthOpt | true, opt?: SeaAuthOpt | true) => void;
	opt?: JoyOpt;
	/** Bind the document to `gun`. */
	start?: () => void;
}

declare module './src/types' {
	interface ChainMsg {
		/** as.js: the old name of `$`. */
		gun?: Chain;
	}
}

declare global {
	interface Window {
		/** as.js. */
		as?: AsFn;
		/** as.js. */
		JOY?: Joy;
		/** as.js: the options of JOY. */
		CONFIG?: JoyOpt;
		/** as.js: the app's root chain. */
		gun?: Chain<RootMeta>;
	}
}

import type { Chain, ChainMsg, RootMeta, GunStatic, GunOptionsInit, Timer, Dict } from './src/types';
import type { SeaAuthCb, SeaAuthOpt } from './sea/types';
