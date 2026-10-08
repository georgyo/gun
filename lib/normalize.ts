(function(){

  $.normalize = function(html: NormHtml, customOpt?: Partial<NormOpt>){
    html = html || '';
    var root$: NormJQuery | undefined, wrapped: undefined, opt: NormOpt;
    opt = html.opt || (customOpt ? prepareOptTags($.extend(true, baseOpt, customOpt))
                                 : defaultOpt);
    if(!html.opt){
      // first call
      unstableList.length = 0; // drop state from previous run (in case there has been error)
      root$ = $('<div>'+html+'</div>');
    }
    // initial recursion
    (html.$ || root$!).contents().each(function(){
      if(this.nodeType === this.TEXT_NODE) {
      this.textContent = this.textContent.replace(/^[ \n]+|[ \n]+$/g, ' ');
        return;
      }
      var a = {$: $(this), opt: opt} as NormTag;
      initTag(a);
      $.normalize(a);
    });
    if(root$){
      stateMachine();
      return root$.html();
    }
  }

  var baseOpt: NormOpt = {
    hierarchy: ['div', 'pre', 'ol', 'ul', 'li',
                'h1', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', // block
                'b', 'code', 'i', 'span', 's', 'sub', 'sup', 'u',   // inline
                'br', 'img']                                               // empty
    ,tags: {
      'a': {attrs:{'href':1}, exclude:{'a':1}},
      'b': {exclude:{'b':1,'p':1}},
      'br': {empty: 1},
      'i': {exclude:{'i':1,'p':1}},
      'img': {attrs:{'src':1}, empty: 1},
      'span': {exclude:{'p':1,'ul':1,'ol':1,'li':1,'br':1}},
      's': {space:1},
      'u': {exclude:{'u':1,'p':1},space:1},
    }
    ,convert: {
      'em': 'i', 'strong': 'b', 'strike': 's',
    }
    ,attrs: {
      'id':1
      ,'class':1
      ,'style':1
    }
    ,blockTag: function(a){
      return a.opt.tags[a.tag]!.order! < a.opt.tags.a!.order!;
    }
    ,mutate: [exclude, moveSpaceUp, next, parentOrderWrap]
  }

  var defaultOpt = prepareOptTags($.extend(true, {}, baseOpt));

  var unstableList: NormTag[] = [];

  function addUnstable(a: NormTag) { // NOT ES5
    if(!a.tag) { throw Error("not tag in ", a as {}) }
    if(a.unstable) return;
    unstableList.push(a);
    a.unstable = true;
  }

  function initTag(a: NormTag) {
    // initial handling (container, convert, attributes):
    a.tag = tag(a.$);
      if(empty(a)) {
      return;
    }
    parseAndRemoveAttrs(a);
    convert(a);
    setAttrs(a);
    a.$[0].a = a; // link from dom element back to a
    // state machine init
    unstableList.push(a);
    a.unstable = true;
    return a;
  }

  function stateMachine() {
    if(unstableList.length===0)
      return;
    var a: NormTag | undefined, i = -1;
    while (a = unstableList.pop()) { // PERF: running index is probably faster than shift (mutates array)
      a.unstable = false;
      $(a.opt.mutate).each(function(i,fn){
        return fn && fn(a!, addUnstable);
      });
    }
  }

  function prepareOptTags(opt: NormOpt) {
    var name: string, tag: NormTagOpt | undefined, tags = opt.tags;
    for(name in tags) {
      if(opt.hierarchy.indexOf(name)===-1)
        throw Error('tag "'+name+'" is missing hierarchy definition');
    }
    opt.hierarchy.forEach(function(name){
      if(!tags[name]){
        tags[name] = {attrs: opt.attrs};
      }
      (tag=tags[name]).attrs = $.extend(tag.attrs||{}, opt.attrs);
      tag.name = name; // not used, debug help (REMOVE later?)
      // order
      tag.order = opt.hierarchy.indexOf(name)
      if(tag.order === -1) {
      throw Error("Order of '"+name+"' not defined in hierarchy");
    }
    });
    return opt;
  }

  // GENERAL UTILS

  function get(o: Dict<unknown>, args: string | string[]){ // path arguments as separate string parameters
    if(typeof args === 'string')
      return o[args[0]];
    var i = 0, l = args.length, u: undefined;
    while((o = o[args[i++]] as Dict<unknown>) != null && i < l){};
    return i < l ? u : o;
  }

  function has(obj: object,prop: PropertyKey){
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  // ELEMENT UTILS

  function tag(e: NormJQuery){
    return (($(e)[0]||{} as Partial<NormNode>).nodeName||'').toLowerCase();
  }

  function joint(e: NormJQuery, d?: boolean | string){
    d = (d? 'next' : 'previous') + 'Sibling';
    return $(($(e)[0]||{} as Partial<NormNode>)[d as NormSibling]);
  }

  var xssattr = /[^a-z:]/ig, xssjs = /javascript:/ig;
  // url("javascript: // and all permutations
  // stylesheets can apparently have XSS?

  // create key val attributes object from elements attributes
  function attrsAsObj(e: NormJQuery, filterCb?: NormAttrFilter){
    var attrObj: Dict<string> = {};
    (e = $(e)) && e.length && $(e[0].attributes||[]).each(function(value: number | string | false | undefined,name: Attr | string){
      name = (name as Attr).nodeName||(name as Attr).name;
      value = e.attr(name);
      if(value.replace(xssattr,'').match(xssjs)){ e.removeAttr(name); return }
      value = filterCb? filterCb(value,name,e) : value;
      if(value !== undefined && value !== false)
        attrObj[name] = value;
    });
    return attrObj;
  }

  // TODO: PERF testing - for loop to compare through?
  function sameAttrs(a: NormTag, b: NormTag) {
    return JSON.stringify(a.attr) === JSON.stringify(b.attr);
  }

  // INITIAL MUTATORS

  function parseAndRemoveAttrs(a: NormTag) {
    a.attrs = [];
    var tag = a.opt.convert[a.tag] || a.tag,
    tOpt = a.opt.tags[tag];
    a.attr = tOpt && attrsAsObj(a.$, function(value,name){
    a.$.removeAttr(name);
    if(tOpt!.attrs![name.toLowerCase()]){
      a.attrs!.push(name)
      return value;
    }
    });
  }

  function setAttrs(a: NormTag){
    var l  = function(ind: number | string,name: string){
      var t = name;
      name = a.attrs? name : ind as string;
      var value = a.attrs? a.attr![name.toLowerCase()] : t;
      a.$.attr(name, value);
    }
    a.attrs? $(a.attrs.sort()).each(l) : $.each(a.attr!,l);
  }

  function convert(a: NormTag){
    var t;
    if(t = a.opt.convert[a.tag]){
      a.$.replaceWith(a.$ = $('<'+ (a.tag = t.toLowerCase()) +'>').append(a.$.contents()));
    }
  }

  // LOOPING (STATE MACHINE) MUTATORS

  function exclude(a: NormTag, addUnstable: NormAdd){
    var t = get(a.opt, ['tags', a.tag]),
    pt = get(a.opt, ['tags', tag(a.$.parent())]);
    if(!t || (pt && get(pt as Dict<unknown>, ['exclude', a.tag]))){
      var c = a.$.contents();
      a.$.replaceWith(c);
      c.length===1 && c[0].a && addUnstable(c[0].a);
      return false;
    }
  }

  function moveSpaceUp(a: NormTag, addUnstable: NormAdd){
    var n = a.$[0];
    if(moveSpace(n, true) + moveSpace(n, false)) {
      // either front, back or both spaces moved
      var c;
      if(n.textContent==='') {
        empty(a);
      } else if((c = a.$.contents()[0]) && c.a) {
        parentOrderWrap(c.a, addUnstable)
      }
    }
  }

  function moveSpace(n: NormNode, bef: boolean) {
    var childRe  = bef? /^ / : / $/,
        parentRe = bef? / $/ : /^ /,
        c: NormChild = bef? 'firstChild' : 'lastChild',
        s: NormSibling = bef? 'previousSibling' : 'nextSibling';
        sAdd = bef? 'after' : 'before';
        pAdd = bef? 'prepend' : 'append';
    if(!n || !n[c] || n[c]!.nodeType !== n.TEXT_NODE || !n[c]!.wholeText.match(childRe)) {
      return 0;
    }
    if((n2 = n[s]) && !n.a!.opt.blockTag(n.a!)) {
      if(n2.nodeType === 3 && !n2.textContent.match(parentRe)) {
        n2.textContent = (bef?'':' ') + n2.textContent + (bef?' ':'');
      } else if(n2.nodeType === 1) {
        $(n2)[sAdd](' ');
      }
    } else if((n2 = n.parentNode) && !n.a!.opt.blockTag(n.a!)) {
      $(n2)[pAdd](' ');
    } else {
      return 0;
    }
    n[c]!.textContent = n[c]!.wholeText.replace(childRe, '');
    if(!n[c]!.wholeText.length)
      $(n[c]).remove();
    return 1;
  }

  function next(a: NormTag, addUnstable: NormAdd, t?: NormJQuery){
    var t: NormJQuery | undefined = t || joint(a.$, true), sm: undefined;
    if(!t.length || a.opt.blockTag(a))
      return;
    if(a.opt.spaceMerge && t.length===1 && t[0].nodeType === 3 && t[0].wholeText===' '){
      if(!(t2 = joint(t, true)).length || a.opt.blockTag(t2[0].a!))
        return;
      t.remove();
      t2.prepend(' ');
      return next(a, addUnstable, t2);
    }
    if(!t[0].a || a.tag !== t[0].a.tag || !sameAttrs(a, t[0].a))
      return;
    t.prepend(a.$.contents());
    empty(a);
    addUnstable(t[0].a);
    (t = t.children(":first")).length && addUnstable(t[0].a!);
  }

  function empty(a: NormTag){
    var t = a.opt.tags[a.tag];
    if((!t || !t.empty) && !a.$.contents().length && !a.$[0].attributes.length){
      a.$.remove();
      return true; // NOTE true/false - different API than in exclude
    }
  }

  function parentOrderWrap(a: NormTag, addUnstable: NormAdd){
    var parent = a.$.parent(), children = parent.contents(),
    tags = a.opt.tags, ptag;

    if(children.length===1 && children[0] === a.$[0]
    && (ptag=tags[tag(parent)]) && ptag.order! > tags[a.tag]!.order!){
      parent.after(a.$);
      parent.append(a.$.contents());
      a.$.append(parent);
      addUnstable(parent[0].a!);
      addUnstable(a);
    }
  }
})();

/** jQuery, which the page loads first, with the `$.normalize` this file adds. Only what is used here. */
declare var $: NormJQueryStatic;
// Upstream assigns these without declaring them (implicit globals).
declare var sAdd: 'after' | 'before';
declare var pAdd: 'prepend' | 'append';
declare var n2: NormNode | null;
declare var t2: NormJQuery;

/** `$.normalize(html, opt)`: clean up a piece of html (or, recursively, a tag) to the tags and attributes of `opt`. */
type Normalize = (html: NormHtml, customOpt?: Partial<NormOpt>) => string | undefined;

/** Html text. A string has no `opt` nor `$`, which is how `$.normalize` tells it from a tag it recurses into. */
type NormString = string & { opt?: undefined; $?: undefined };
type NormHtml = NormString | NormTag;

/** The options of a tag. */
type NormTagOpt = {
  /** The attributes it keeps. */
  attrs?: Dict<number>;
  /** The tags it must not be directly inside of. */
  exclude?: Dict<number>;
  /** It may be empty. */
  empty?: number;
  space?: number;
  /** Set by `prepareOptTags`. */
  name?: string;
  /** Its position in the hierarchy, set by `prepareOptTags`. */
  order?: number;
};

/** `NormOpt.mutate`: a step of the state machine. Returning `false` stops the steps for this tag. */
type NormMutator = (a: NormTag, addUnstable: NormAdd) => unknown;
type NormAdd = (a: NormTag) => void;

/** The options of `$.normalize`. (A type literal, so that `get` can read it as a record.) */
type NormOpt = {
  /** The allowed tags, outermost first. */
  hierarchy: string[];
  tags: Dict<NormTagOpt>;
  /** Tags to rename. */
  convert: Dict<string>;
  /** The attributes every tag keeps. */
  attrs: Dict<number>;
  blockTag(a: NormTag): boolean;
  mutate: NormMutator[];
  spaceMerge?: boolean;
};

/** The state of a tag being normalized. */
interface NormTag {
  $: NormJQuery;
  opt: NormOpt;
  tag: string;
  unstable?: boolean;
  /** The names of the attributes it keeps. */
  attrs?: string[];
  attr?: Dict<string>;
}

/** Filters an attribute: its value to keep, or `undefined` / `false` to drop it. */
type NormAttrFilter = (value: string, name: string, e: NormJQuery) => string | false | undefined;

type NormSibling = 'nextSibling' | 'previousSibling';
type NormChild = 'firstChild' | 'lastChild';

/** A DOM node as lib/normalize.js reads it (`wholeText` is only read on text nodes), with its tag state in `a`. */
interface NormNode {
  nodeType: number;
  nodeName: string;
  TEXT_NODE: number;
  textContent: string;
  wholeText: string;
  attributes: NamedNodeMap;
  parentNode: NormNode | null;
  firstChild: NormNode | null;
  lastChild: NormNode | null;
  nextSibling: NormNode | null;
  previousSibling: NormNode | null;
  a?: NormTag;
}

/** What `$()` takes. */
type NormQuery = string | NormNode | NormJQuery | null | undefined;

/** A jQuery selection. Only what lib/normalize.js uses. */
interface NormJQuery<T = NormNode> {
  length: number;
  [i: number]: T;
  each(cb: (this: T, i: number, v: T) => unknown): NormJQuery<T>;
  contents(): NormJQuery;
  children(q: string): NormJQuery;
  parent(): NormJQuery;
  html(): string;
  attr(name: string): string;
  attr(name: string, value: string | undefined): NormJQuery;
  removeAttr(name: string): NormJQuery;
  replaceWith(c: NormJQuery): NormJQuery;
  remove(): NormJQuery;
  append(c: NormJQuery | string): NormJQuery;
  prepend(c: NormJQuery | string): NormJQuery;
  after(c: NormJQuery | string): NormJQuery;
  before(c: NormJQuery | string): NormJQuery;
}

/** jQuery's `$`. Only what lib/normalize.js uses. */
interface NormJQueryStatic {
  (q: NormQuery): NormJQuery;
  <T>(q: ArrayLike<T>): NormJQuery<T>;
  each<T>(o: Dict<T>, cb: (k: string, v: T) => unknown): Dict<T>;
  extend<T extends object, S extends object>(target: T, src: S): T & S;
  extend<T extends object, S extends object>(deep: true, target: T, src: S): T & S;
  normalize: Normalize;
}

import type { Dict } from '../src/types';
