(function (Gun: GunStatic, u?: undefined) {
    /**
     * 
     *  credits: 
     *      github:bmatusiak
     * 
     */    
    var lex: LexFactory = (gun: Chain) => {
        function Lex() {}

        Lex.prototype = Object.create(Object.prototype, {
            constructor: {
                value: Lex
            }
        });
        Lex.prototype.toString = function (this: LexQuery) {
            return JSON.stringify(this);
        }
        Lex.prototype.more = function (this: LexQuery, m: string) {
            this[">"] = m;
            return this;
        }
        Lex.prototype.less = function (this: LexQuery, le: string) {
            this["<"] = le;
            return this;
        }
        Lex.prototype.in = function (this: LexQuery) {
            var l = new (Lex as LexCtor)();
            this["."] = l;
            return l;
        }
        Lex.prototype.of = function (this: LexQuery) {
            var l = new (Lex as LexCtor)();
            this.hash(l)
            return l;
        }
        Lex.prototype.hash = function (this: LexQuery, h: string | LexQuery) {
            this["#"] = h;
            return this;
        }
        Lex.prototype.prefix = function (this: LexQuery, p: string) {
            this["*"] = p;
            return this;
        }
        Lex.prototype.return = function (this: LexQuery, r: string) {
            this["="] = r;
            return this;
        }
        Lex.prototype.limit = function (this: LexQuery, l: number) {
            this["%"] = l;
            return this;
        }
        Lex.prototype.reverse = function (this: LexQuery, rv?: number | boolean) {
            this["-"] = rv || 1;
            return this;
        }
        Lex.prototype.includes = function (this: LexQuery, i: unknown) {
            this["+"] = i;
            return this;
        }
        Lex.prototype.map = function (this: LexQuery, ...args: [opt?: unknown, t?: unknown]) {
            return gun.map(this, ...args);
        }
        Lex.prototype.match = lex.match;
        
        return new (Lex as LexCtor)();
    };

    lex.match = function(this: LexMatch | void, t: unknown, o?: string | LexMatch){ var tmp, u: undefined;
        o = o || this || {};            
        if('string' == typeof o){ o = {'=': o} }
        if('string' !== typeof t){ return false }
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

    Gun.Lex = lex;

    Gun.chain.lex = function (this: Chain) {
        return lex(this);
    }

})((typeof window !== "undefined") ? window.Gun : require('../gun'))

/** `gun.lex()`: a LEX query builder (`gun.lex().more('a').less('c').map()`). Each method sets a key and returns the query. */
interface LexQuery extends LexMatch {
    '#'?: string | LexQuery;
    '.'?: LexQuery;
    '%'?: number;
    '+'?: unknown;
    /** Its JSON. */
    toString(this: LexQuery): string;
    /** `>`. */
    more(this: LexQuery, m: string): LexQuery;
    /** `<`. */
    less(this: LexQuery, le: string): LexQuery;
    /** A new query for the key (`.`). */
    in(this: LexQuery): LexQuery;
    /** A new query for the soul (`#`). */
    of(this: LexQuery): LexQuery;
    /** `#`. */
    hash(this: LexQuery, h: string | LexQuery): LexQuery;
    /** `*`. */
    prefix(this: LexQuery, p: string): LexQuery;
    /** `=`. */
    return(this: LexQuery, r: string): LexQuery;
    /** `%`. */
    limit(this: LexQuery, l: number): LexQuery;
    /** `-` (default 1). */
    reverse(this: LexQuery, rv?: number | boolean): LexQuery;
    /** `+`. */
    includes(this: LexQuery, i: unknown): LexQuery;
    /** `gun.map(query)` on the chain the query was made from. */
    map(this: LexQuery, ...args: [opt?: unknown, t?: unknown]): Chain<ChainMeta>;
    match: LexMatchFn;
}

/** Does `t` match the LEX `o` (default: `this`, as a method of a query)? */
type LexMatchFn = (this: LexMatch | void, t: unknown, o?: string | LexMatch) => boolean;

/** The query constructor (a plain function, used with `new`). */
interface LexCtor {
    (): void;
    new (): LexQuery;
}

/** `Gun.Lex`: a query builder for a chain. */
interface LexFactory {
    (gun: Chain): LexQuery;
    /** Set right after the factory. */
    match?: LexMatchFn;
}

declare module '../src/types' {
    interface GunStatic {
        /** lib/lex.js. */
        Lex?: LexFactory;
    }
    interface Chain {
        /** lib/lex.js: a LEX query builder for this chain. */
        lex(this: Chain): LexQuery;
    }
}

import type { Chain, ChainMeta, GunStatic, LexMatch } from '../src/types';
