;(function(){ // RAD
	console.log("Warning: Experimental rewrite of RAD to use Book. It is not API compatible with RAD yet and is very alpha.");
	var sT = setTimeout, Book: BookFactory = sT.Book || require('gun/src/book'), RAD: RadStatic = sT.RAD || (sT.RAD = function(opt){
		opt = opt || {};
		opt.file = String(opt.file || 'radata');
		var log = opt.log || console.log

		var has = (sT.RAD.has || (sT.RAD.has = {}))[opt.file];
		if(has){ return has } // TODO: BUG? Not reuses same instance?
		var r = function rad(word: string, is?: RadReadCb | BookValue, reply?: RadWriteCb){ r.word = word;
			if(!b){ start(word, is, reply); return r }
			if(is === undefined || 'function' == typeof is){ // THIS IS A READ:
				var page = b.page(word);
				if(page.from){ return is && is(page, null), r }
				return read(word, is, page), r; // get from disk
			}
			//console.log("OFF");return;
			// ON WRITE:
			// batch until read from disk is done (and if a write was going, do that first)
			//if(!valid(word, is, reply)){ return }
			b(word, is);
			write(word, reply);
			return r;
		} as Rad, /** @param b the book */ b: Book | undefined;
		r.then = function(cb?: RadThenCb | null, p?: Promise<BookPage | undefined>){ return p = (new Promise(function(yes, no){ r(r.word!, yes) })), cb? p.then(cb) : p }
		r.read = r.results = function(cb){ return (new Promise(async function(yes, no){ yes((await r(r.word!))!.read(cb)) })) }

		async function read(word: string, reply?: RadReadCb, page?: BookPage){ // TODO: this function doesn't do much, inline it???
			if(!reply){ return }
			var p = page || b!.page(word);
			get(p, function(err, disk){
				if(err){ log("ERR! in read() get() cb", err); reply(p.no, err); return }
				p.from = disk || p.from;
				reply(p, null, b);
			})
		}

		function write(word: string, reply?: RadWriteCb | RadSaved){
			var p = b!.page(word), tmp: RadSaving | undefined;
			if(tmp=p.saving){(reply||!tmp.length)&&(p.saving=tmp.concat(reply));return} // TODO: PERF! Rogowski points out concat is slow. BUG??? I HAVE NO clue how/why this if statement being called from recursion yet not set to 0.
			p.saving = ('function' == typeof reply)? [reply] : reply || [];
			get(p, function(err, disk){
				if(err){ log("ERR! in write() get() cb ", err); return } // TODO: BUG!!! Unhandled, no callbacks called.
				p.from = disk || p.from;
				tmp = p.saving as /* a list while it is being saved */ RadSaved; p.saving = [];
				put(p, ''+p, function(err, ok){
					sT.each(tmp as RadSaved, function(cb){ cb && cb(err, ok) });
					tmp = p.saving as RadSaved; p.saving = 0;
					if(tmp.length){ write(word, tmp) }
				});
			}, p);
		}
		function put(file: BookPage | RadStr, data: string, cb?: RadPutCb){
			(put as RadPutFn)[file = fname(file)] = { data: data };
			RAD.put(file, data, function(err, ok){
				delete (put as RadPutFn)[file];
				cb && cb(err, ok);
			}, opt!);
		};
		function get(file: BookPage | RadStr, cb: RadPageCb, page?: BookPage): void; function get(file: BookPage | RadStr, cb: RadPageCb){
			var tmp: { data: string } | RadPageCb[] | '' | undefined;
			if(!file){ return } // TODO: HANDLE ERROR!!
			if(file.from){ cb(null, file.from); return }
			if(b&&1==b.list.length){ file.first = (file.first as string < '!')? file.first : '!'; } // TODO: BUG!!!! This cleanly makes for a common first file, but SAVING INVISIBLE ASCII KEYS IS COMPLETELY UNTESTED and guaranteed to have bugs/corruption issues.
			if(tmp = (put as RadPutFn)[file = fname(file)]){ cb(u, tmp.data); return }
			if(tmp = (get as RadGetFn)[file]){ tmp.push(cb); return } (get as RadGetFn)[file] = [cb];
			RAD.get(file, function(err, data){
				tmp = (get as RadGetFn)[file]||''; delete (get as RadGetFn)[file];
				sT.each(tmp as /* or '': none */ RadPageCb[], function(cb){ cb && cb(err, data) });
			}, opt!);
		};

		function start(word: string, is?: RadReadCb | BookValue, reply?: RadWriteCb){
			if(b){ r(word, is, reply); return }
			get(' ', function(err, d){
				if(err){ log('ERR! in start() get()', err); reply && reply(err); return }
				if(b){ r(word, is, reply); return }
				b = r.book = Book();
				if((d = Book.slot(d as /* the index is text */ string | undefined)).length){ b.list = d as string[] } // TODO: BUG! Add some other sort of corrupted/error check here?
				watch(b).parse = function(t){ return ('string' == typeof t)? Book.decode(Book.slot(t)[0]) as /* a word */ string | undefined : t } // TODO: This was ugly temporary, but is necessary, and is logically correct, but is there a cleaner, nicer, less assumptiony way to do it? // TODO: SOLUTION?! I think this needs to be in Book, not RAD.
				r(word, is, reply);
			})
		}
		function watch(b: Book): Book { // SPLIT LOGIC!
			var split = b.split;
			b.list.toString = function(){
				//console.time();
				var i = -1, t = '', p: BookPage | RadStr; while (p = this[++i]){
					t += "|" +"`"+Book.encode(p.substring())+"`"+Book.encode(p.meta||null)+"`"
				}
				t += "|";
				//console.timeEnd();
				return t;
			}
			b.split = function(next, page){
				put(' ', '' + b.list, function(err, ok){
					if(err){ console.log("ERR!"); return }
					// ??
				});
			}
			return b;
		}

		function ename(t: string){ return encodeURIComponent(t).replace(/\*/g, '%2A').slice(0, 250) }
		//function fname(p){ return opt.file + '/' + ename(p.substring()) }
		function fname(p: BookSortable){ return ename(p.substring()) }

		function valid(word: string, is: unknown, reply: RadWriteCb){
			if(is !== is){ reply(word +" cannot be NaN!"); return }
			return true;
		}

		return r;
	} as RadStatic), MAX = 1000/* 300000000 */;
	sT.each = sT.each || function(l: unknown[],f: (item: unknown) => unknown){l.forEach(f)} as /* without turns */ Each;

	try { module.exports = RAD } catch (e){ }
/*
	// junk below that needs to be cleaned up and corrected for the actual correct RAD API.
	var env = {}, nope = function(){ }, nah = function(){ return nope }, u;
	env.require = (typeof require !== '' + u && require) || nope;
	env.process = (typeof process != '' + u && process) || { memoryUsage: nah };
	env.os = env.require('os') || { totalmem: nope, freemem: nope };
	env.v8 = env.require('v8') || { getHeapStatistics: nah };
	env.fs = env.require('fs') || { writeFile: nope, readFile: nope };


	env.max = env.v8.getHeapStatistics().total_available_size / (2 ** 12);

	env.count = env.last = 0;
	return;

	//if(err && 'ENOENT' === (err.code||'').toUpperCase()){ err = null }

	setInterval(function(){
		var stats = { memory: {} };

		stats.memory.total = env.os.totalmem() / 1024 / 1024; // in MB
		stats.memory.free = env.os.freemem() / 1024 / 1024; // in MB
		stats.memory.hused = env.v8.getHeapStatistics().used_heap_size / 1024 / 1024; // in MB
		stats.memory.used = env.process.memoryUsage().rss / 1024 / 1024; // in MB
		console.log(stats.memory);
	}, 9);
*/
}());


; (function(){ // temporary fs storage plugin, needs to be refactored to use the actual RAD plugin interface.
	var fs: typeof import('fs') | undefined;
	try { fs = require('fs') } catch (e){ };
	if(!fs){ return }

	var sT = setTimeout, RAD = sT.RAD;
	RAD.put = function(file, data, cb, opt){
		fs!.writeFile(opt.file+'/'+file, data, cb);
	}
	RAD.get = function(file, cb, opt){
		fs!.readFile(opt.file+'/'+file, function(err, data){
			if(err && 'ENOENT' === (err.code||'').toUpperCase()){ return cb() }
			cb(err, ((data||'').toString()||data) as /* an empty file gives its (empty) Buffer */ string);
		});
	}
}());


;(function(){ // temporary fs storage plugin, needs to be refactored to use the actual RAD plugin interface.
	var lS: Storage | undefined;
	try { lS = localStorage } catch (e){ };
	if(!lS){ return }

	var sT = setTimeout, RAD = sT.RAD;
	RAD.put = function(file, data, cb, opt){
		setTimeout(function(){
		lS![opt.file+'/'+file] = data;
		cb(null, 1);
		},1);
	}
	RAD.get = function(file, cb, opt){
		setTimeout(function(){
		cb(null, lS![opt.file+'/'+file] as string | undefined);
		},1);
	}
}());

;(function(){ return;
	var get: RadGet | typeof fetch | undefined;
	try { get = fetch } catch (e){ console.log("WARNING! need `npm install node-fetch@2.6`"); get = fetch = require('node-fetch') };
	if(!get){ return }

	var sT = setTimeout, RAD = sT.RAD, put = RAD.put, get: RadGet | typeof fetch | undefined = RAD.get;
	RAD.put = function(file, data, cb, opt){ put && put(file, data, cb, opt);
		cb(401)
	}
	RAD.get = async function(file, cb, opt){ get && (get as RadGet)(file, cb, opt);
		var t = (await (await fetch('http://localhost:8765/gun/authorsData/'+file)).text());
		if('404' == t){ cb(); return }
		cb(null, t);
	}
}());

/** A global `u` (upstream quirk: rad.js does not declare it, so this throws unless a script defines it). */
declare var u: undefined;
/** `fetch`, which the (disabled) HTTP storage sets to `node-fetch` where there is none. */
declare var fetch: typeof globalThis.fetch;

/** The options of `RAD(opt)`. */
interface RadOpt {
	/** The folder (or `localStorage` prefix) of the files. Default `radata`. */
	file?: string;
	log?: (...args: unknown[]) => void;
}

/** Called with the page of a word once it is loaded (no page, and the error, if it could not be). */
type RadReadCb = (page: BookPage | undefined, err: unknown, book?: Book) => void;

/** Called once a write is saved. */
type RadWriteCb = (err?: unknown, ok?: unknown) => void;

/** The writes waiting for a page to be saved (a write that came without a callback leaves an `undefined`). */
type RadSaved = Array<RadWriteCb | undefined>;

/** `page.saving`: the writes waiting for the page to be saved, `0` once saved. */
type RadSaving = RadSaved | 0;

/** What `RAD.put` (a storage) calls back with. */
type RadPutCb = (err?: unknown, ok?: unknown) => void;

/** What `RAD.get` (a storage) calls back with: the content of the file, nothing if there is none. */
type RadGetCb = (err?: unknown, data?: string) => void;

/** A storage: write a file. */
type RadPut = (file: string, data: string, cb: RadPutCb, opt: RadOpt) => void;

/** A storage: read a file. */
type RadGet = (file: string, cb: RadGetCb, opt: RadOpt) => void;

/** What rad.js' internal `get` calls back with: the page's content, raw or parsed. */
type RadPageCb = (err?: unknown, data?: BookPage['from']) => void;

/** The name of the index file (`' '`), which goes where pages go. */
type RadStr = string & BookSortable & { from?: undefined; first?: undefined; meta?: undefined };

/** rad.js' internal `put`, also the record of the files being written. */
interface RadPutFn {
	(file: BookPage | RadStr, data: string, cb?: RadPutCb): void;
	[file: string]: { data: string } | undefined;
}

/** rad.js' internal `get`, also the record of the callbacks of the files being read. */
interface RadGetFn {
	(file: BookPage | RadStr, cb: RadPageCb): void;
	[file: string]: RadPageCb[] | undefined;
}

/** Called with the page of the last word, by `rad.then`. */
type RadThenCb = (page: BookPage | undefined) => unknown;

/** A RAD instance: `rad(word, cb)` reads, `rad(word, value, cb)` writes. */
interface Rad {
	(word: string, cb?: RadReadCb): Rad;
	(word: string, is: BookValue, reply?: RadWriteCb): Rad;
	(word: string, is?: RadReadCb | BookValue, reply?: RadWriteCb): Rad;
	/** The last word. */
	word?: string;
	/** The book, once the index is loaded. */
	book?: Book;
	/** `await rad(word)`: its page. */
	then(cb?: RadThenCb | null, p?: unknown): Promise<unknown>;
	/** `await rad(word).read(each)`: the values of its page. */
	read(each?: (is: BookValue | undefined, word: string, page: BookPage) => unknown): Promise<unknown[]>;
	results(each?: (is: BookValue | undefined, word: string, page: BookPage) => unknown): Promise<unknown[]>;
}

/** `RAD` (`setTimeout.RAD`, `require('gun/rad')`): experimental, RAD on top of Book. */
interface RadStatic {
	(opt?: RadOpt): Rad;
	/** Instances by `opt.file` (never filled). */
	has?: Dict<Rad>;
	/** The storage (rad.js' own: `fs` in node, `localStorage` in browsers). */
	put: RadPut;
	get: RadGet;
}

declare module './src/types' {
	interface BookPage {
		/** rad.js: the writes waiting for the page to be saved. */
		saving?: RadSaving;
		/** rad.js: metadata of the page, saved in the index. */
		meta?: unknown;
		/** rad.js reads it as the page of a failed read: never set. */
		no?: undefined;
	}
}

declare global {
	namespace setTimeout {
		/** rad.js. */
		var RAD: RadStatic;
	}
}

import type { Book, BookFactory, BookPage, BookSortable, BookValue, Dict, Each } from './src/types';
