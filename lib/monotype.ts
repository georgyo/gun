;var monotype: /* the global `monotype` if the page already has one (`!`: TypeScript cannot see the global) */ Monotype = monotype! || (function(monotype: Monotype){
	monotype.range = function(n?: number){
		var R: MonoRange | MonoIERange | undefined, s: MonoSelection, t: undefined, n: number | undefined = n || 0, win = monotype.win || window, doc = win.document;
		if(!arguments.length) return doc.createRange();
		if(!(win.Range && R instanceof Range)){
			s = win.getSelection? win.getSelection()! : {} as MonoSelection;
			if(s.rangeCount){ 
				R = s.getRangeAt(n);
			} else {
				if(doc.createRange){
					R = doc.createRange();
					R.setStart(doc.body, 0);
				} else 
				if (doc.selection){ // <IE9
					R = doc.selection.createRange();
					R = R.getBookmark();
				}
			}
			s.end = (s.extentNode || s.focusNode || R!.startContainer);
			if(s.anchorNode === s.end){
				R!.direction = s.anchorOffset <= (s.extentOffset || s.focusOffset || 0)? 1 : -1;
			} else
			if($.contains(s.anchorNode||{}, s.end||{})){
				s.end = $(s.anchorNode).contents().filter(s.end).length? s.end : $(s.end).parentsUntil(s.anchorNode).last()[0];
				R!.direction = s.anchorOffset < $(s.anchorNode).contents().index(s.end)? 1 : -1; // Compare immediate descendants to see which comes first.
			} else {
				R!.direction = s.anchorNode === R!.endContainer? -1 : 1; // Checking against startContainer fails going backward.
			}
		}
		return R!;
	}
	monotype.restore = function(R: MonoRange | MonoState){
		var win = monotype.win, doc = win.document;
		if(R.R && R.restore){ 
			R.restore();
			return;
		}
		if(win.getSelection){
			var s = win.getSelection!()!;
			s.removeAllRanges();
			if(s.extend && R.direction! < 0){
				R.esC = R.startContainer;
				R.esO = R.startOffset;
				R.setStart(R.endContainer, R.endOffset);
			}
			s.addRange(R);
			R.esC && s.extend!(R.esC, R.esO);
		} else {
			if(doc.body.createTextRange) { // <IE9
				var ier = doc.body.createTextRange();
				ier.moveToBookmark(R);
				ier.select();
			}
		}
	}
	monotype.text = function(n?: MonoTextArg){
		return !n? false : (n.nodeType == 3 || n.nodeType == Node.TEXT_NODE);
	}
	monotype.prev = function(n?: Node | null,c?: Node,d?: number): Node | null{
		return !n? null : n === c? null
		: n[(d?'next':'previous')+'Sibling' as MonoSibling]?
			monotype.deep(n[(d?'next':'previous')+'Sibling' as MonoSibling]!,d?-1:Infinity).container
		: monotype.prev($(n).parent()[0],c,d);
	}; monotype.next = function(n,c){ return monotype.prev(n,c,1) }
	monotype.deep = function(n: Node, o: number, c?: MonoJQuery | Node, i?: number): MonoDeep{
		return i = (o === Infinity? $(n).contents().length-1 : o),
		i = (i === -1? 0 : i),
		(c = $(n).contents()).length?
			monotype.deep(c = c[i < c.length? i : c.length - 1], monotype.text(c)? 0 : o)
		: {
			container: n
			,offset: $(n).text() && o !== -1? (o === Infinity? $(n).text().length : o) : 0
		};
	}
	monotype.count = function(n: Node, o: number, c?: Node){
		var g = monotype.deep(n, o)
		, m: Node | null = g.container
		, i = g.offset || 0;
		while(m = monotype.prev(m,c)){
			i += $(m).text().length;
		}
		return i;
	}
	monotype.hint = function(n: Node, o: number, c?: Node){
		var g = monotype.deep(n, o)
		, m: Node | null = g.container
		, i = g.offset || 0
		, h: MonoHint[] = [], t;
		while(m){
			h.push({
				t: t = $(m).text()
				,n: t? 'TEXT' : m.nodeName
			});
			m = t? null : monotype.prev(m,c);
		}
		if(h.length == 1 && h[0].t){
			return [];
		}
		if((t = $(n).contents()).length && o == t.length){
			h.push(1); // Indicate that the selection is after the last element.
		}
		return h;
	}
	monotype.reach = function(i: number, c: Node, o?: MonoReach): MonoReached{
		o = o || {};
		o.i = o.i || o.offset || 0;
		o.$ = o.$? o.$.jquery? o.$ : $(o.$) 
		: o.container? $(o.container) : $(c);
		var n: Node | null = monotype.deep(o.$[0], -1).container, t;
		while(n){
			t = $(n).text().length;
			if(i <= o.i + t){
				o.$ = $(n);
				o.i = i - o.i;
				n = null;
			} else {
				o.i += t;
			}
			n = monotype.next(n,c);
		}
		return o as MonoReached;
	}
	return monotype;
})(function(e?: MonoInput,opt?: MonoOpt){
	var r = {} as MonoState, t, m = monotype;
	opt = opt || {};
	m.win = opt.win || window;
	r = (e as MonoJQuery||r).jquery || m.text(e)? {root: $(e||m.win.document.body)} as MonoState : r;
	r.root = $(r.root || m.win.document.body);
	//console.log('_______________________');
	r.R = m.range(0);
	r.H = {} as MonoHints;
	r.H.R = $.extend({}, r.R);
	r.d = r.R.direction || 1;
	r.t = r.R.toString();
	r.H.s = m.hint(r.R.startContainer, r.R.startOffset, r.root[0]);
	r.s = m.count(r.R.startContainer, r.R.startOffset, r.root[0]);
	t = m.deep(r.R.startContainer, r.R.startOffset);
	(!t.offset && !r.H.s.length) && (r.s += 0.1); // At the beginning of a text, not at the end of a text.
	r.H.e = m.hint(r.R.endContainer, r.R.endOffset, r.root[0]);
	r.e = (function(n: Node, o: number, c?: number, t?: MonoDeep){
		if(r.R.collapsed
		|| (o === r.R.startOffset 
		&& n === r.R.startContainer)){
			return r.s;
		} c = m.count(n, o, r.root[0]);
		t = m.deep(n, o);
		(!t.offset && !r.H.e.length) && (c += 0.1); // Same as above.
		return c;
	})(r.R.endContainer, r.R.endOffset);
	//console.log(r.s, r.R.startOffset, r.H.s, 'M',r.d,'E', r.H.e, r.R.endOffset, r.e);
	t = r.root.text();
	r.L = t.length;
	r.T = {
		s: t.slice(r.s - 9, r.s)
		,e: t.slice(r.e, r.e + 9)
		,t: function(){ return r.T.s + r.T.e }
	}
	r.range = function(){
		//console.log('----');
		r.H = r.H || {};
		var s = m.reach(r.s, r.root[0])
		, st = s.$.text()
		, e = m.reach(r.e, r.root[0])
		, et = e.$.text()
		, R = m.range()
		, p = function(g: MonoReached, c: MonoHint[]): MonoReached{ // TODO: BUG! Backtracking in non-Chrome and non-IE9+ browsers. IE9 doesn't like end selections.
			if(!c || !c.length){
				return g;
			}
			var n: Node | MonoJQuery | number | null = g.$[0], f: Node[] | MonoJQuery = [], i = 0, t;
			while((n = m.next(n,r.root[0])) && ++i < c.length){
				t = $(n).text();
				if(t){
					n = null;
				} else {
					f.push(n);
				}
			}
			n = $(f[f.length-1] || g.$);
			t = n.parent();
			if(c[c.length-1] === 1 || (i && f.length === i 
			&& (f.length < c.length-1))){ // tests pass with this condition, yet failed without
				return {
					i: t.contents().length
					,$: t
				}
			}
			if(f.length < c.length - 1){ // despite above's addition, this still gets activated.
				f = t.contents().slice(n = t.contents().index(n));
				i = f.map(function(j){ return $(this).text()? (n as number+j+1) : null})[0] || t.contents().length;
				f = f.slice(0, i - n);
				n = f.last()[0];
				if(g.$[0] === n){
					return g;
				}
				return {
					$: t
					,i: t.contents().index(n)
				}
			}
			return {
				i: 0
				,$: n
			};
		}
		s = p(s, r.H.s);
		e = p(e, r.H.e);
		//console.log("START", parseInt(s.i), 'in """',(s.$[0]),'""" with hint of', r.H.s, 'from original', r.s);
		//console.log("END", parseInt(e.i), 'in """',(e.$[0]),'""" hint clue of', r.H.e, 'from original', r.e);
		R.setStart(s.$[0], parseInt(s.i as unknown as string)); // `parseInt` stringifies numbers.
		R.setEnd(e.$[0], parseInt(e.i as unknown as string)); // `parseInt` stringifies numbers.
		return R;
	}
	r.restore = function(R?: MonoRange){
		if(r.R.startOffset !== r.H.R.startOffset
		|| r.R.endOffset !== r.H.R.endOffset
		|| r.R.startContainer !== r.H.R.startContainer
		|| r.R.endContainer !== r.H.R.endContainer){
			r.R = R = r.range();
		} else {
			R = r.R;
		}
		R.direction = r.d;
		m.restore(R);
		return r;
	}
	return monotype.late(r,opt);
	//return r;
} as Monotype);
monotype.late = function(r,opt){
	var u: undefined, m = r //monotype(r,opt)
	, strhml = function(t: string){
		return (t[0] === '<' && $(t).length)
	}, jqtxt = function(n: MonoText | MonoJQuery){
		return n.jquery?n:(strhml(n as MonoText))?$('<div>'+n+'</div>').contents():$(document.createTextNode(n as MonoText));
	}
	m.get = function(d?: number | boolean){
		if(u === d){ return $([m.R.startContainer, m.R.endContainer]) }
		return monotype.deep((d = (d && d as number > 0))? m.R.endContainer : m.R.startContainer
			, d? m.R.endOffset : m.R.startOffset).container;
	}
	m.remove = function(n?: unknown,R?: MonoRange){
		R = m.R || m.range();
		R.deleteContents();
		monotype.restore(R);
		m = monotype(m,opt);
		return m;
	}
	m.insert = function(n: MonoText | MonoJQuery,R?: MonoRange){
		n = jqtxt(n);
		R = m.R || m.range();
		R.deleteContents();
		$(n.get().reverse()).each(function(){
			R.insertNode(this);
		});
		R.selectNodeContents(n.last()[0]);
		monotype.restore(R);
		m = monotype(m,opt);
		return m;
	}
	m.wrap = function(n: MonoText | MonoJQuery | Node,R?: MonoRange){
		var jq;
		n = jqtxt(n as MonoText | MonoJQuery);
		n = n[0];
		R = m.R || m.range();
		if(monotype.text(R.startContainer) || monotype.text(R.endContainer)){
			var b = R.cloneContents();
			R.deleteContents();
			jq = $(n);
			jq.html(b);
			jq = jq[0];
			R.insertNode(jq);
		}else{
			R.surroundContents(n);
		}
		R.selectNodeContents(jq||n);
		monotype.restore(R);
		m = monotype(m,opt);
		return m;
	}
	m.select = function(n: MonoInput,i?: number,e?: number | MonoJQuery,j?: number | MonoJQuery){
		var R = m.R || m.range(), t = e;
		n = $(n);
		if($.isNumeric(e)){
			e = j || n;
			j = t;
		} else {
			e = e || n;
		}
		j = $.isNumeric(j)? j : $.isNumeric(i)? i : Infinity;
		i = i || 0;
		if(i < 0){
			t = n.contents().length || n.text().length;
			i = t + i;
		} if(j < 0){
			t = n.contents().length || n.text().length;
			j = t + j;
		} if(j === Infinity){
			R.selectNodeContents(n[0]);
		} else {
			R.setStart(n[0],i);
			R.setEnd((e as MonoJQuery)[0],j);
		}
		monotype.restore(R);
		m = monotype(m,opt);
		return m;
	}
	return m;
}

; // Ends the statement above: the declarations below are types only (build.mts would start each with a ';' otherwise).
/** jQuery, which the page loads first. Only what is used here. */
declare var $: MonoJQueryStatic;

/** lib/monotype.js: save the selection (as text offsets, which survive re-rendering), and restore it. */
interface Monotype {
	/** Save the selection in `e` (default: the document body) of `opt.win`. */
	(e?: MonoInput, opt?: MonoOpt): MonoState;
	/** The window of the last `monotype()`. */
	win: MonoWindow;
	/** The `n`th range of the selection (with its `direction`), or a new range. */
	range(n?: number): MonoRange;
	/** Select `R`. */
	restore(R: MonoRange | MonoState): void;
	/** Is `n` a text node? */
	text(n?: MonoTextArg): boolean;
	/** The previous (`d`: next) leaf before `c`. */
	prev(n?: Node | null, c?: Node, d?: number): Node | null;
	next(n?: Node | null, c?: Node): Node | null;
	/** The deepest first (`o` -1) or last (`o` Infinity) leaf. */
	deep(n: Node, o: number): MonoDeep;
	/** The text offset of a position in `c`. */
	count(n: Node, o: number, c?: Node): number;
	/** The (empty) elements between a position and the text before it. */
	hint(n: Node, o: number, c?: Node): MonoHint[];
	/** The node and offset of the text offset `i` in `c`. */
	reach(i: number, c: Node, o?: MonoReach): MonoReached;
	/** Add `get`, `remove`, `insert`, `wrap` and `select` to a saved selection. */
	late(r: MonoState, opt?: MonoOpt): MonoState;
}

interface MonoOpt {
	win?: MonoWindow;
}

/** What `monotype()` takes: an element, a jQuery selection, or a saved selection to update. */
type MonoInput = Node | MonoJQuery | MonoState | null | undefined;

/** What `monotype.text` takes. jQuery selections and saved selections have no `nodeType`. */
type MonoTextArg = Node | MonoJQuery | MonoState | null;

/** Html (`<...`) or text. Strings have no `jquery`, which is how `jqtxt` tells them from selections. */
type MonoText = string & { jquery?: undefined };

type MonoSibling = 'nextSibling' | 'previousSibling';

/** A position: a leaf and an offset in it. */
interface MonoDeep {
	container: Node;
	offset: number;
}

/** A hint: the text (or the tag name of an element without text) of a leaf; `1` marks a position after the last element. */
type MonoHint = { t: string; n: string } | (1 & { t?: undefined });

/** A position found by `reach`: a selection and an offset in it. */
interface MonoReach {
	i?: number;
	offset?: number;
	$?: MonoJQuery | MonoNode;
	container?: Node;
}

/** What `reach` returns: the selection of the leaf, and the offset in it. */
interface MonoReached {
	i: number;
	$: MonoJQuery;
}

/** A node. Nodes have no `jquery`, which is how `reach` tells them from selections. */
type MonoNode = Node & { jquery?: undefined };

/**
 * A range with the direction of the selection it came from. Ranges have no
 * `R` nor `restore`, which is how `monotype.restore` tells them from a saved selection.
 */
interface MonoRange extends Range {
	direction?: number;
	/** Where to `extend` a backward selection to. */
	esC?: Node;
	esO?: number;
	R?: undefined;
	restore?: undefined;
	getBookmark?: undefined;
}

/** The selection, with the node its focus is in (`end`), and old WebKit's `extent`. */
interface MonoSelection extends Omit<Selection, 'extend'> {
	/** Missing in old IE. */
	extend?(node: Node, offset?: number): void;
	end?: Node | null;
	extentNode?: Node | null;
	extentOffset?: number;
}

/**
 * IE < 9's selection. lib/monotype.js keeps the bookmark of its range (a
 * string) in place of a `Range`: it is typed as the range it stands in for.
 */
interface MonoIESelection {
	createRange(): MonoIERange;
}
interface MonoIERange extends Omit<MonoRange, 'getBookmark'> {
	getBookmark(): MonoRange;
}

/** The window (or frame) whose selection is saved, as lib/monotype.js uses it. */
interface MonoWindow {
	document: Document & {
		selection?: MonoIESelection;
		body: { createTextRange?(): { moveToBookmark(R: MonoRange): void; select(): void } };
	};
	getSelection?(): MonoSelection | null;
	Range?: unknown;
}

/** The saved state of the original range, to tell whether it changed. */
interface MonoHints {
	R: Pick<MonoRange, 'startOffset' | 'endOffset' | 'startContainer' | 'endContainer'>;
	/** The hints of the start and the end. */
	s: MonoHint[];
	e: MonoHint[];
}

/** A saved selection (`monotype()`). */
interface MonoState {
	jquery?: undefined;
	nodeType?: undefined;
	/** The element the offsets are in. */
	root: MonoJQuery;
	/** The range when it was saved. */
	R: MonoRange;
	H: MonoHints;
	/** Its direction. */
	d: number;
	/** Its text. */
	t: string;
	/** Its start and end, as text offsets in `root` (+ 0.1 at the start of a text). */
	s: number;
	e: number;
	/** The length of the text of `root`. */
	L: number;
	/** The text around the start and the end. */
	T: { s: string; e: string; t(): string };
	/** The range at the saved offsets. */
	range(): MonoRange;
	/** Select it again. */
	restore(R?: MonoRange): MonoState;
	/** The start and end containers, or the leaf at the start (`d`: end). */
	get(d?: number | boolean): MonoJQuery | Node;
	remove(n?: unknown, R?: MonoRange): MonoState;
	/** Replace the selection with html, text or elements. */
	insert(n: MonoText | MonoJQuery, R?: MonoRange): MonoState;
	/** Wrap the selection in an element. */
	wrap(n: MonoText | MonoJQuery | Node, R?: MonoRange): MonoState;
	/** Select (the contents of) `n`, or offsets `i` to `j` (of `e`) in it. */
	select(n: MonoInput, i?: number, e?: number | MonoJQuery, j?: number | MonoJQuery): MonoState;
}

/** A jQuery selection. Only what lib/monotype.js uses. */
interface MonoJQuery {
	jquery: string;
	nodeType?: undefined;
	length: number;
	[i: number]: Node;
	contents(): MonoJQuery;
	parent(): MonoJQuery;
	parentsUntil(n?: Node | null): MonoJQuery;
	filter(n?: Node | null): MonoJQuery;
	last(): MonoJQuery;
	slice(start: number, end?: number): MonoJQuery;
	index(n: Node | MonoJQuery | number): number;
	map<R>(cb: (this: Node, j: number) => R): ArrayLike<R>;
	each(cb: (this: Node) => void): MonoJQuery;
	get(): Node[];
	text(): string;
	html(h: DocumentFragment): MonoJQuery;
}

/** jQuery's `$`. Only what lib/monotype.js uses. */
interface MonoJQueryStatic {
	(q: string | MonoInput | Node[]): MonoJQuery;
	contains(a: Node | {}, b: Node | {}): boolean;
	extend<T extends object, S extends object>(target: T, src: S): T & S;
	isNumeric(v: unknown): v is number;
}

