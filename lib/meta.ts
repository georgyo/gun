;(function(){
  function USE(arg: string, req: unknown): unknown; function USE(arg: MetaUseModule): MetaUseLoad; function USE(arg: string | MetaUseModule, req?: unknown){
    return req? require(arg as string) : arg.slice? (USE as MetaUse)[R(arg)] : function(mod: MetaUseFn | { exports: unknown }, path: string){
      arg(mod = {exports: {}});
      (USE as MetaUse)[R(path)] = mod.exports;
    }
    function R(p: string){
      return p.split('/').slice(-1).toString().replace('.js','');
    }
  }
  if(typeof module !== "undefined"){ var MODULE = module }

	/* UNBUILD */
	;USE(function(module){
		var noop: MetaNoop = function(){}, u: undefined;
		$.fn.or = function(s){ return this.length ? this : $(s||'body') };
		var m = window.meta = {edit:[]} as MetaInit as Meta;
		var k = m.key = {} as MetaKeys;
		k.meta = {17:17, 91:17, 93:17, 224:17, 18: 17}; // ALT added
		function withMeta(eve: MetaEvent){ return eve.metaKey || eve.ctrlKey || eve.altKey } // ALT added
		k.down = function(eve: MetaEvent){
			var key = (k.eve = m.eve = eve).which = eve.which || eve.fake || eve.keyCode;
		  if(eve.repeat){ return }
			if(!k.meta[key] && withMeta(eve) && !k.at![key]) {
			  return m.flip(false)
		  } // cancel and close when no action and "meta key" held down (e.g. ctrl+c)
			if(!eve.fake && key === k.last){ return }; k.last = key; // jussi: polyfilling eve.repeat?
			if(!eve.fake && $(eve.target).closest('input, textarea, [contenteditable=true]').length/* && !$(eve.target).closest('#meta').get().length*/){
				return;
		    //if(meta.flip.is() && !withMeta(eve)) eve.preventDefault()
			}
			m.check('on', key, k.at || (k.at = m.edit));
			if(k.meta[key]){ m.flip() }
		}
		k.down.keys = {} // currently pressed keys
		k.up = function(eve: MetaEvent){ var tmp: undefined;
			var key = (k.eve = m.eve = eve).which = eve.which || eve.fake || eve.keyCode;
			k.last = null;
			m.check('up', key);
			if(k.meta[key] && m.check.fired){
				m.close()
			}
		}
		m.flip = function(tmp?: boolean){
		  m.flip.active = true;
			((tmp === false) || (!tmp && m.ui.board.is(':visible')))?
				m.close() : m.open();
		  m.flip.active = false;
		}
		m.open = function(){
		  m.check.fired = null;
		  m.ui.board.removeClass('meta-none');
		}
		m.close = function(){
			Object.keys(k.down.keys).forEach((keyDown) => {
			  m.check('up', keyDown);
			})
			m.ui.board.addClass('meta-none')
		}
		m.flip.is = function(){
			return m.ui.board.is(':visible');
		}
		m.flip.wait = 500;
		m.check = function(how: MetaHow, key: MetaKey, at?: MetaAction){
		  if(!m.flip.is() && !k.meta[key]){ return } // TEMP: cancel non-open events when closed TODO make optional
		  at = k.at || m.edit;
			var next = at[key as number];
			if(!next){ return }
			var tmp = k.eve || noop;
			if(tmp.preventDefault){ tmp.preventDefault()} // prevent typing (etc) when action found
			if(next[how]){
					next[how](m.eve);
					meta.ui.blink();
					m.check.fired = true;
					if(how == 'up') delete k.down.keys[key]
					else            k.down.keys[key] = 1;
			}
			if('up' == how){ return }
			if(at != next && !next.back){ next.back = at }
			(k.combo || (k.combo = [])).push(key);
			m.list(next, true);
		}
		function defaultSort(a: MetaSortArg,b: MetaSortArg){
			a = (a as MetaAction).combo!.slice(-1)[0] || 0;
			if((a as string).length){ a = (a as string).toUpperCase().charCodeAt(0) }
			b = (b as MetaAction).combo!.slice(-1)[0] || 0;
			if((b as string).length){ b = (b as string).toUpperCase().charCodeAt(0) }
			return (a < b)? -1 : 1;
		}
		m.list = function(at?: MetaAction, opt?: boolean){
			if(!at){ return m.flip(false) }
			var l: MetaAction[] = [];
			$.each(at, function(i,k: MetaAction){ 'back' != i && k && k.combo && k.name && l.push(k) });
			if(!l.length){ return }
			k.at = at;
			if(at.sort !== null){ l = l.sort(at.sort || defaultSort) }
			var $ul = $('#meta .meta-menu ul')
			$ul.children('li').addClass('meta-none').hide(); setTimeout(function(){ $ul.children('.meta-none').remove() },250); // necessary fix for weird bug glitch
			$.each(l, function(i, k){
			  var $li = $('<li>').text(k.name!).data(k)
				$ul.append($li);
				if(k.styles) meta.ui.iniline($li[0], k.styles);
			});
			if(opt){ m.flip(true) }
			$ul.append($('<li>').html('&larr;').on('click', back));
		}
		m.ask = function(help: string, cb: (answer: string) => void, opt?: unknown){
			var $ul = $('#meta .meta-menu ul').empty();
			var $put = $('<input>').attr('id', 'meta-ask').attr('placeholder', help);
			var $form = $('<form>').append($put).on('submit', function(eve){
				eve.preventDefault();
				cb($put.val());
				$li.remove();
				k.wipe();
			});
			if(opt){
				$form.on('keyup', function(eve){ cb($put.val()) })
			}
			var $li = $('<li>').append($form);
			$ul.append($li);
			m.flip(true);
			$put.focus();
		}
		k.wipe = function(opt?: unknown){
			k.combo = [];
			if(!opt){ m.flip(false) }
			m.list(k.at = m.edit);
		};
		m.tap = function(){
			var on = $('.meta-on')
				.or($($(document.querySelectorAll(':hover')).get().reverse()).first())
				.or($(document.elementFromPoint(meta.tap.x, meta.tap.y)));
			return on;
		}
		meta.edit = function(e: MetaAction){
			var path: number[] = [];
			$.each(e.combo || (e.combo = []), function(i,k){
				if(!k || !k.length){ if('number' == typeof k){ path.push(k) } return }
				path.push(k.toUpperCase().charCodeAt(0));
			});
			var at: MetaAction = meta.edit, l = e.combo.length;
			$.each(path, function(i,k){ at = at[k] = at[k] || Object.create(defaults) });
		  $.extend(at, e) // fixes overwriting when sub action is defined before parent
			e.combow = path.join(','); // deprecate?
			m.list(k.at || meta.edit);
		}
		function back(){ // close root or go back on submenu
		  k.at == m.edit ? m.flip(false) : m.check('down', 'back')
		}
		var defaults = {
			8:  { on: back },  // backspace
			27: { up: k.wipe } // esc: close and reset menu
		}
		$.extend(meta.edit, defaults)
	})(USE, './metaCore');
	;USE(function(module){
		/* UI */
		meta.ui = {
			blink: function(){ // hint visually that action has happened
				$('#meta').css('transition', 'none').css('background', 'none')
				setTimeout(function(){
					$('#meta')[0].style.transition = null
					$('#meta')[0].style.background = null
				})
			},
			depth: function(n?: number){
			  if (n) {
					$('#meta').css('background', 'hsl(60, 100%,'+(85-(n*10))+'%)');
				} else {
					$('#meta')[0].style.background = null
				}
			}
		}
		var $m = $('<div>').attr('id', 'meta');
		//$m.append($('<span>').html('&#9776;').addClass('meta-start'));
		$m.append($('<span>').html('+').addClass('meta-start'));
		$m.append($('<div>').addClass('meta-menu meta-none').append('<ul>'));
		$m.on('mouseenter', function(){
		  if (meta.flip.active || meta.flip.is()) return;
		  meta.flip();
		})
		$m.on('mouseleave', function(){
		  if (meta.flip.active || !meta.flip.is()) return;
		  meta.flip(false);
		})
		$(document.body).append($m);
		meta.ui.board = $('.meta-menu', $m);
		css({
			'#meta': {
				display: 'block',
				position: 'fixed',
				bottom: '2em',
				right: '2em',
				'font-size': '18pt',
				'font-family': 'Tahoma, arial',
				'border-radius': '1em',
				'text-align': 'center',
				'z-index': 999999,
				margin: 0,
				padding: 0,
				width: '2em',
				height: '2em',
				outline: 'none',
				overflow: 'visible',
				background: 'rgba(0,0,0,0.5)', color: 'white',
				transition: 'all 0.2s ease-in'
			},
			'#meta *': {outline: 'none'},
			'#meta .meta-none': {display: 'none'},
			'#meta span': {'line-height': '2em'},
			'#meta .meta-menu': {
				background: 'rgba(0,0,0,0.2)',
				width: '12em',
				right: '-2em',
				bottom: '-2em',
				overflow: 'visible',
				position: 'absolute',
				'overflow-y': 'scroll',
				'text-align': 'right',
				'min-height': '20em',
				height: '100vh'
			},
			'#meta .meta-menu ul': {
				padding: 0,
				margin: '1em 1em 2em 0',
				'list-style-type': 'none'
			},
			'#meta .meta-menu ul li': {
				display: 'block',
				'float': 'right',
				padding: '0.5em 1em',
				'border-radius': '1em',
				'margin-left': '0.25em',
				'margin-top': '0.25em',
				background: 'rgba(0,0,0,0.2)', 'backdrop-filter': 'blur(10px)', color: 'white',
				'cursor':  'pointer'
			},
			'#meta .meta-menu ul li:hover': {
				background: 'rgba(0,0,0,0.5)'
			},
			'#meta a': {color: 'black'},
			'#meta:hover': {opacity: 1},
			'#meta:hover .meta-menu': {display: 'block'},
			'#meta .meta-menu ul:before': {
				content: "' '",
				display: 'block',
				'min-height': '15em',
				height: '50vh'
			},
			'#meta .meta-start': {
				cursor: 'pointer'
			}
		});
		function css(css: Dict<Dict<string | number>>){
			var tmp = '';
			$.each(css, function(c,r: Dict<string | number>){
				tmp += c + ' {\n';
				$.each(r, function(k,v: string | number){
					tmp += '\t'+ k +': '+ v +';\n';
				});
				tmp += '}\n';
			});
			var tag = document.createElement('style');
			tag.innerHTML = tmp;
			$m.append(tag)
		}
		meta.ui.iniline = function(el: MetaElement, cssObj: Dict<string>){
			for(var k in cssObj) { el.style[k] = cssObj[k]; }
		}
	})(USE, './metaUI');
	;USE(function(module){
		var m = meta, k = m.key;
		//$(window).on('focus', k.wipe.bind(null, false)); // .on('blur', k.wipe.bind(null, false))
		$(document).on('mousedown mousemove mouseup', function(eve){
			m.tap.eve = eve;
			m.tap.x = eve.pageX||0;
			m.tap.y = eve.pageY||0;
			m.tap.on = $(eve.target);
		})
		var [start, end] = 'ontouchstart' in window
												? ['touchstart', 'touchend']
												: ['mousedown', 'mouseup']
		$(document).on(start, '#meta .meta-menu li', function(eve){
			var combo = $(this).data().combo;
			eve.fake = eve.which = combo && (combo.slice(-1)[0] as string).toUpperCase().charCodeAt(0);
			eve.tap = true;
			k.down(eve);
			$(document).one(end, () => k.up(eve))
		return;
		});
		$(document).on('keydown', k.down).on('keyup', k.up);
		$('#meta').on(start, function(ev) {
		  if (ev.target.tagName == 'LI' || ev.target.tagName == 'UL') return
			meta.flip()
		})
	})(USE, './metaEvents');
}());


/** lib/meta.js: `window.meta` (also the global `meta`). */
declare var meta: Meta;
declare var window: Window & typeof globalThis & { meta: Meta };
/** jQuery, which the page loads before lib/meta.js. Only what is used here. */
declare var $: MetaJQueryStatic;

/** The module function of the bundle's `USE` loader. Functions have no `slice`: that is how `USE` tells them from paths. */
interface MetaUseModule {
	(module: { exports: unknown }): void;
	slice?: undefined;
}
/** `USE(fn)`: run it as module `path` (`mod`, `USE` itself, is replaced by the module object). */
type MetaUseLoad = (mod: MetaUseFn | { exports: unknown }, path: string) => void;
/** The bundle's `USE`: `require` a host module, or load a module function. */
interface MetaUseFn {
	(arg: string, req: unknown): unknown;
	(arg: MetaUseModule): MetaUseLoad;
}
/** `USE` is also the registry of the exports of its modules (by file name). */
interface MetaUse extends MetaUseFn {
	[name: string]: unknown;
}

/** A char code in a key combo. Numbers have no `length`, which is how `meta.edit` tells them from letters. */
type MetaCode = number & { length?: undefined };
/** A key of a combo: a letter (key name), or a char code. */
type MetaKey = string | MetaCode;
/** `defaultSort` reuses its arguments: an action, then the last key of its combo (or `0`), then its char code. */
type MetaSortArg = MetaAction | MetaKey;

/** What `noop` stands in for when there is no key event: a function, so it has no `preventDefault`. */
interface MetaNoop {
	(): void;
	preventDefault?: undefined;
}

/** A key or mouse event (a jQuery event, or a synthetic one for a tapped menu item). */
interface MetaEvent {
	which?: number;
	/** The char code of the last key of a tapped menu item. */
	fake?: number;
	keyCode: number;
	repeat?: boolean;
	metaKey?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	target: Element;
	preventDefault(): void;
	tap?: boolean;
	pageX?: number;
	pageY?: number;
}

/** What runs an action: its `on` (key down), `up` (key up) or `down`. */
type MetaHow = 'on' | 'up' | 'down';
type MetaHandler = (eve?: MetaEvent) => void;

/**
 * A command (`meta.edit(action)`), which is also the menu of its sub commands,
 * by the char code of their last key.
 */
interface MetaAction {
	name?: string;
	/** The keys to press, from the root menu. */
	combo?: MetaKey[];
	/** The char codes of `combo`, comma separated. */
	combow?: string;
	on?: MetaHandler;
	up?: MetaHandler;
	down?: MetaHandler;
	/** The menu this one was opened from. */
	back?: MetaAction;
	/** Inline styles of its menu item. */
	styles?: Dict<string>;
	/** How its menu is sorted: `null` keeps the insertion order. */
	sort?: ((a: MetaAction, b: MetaAction) => number) | null;
	[code: number]: MetaAction | undefined;
}

/** `meta.edit`: add a command. Also the root menu. */
interface MetaEdit extends MetaAction {
	(e: MetaAction): void;
}

/** `meta.key.down`: the keydown handler, and the keys currently held. */
interface MetaKeyDown {
	(eve: MetaEvent): void;
	keys: Dict<1>;
}

/** `meta.key`: the keyboard state. */
interface MetaKeys {
	/** The key codes of the meta keys (ctrl, cmd, alt). */
	meta: Dict<number>;
	eve?: MetaEvent;
	/** Set to the handler, then `keys` is added. */
	get down(): MetaKeyDown;
	set down(v: MetaKeyDown | ((eve: MetaEvent) => void));
	up(eve: MetaEvent): void;
	/** The open menu. */
	at?: MetaAction;
	last?: number | null;
	/** The keys pressed so far. */
	combo?: MetaKey[];
	/** Reset to the root menu (and close it, unless `opt`). */
	wipe(opt?: unknown): void;
}

/** `meta.flip`: open, close (`false`) or toggle the menu. */
interface MetaFlip {
	(tmp?: boolean): void;
	active?: boolean;
	is(): boolean;
	wait: number;
}

/** `meta.check`: run the action of a key and open its menu. */
interface MetaCheck {
	(how: MetaHow, key: MetaKey, at?: MetaAction): void;
	fired?: boolean | null;
}

/** `meta.tap`: the element the user is on; the last mouse event and position. */
interface MetaTap {
	(): MetaJQuery;
	eve?: MetaEvent;
	x: number;
	y: number;
	on?: MetaJQuery;
}

/** `meta.ui`. */
interface MetaUi {
	/** Hint visually that an action happened. */
	blink(): void;
	depth(n?: number): void;
	/** The menu. */
	board: MetaJQuery;
	iniline(el: MetaElement, cssObj: Dict<string>): void;
}

/** `window.meta` as created: an empty root menu (the rest of lib/meta.js fills it in). */
interface MetaInit {
	edit: MetaEdit | MetaAction[];
}

/** lib/meta.js: `window.meta`, a keyboard (and tap) command menu. */
interface Meta {
	/** Set to an empty menu, then to the `edit` function. */
	get edit(): MetaEdit;
	set edit(v: MetaEdit | MetaAction[] | ((e: MetaAction) => void));
	key: MetaKeys;
	eve?: MetaEvent;
	/** Set to the function, then its fields are added. */
	get flip(): MetaFlip;
	set flip(v: MetaFlip | ((tmp?: boolean) => void));
	open(): void;
	close(): void;
	get check(): MetaCheck;
	set check(v: MetaCheck | ((how: MetaHow, key: MetaKey, at?: MetaAction) => void));
	/** Show the menu `at`. */
	list(at?: MetaAction, opt?: boolean): void;
	/** Prompt the user (`cb` on every key up too with `opt`). */
	ask(help: string, cb: (answer: string) => void, opt?: unknown): void;
	get tap(): MetaTap;
	set tap(v: MetaTap | (() => MetaJQuery));
	/** Set to `blink` and `depth`, then `board` and `iniline` are added. */
	get ui(): MetaUi;
	set ui(v: MetaUi | Pick<MetaUi, 'blink' | 'depth'>);
}

/** An element as lib/meta.js touches it: styles are set by name, `null` clears one. */
interface MetaElement extends Omit<HTMLElement, 'style'> {
	style: Dict<string | null>;
}

/** What `$()` takes: a selector or html, elements, or a selection. */
type MetaQuery = string | EventTarget | ArrayLike<EventTarget> | null;

/** A jQuery selection. Only what lib/meta.js uses. */
interface MetaJQuery {
	length: number;
	[i: number]: MetaElement;
	/** lib/meta.js: this selection, or `$(s || 'body')` if it is empty. */
	or(s?: MetaQuery): MetaJQuery;
	closest(q: string): MetaJQuery;
	is(q: string): boolean;
	addClass(c: string): MetaJQuery;
	removeClass(c: string): MetaJQuery;
	children(q?: string): MetaJQuery;
	hide(): MetaJQuery;
	remove(): MetaJQuery;
	empty(): MetaJQuery;
	focus(): MetaJQuery;
	first(): MetaJQuery;
	get(): MetaElement[];
	text(t: string): MetaJQuery;
	html(h: string): MetaJQuery;
	attr(name: string, value: string): MetaJQuery;
	css(name: string, value: string): MetaJQuery;
	val(): string;
	/** The action of a menu item. */
	data(): MetaAction;
	data(d: MetaAction): MetaJQuery;
	append(c: MetaJQuery | Element | string): MetaJQuery;
	on(ev: string, cb: (this: MetaElement, eve: MetaEvent) => void): MetaJQuery;
	on(ev: string, q: string, cb: (this: MetaElement, eve: MetaEvent) => void): MetaJQuery;
	one(ev: string, cb: (this: MetaElement, eve: MetaEvent) => void): MetaJQuery;
}

/** jQuery's `$`. Only what lib/meta.js uses. */
interface MetaJQueryStatic {
	(q: MetaQuery, ctx?: MetaJQuery): MetaJQuery;
	fn: MetaJQuery;
	each<T>(o: ArrayLike<T>, cb: (this: T, i: number, v: T) => unknown): ArrayLike<T>;
	/** The values are whatever the callback says (they are not checked). */
	each<V>(o: object, cb: (this: V, k: string, v: V) => unknown): object;
	extend<T extends object>(target: T, ...src: object[]): T;
}

import type { Dict } from '../src/types';
