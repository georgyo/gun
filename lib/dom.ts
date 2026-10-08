;(function(){ // jQuery shim
	// u = undefined, n = null, b = boolean = true/false, n = number, t = text, l = list = array, o = object, cb = callback = function, q = query CSS, k = key, eve = event.
	if(window.$){ return }
	(($ = window.$ = function(this: unknown, q?: DomInput, tag?: DomTag, I?: unknown, u?: undefined){
		if(q instanceof $){ return q }
		if(!((I = this) instanceof $)){ return new $(q, tag) }
		if('string' != typeof q){ return I.tags = (q = q||[]).tags || (u === q.length)? [q as DomTag] : q as DomList, I }
		if('<' === q[0]){ return I.add(q) }
		return q.split(",").forEach(function(q){ I.add((tag||document as DomScope).querySelectorAll(q)) }), I;
	} as DomStatic).fn = $.prototype).each = function(cb){ return $.each(this.tags, cb), this }
	$.each = function<T>(o: Dict<T> | ArrayLike<T>, cb: (k: string, v: T) => unknown){ Object.keys(o).forEach(function(k){ cb(k, (o as {[k: string]: T})[k]) }) }
	$.isPlainObject = function(o){
		return (o? (o instanceof Object && o.constructor === Object)
		|| 'Object' === Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)![1] 
		: false);
	}
	$.fn.add = function(add?: DomAddInput | DomNew, tmp?: string, u?: undefined){ if(!add){ return this }
		if('<' === (tmp = add as string)[0]){ (add = document.createElement('div')).innerHTML = tmp; add = add.children[0] }
		add = ('string' == typeof add)? $(add).tags : (u == add.length)? add : [].slice.call(add);
		return this.tags = [].slice.call<ArrayLike<DomTag>, [], DomTag[]>(this.tags||[]).concat(add as DomTag[]), this;
	}
	$.fn.get = function(i?: number, l?: ArrayLike<DomTag>, u?: undefined){ return l = this.tags, (i === u)? l : l[i] }
	$.fn.is = function(q, b?: boolean){ return this.each(function(i, tag){ b = b || tag.matches(q) }), b }
	$.fn.css = function(o){ return this.each(function(i, tag){ $.each(o, function(k,v){ tag.style[k] = v }) })}
	$.fn.on = function(t, cb){ return this.each(function(i, tag){
		t.split(" ").forEach(function(t){ tag.addEventListener(t, cb) });
	})}
	$.fn.val = function(t: string, k?: string, f?: number, u?: undefined){
		t = (t === u)? '' : (f = 1) && t;
		k = k || 'value';
		return this.each(function(i, tag){
			if(f){ tag[k] = t }
			else { t += (tag[k]||'') }
		}), f? this : t;
	}
	$.fn.text = function(t){ return this.val(t, 'textContent') }
	$.fn.html = function(html){ return this.val(html, 'innerHTML') }
	$.fn.attr = function(attr,val){ return this.val(val, attr) }
	$.fn.find = function(q, I?: DomQuery, l?: DomTag[]){
		I = $(), l = I.tags as DomTag[];
		return this.each(function(i, tag){
			$(q, tag).each(function(i, tag){
				if(0 > l.indexOf(tag)){ l.push(tag) }
			});
		}), I;
	}
	$.fn.place = function(where, on, f?: unknown, op?: 'insertAdjacentElement', I?: DomQuery){ return (I = this).each(function(i, tag){ $(on).each(function(i, node){
		(f? tag : node)[op||'insertAdjacentElement'](({
			'-1':'beforebegin', '-0.1': 'afterbegin', '0.1':'beforeend', '1': 'afterend'
		} as const)[where], (f? node : tag));
	})})}
	$.fn.append = function(html){ return $(html).place(0.1, this), this }
	$.fn.appendTo = function(html){ return this.place(0.1, $(html)) }
	function rev(o: DomQuery, I?: DomQuery){ (I = $()).tags = [].slice.call(o.tags).reverse(); return I };
	$.fn.prependTo = function(html){ return rev(this).place(-0.1, $(html)), this }
	$.fn.prepend = function(html){ return rev($(html)).place(-0.1, this), this }
	$.fn.parents = function(q, c?: number | DomParentOf, I?: DomQuery, l?: DomTag[], p?: 'parentElement'){
		I = $(), l = I.tags as DomTag[], p = 'parentElement';
		this.each(function(i, tag: DomTag | DomParentOf | null | undefined){
			if(c){ (c = {} as DomParentOf)[p] = tag as DomTag ; tag = c }
			while(tag){ if((tag = tag[p]) && $(tag as DomTag).is(q)){
				l.push(tag as DomTag); if(c){ return }
			}}
		});
		return I;
	}
	$.fn.closest = function(q, c?: unknown){ return this.parents(q, 1) }
	$.fn.clone = function(b?: unknown, I?: DomQuery, l?: DomTag[]){
		I = $(), l = I.tags as DomTag[];
		this.each(function(i, tag){
			l.push(tag.cloneNode(true))
		});
		return I;
	}
}());

/** lib/dom.js installs `$` (window.$) unless the page has one already (jQuery). */
declare var $: DomStatic;
declare var window: Window & typeof globalThis & { $?: DomStatic };

/**
 * An element as the shim sees it: it sets and reads any property by name
 * (`val`, `attr`, `text`, `html`) and styles by name (`css`).
 */
interface DomTag {
	style: CSSStyleDeclaration & Dict<string>;
	parentElement: DomTag | null;
	children: ArrayLike<DomTag>;
	innerHTML: string;
	matches(q: string): boolean;
	querySelectorAll(q: string): ArrayLike<DomTag>;
	addEventListener(type: string, cb: EventListener): void;
	insertAdjacentElement(where: InsertPosition, el: DomTag): unknown;
	cloneNode(deep: boolean): DomTag;
	[prop: string]: unknown;
}

/** What can be searched: an element, or the document. */
interface DomScope {
	querySelectorAll(q: string): ArrayLike<DomTag>;
}

/** A list of elements. Lists (and elements) are told from a selection by `tags` (a jQuery like object from elsewhere). */
interface DomList extends ArrayLike<DomTag> {
	tags?: unknown;
}

/** What `add` takes: a selector, html, an element or a list of them. */
type DomAddInput = string | DomTag | DomList | null | undefined;

/** An element made from html (by `add`). Elements have no `length`, which is how `add` tells them from lists. */
type DomNew = Element & { length?: undefined };

/** What `$()` takes: a CSS selector (comma separated), html (`<...`), an element, a list of them, or a selection. */
type DomInput = string | DomTag | DomList | DomQuery | null | undefined;

/** `{parentElement}`: a stand in for an element, so that `closest` starts from the element itself. */
interface DomParentOf {
	parentElement?: DomTag | null;
}

/** Where `place` puts an element: before it (-1), first in it (-0.1), last in it (0.1), after it (1). */
type DomWhere = -1 | -0.1 | 0.1 | 1;

/** A selection of the shim (`$()`). */
interface DomQuery {
	/** An array (`$()` makes one), or the list it was made from. */
	tags: ArrayLike<DomTag>;
	/** Call `cb` with each index (a string) and element. */
	each(cb: (i: string, tag: DomTag) => unknown): DomQuery;
	add(add?: DomAddInput): DomQuery;
	/** All elements, or the `i`th. */
	get(i?: number): ArrayLike<DomTag> | DomTag | undefined;
	/** Does any element match `q`? */
	is(q: string): boolean | undefined;
	css(o: Dict<string>): DomQuery;
	on(t: string, cb: EventListener): DomQuery;
	/** Without `t`, the concatenated property `k` (default `value`) of the elements; else set it. */
	val(t?: string, k?: string): DomQuery | string;
	text(t?: string): DomQuery | string;
	html(html?: string): DomQuery | string;
	attr(attr: string, val?: string): DomQuery | string;
	find(q: string): DomQuery;
	place(where: DomWhere, on: DomInput): DomQuery;
	append(html: DomInput): DomQuery;
	appendTo(html: DomInput): DomQuery;
	prependTo(html: DomInput): DomQuery;
	prepend(html: DomInput): DomQuery;
	/** The ancestors that match `q`, or (`c`) the first one. */
	parents(q: string, c?: unknown): DomQuery;
	/** The nearest ancestor that matches `q` (not the element itself). */
	closest(q: string): DomQuery;
	clone(b?: unknown): DomQuery;
}

/** lib/dom.js: a tiny jQuery shim, `window.$`. */
interface DomStatic {
	(q?: DomInput, tag?: DomTag): DomQuery;
	new (q?: DomInput, tag?: DomTag): DomQuery;
	prototype: DomQuery;
	fn: DomQuery;
	/** Call `cb` with each key and value of `o`. */
	each<T>(o: Dict<T> | ArrayLike<T>, cb: (k: string, v: T) => unknown): void;
	isPlainObject(o: unknown): boolean;
}

import type { Dict } from '../src/types';
