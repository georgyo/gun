;(function(){
	console.log("RADISK 2!!!!");

	function Radisk(opt: Radisk2Options): Rad2 | void{

		opt = opt || {} as Radisk2Options;
		opt.log = opt.log || console.log;
		opt.file = String(opt.file || 'radata');
		var has = ((Radisk as Radisk2Static).has || ((Radisk as Radisk2Static).has = {}))[opt.file];
		if(has){ return has }

		opt.pack = opt.pack || (opt.memory? (opt.memory * 1000 * 1000) : 1399000000) * 0.3; // max_old_space_size defaults to 1400 MB.
		opt.until = opt.until || opt.wait || 250;
		opt.batch = opt.batch || (10 * 1000);
		opt.chunk = opt.chunk || (1024 * 1024 * 1); // 1MB
		opt.code = opt.code || {} as Radisk2Options['code'];
		opt.code.from = opt.code.from || '!';
		//opt.jsonify = true; // TODO: REMOVE!!!!

		function ename(t: string){ return encodeURIComponent(t).replace(/\*/g, '%2A') }
		function atomic(v: unknown){ return u !== v && (!v || 'object' != typeof v) }
		var map = Gun.obj.map;
		var LOG = false;

		if(!opt.store){
			return opt.log("ERROR: Radisk needs `opt.store` interface with `{get: fn, put: fn (, list: fn)}`!");
		}
		if(!opt.store.put){
			return opt.log("ERROR: Radisk needs `store.put` interface with `(file, data, cb)`!");
		}
		if(!opt.store.get){
			return opt.log("ERROR: Radisk needs `store.get` interface with `(file, cb)`!");
		}
		if(!opt.store.list){
			//opt.log("WARNING: `store.list` interface might be needed!");
		}

		/*
			Any and all storage adapters should...
			1. Because writing to disk takes time, we should batch data to disk. This improves performance, and reduces potential disk corruption.
			2. If a batch exceeds a certain number of writes, we should immediately write to disk when physically possible. This caps total performance, but reduces potential loss.
		*/
		var r = function(key: string, val: unknown, cb?: RadiskAck | RadiskReadCb | Radisk2ReadOpt | null){
			key = ''+key;
			if(val instanceof Function){
				var o: Radisk2ReadOpt = cb as Radisk2ReadOpt || {};
				cb = val as RadiskReadCb;
				val = r.batch(key);
				if(u !== val){
					cb(u, r.range(val, o), o);
					if(atomic(val)){ return }
					// if a node is requested and some of it is cached... the other parts might not be.
				}
				if(r.thrash.at){
					val = r.thrash.at(key);
					if(u !== val){
						cb(u, r.range(val, o), o);
						if(atomic(val)){ cb(u, val, o); return }
						// if a node is requested and some of it is cached... the other parts might not be.
					}
				}
				return r.read(key, cb, o);
			}
			r.batch(key, val);
			if(cb){ r.batch.acks.push(cb as RadiskAck) }
			if(++r.batch.ed >= opt.batch){ return r.thrash() } // (2)
			if(r.batch.to){ return }
			//clearTimeout(r.batch.to); // (1) // THIS LINE IS EVIL! NEVER USE IT! ALSO NEVER DELETE THIS SO WE NEVER MAKE THE SAME MISTAKE AGAIN!
			r.batch.to = setTimeout(r.thrash, opt.until || 1);
		} as Rad2

		r.batch = Radix() as Radisk2Batch;
		r.batch.acks = [];
		r.batch.ed = 0;

		r.thrash = function(){
			var thrash = r.thrash;
			if(thrash.ing){ return thrash.more = true }
			thrash.more = false;
			thrash.ing = true;
			var batch = thrash.at = r.batch, i = 0;
			clearTimeout(r.batch.to);
			r.batch = null as /* replaced right away */ never;
			r.batch = Radix() as Radisk2Batch;
			r.batch.acks = [];
			r.batch.ed = 0;
			//var id = Gun.text.random(2), S = (+new Date); console.log("<<<<<<<<<<<<", id);
			r.save(batch, function(err, ok){
				if(++i > 1){ opt.log('RAD ERR: Radisk has callbacked multiple times, please report this as a BUG at github.com/amark/gun/issues ! ' + i); return }
				if(err){ opt.log('err', err) }
				//console.log(">>>>>>>>>>>>", id, ((+new Date) - S), batch.acks.length);
				map(batch.acks, function(cb){ cb(err, ok) });
				thrash.at = null;
				thrash.ing = false;
				if(thrash.more){ thrash() }
			});
		}

		/*
			1. Find the first radix item in memory.
			2. Use that as the starting index in the directory of files.
			3. Find the first file that is lexically larger than it,
			4. Read the previous file to that into memory
			5. Scan through the in memory radix for all values lexically less than the limit.
			6. Merge and write all of those to the in-memory file and back to disk.
			7. If file too large, split. More details needed here.
		*/
		r.save = function(rad, cb){
			var s = function Span(){} as Radisk2Span;
			s.find = function(tree, key){
				if(key < (s.start as /* undefined at first, which compares false */ string)){ return }
				s.start = key;
				r.list(s.lex);
				return true;
			}
			s.lex = function(file){
				file = (u === file)? u : decodeURIComponent(file);
				if(!file || file > (s.start as /* likewise */ string)){
					s.mix(s.file || opt.code.from, s.start, s.end = file);
					return true;
				}
				s.file = file;
			}
			s.mix = function(file, start, end){
				s.start = s.end = s.file = u;
				r.parse(file, function(err, disk){
					if(err){ return cb(err) }
					disk = disk || Radix();
					Radix.map(rad, function(val, key){
						if(key < (start as /* likewise */ string)){ return }
						if(end && end < key){ return s.start = key }
						// PLUGIN: consider adding HAM as an extra layer of protection
						disk(key, val); // merge batch[key] -> disk[key]
					});
					r.write(file, disk, s.next);
				});
			}
			s.next = function(err, ok){
				if(s.err = err){ return cb(err) }
				if(s.start){ return Radix.map(rad, s.find) }
				cb(err, ok);
			}
			Radix.map(rad, s.find);
		}

		/*
			Any storage engine at some point will have to do a read in order to write.
			This is true of even systems that use an append only log, if they support updates.
			Therefore it is unavoidable that a read will have to happen,
			the question is just how long you delay it.
		*/
		r.write = function(file, rad, cb, o){
			o = ('object' == typeof o)? o : {force: o};
			var f = function Fractal(){} as Radisk2Fractal;
			f.text = '';
			f.count = 0;
			f.file = file;
			f.each = function(val, key, k, pre){
				//console.log("RAD:::", JSON.stringify([val, key, k, pre]));
				if(u !== val){ f.count++ }
				if(opt.pack <= ((val||'') as /* only strings have a length: undefined compares false */ string).length){ return cb("Record too big!"), true }
				var enc = (Radisk as Radisk2Static).encode(pre.length) +'#'+ (Radisk as Radisk2Static).encode(k) + (u === val? '' : ':'+ (Radisk as Radisk2Static).encode(val)) +'\n';
				if((opt.chunk < f.text.length + enc.length) && (1 < f.count) && !o.force){
					f.text = '';
					f.limit = Math.ceil(f.count/2);
					f.count = 0;
					f.sub = Radix();
					Radix.map(rad, f.slice);
					return true;
				}
				f.text += enc;
			}
			f.write = function(){
				var tmp = ename(file);
				var start: number | undefined; LOG && (start = (+new Date)); // comment this out!
				opt.store.put(tmp, f.text, function(err){
					LOG && console.log("wrote JSON in", (+new Date) - start!); // comment this out!
					if(err){ return cb(err) }
					r.list.add(tmp, cb);
				});
			}
			f.slice = function(val, key){
				if(key < f.file){ return }
				if(f.limit < (++f.count)){
					var name = f.file;
					f.file = key;
					f.count = 0;
					r.write(name, f.sub, f.next, o);
					return true;
				}
				f.sub(key, val);
			}
			f.next = function(err){
				if(err){ return cb(err) }
				f.sub = Radix();
				if(!Radix.map(rad, f.slice)){
					r.write(f.file, f.sub, cb, o);
				}
			}
			if(opt.jsonify){ return r.write.jsonify(f, file, rad, cb, o) } // temporary testing idea
			if(!Radix.map(rad, f.each, true)){ f.write() }
		} as Radisk2Write

		r.write.jsonify = function(f, file, rad, cb, o){
			var raw: string;
			var start: number | undefined; LOG && (start = (+new Date)); // comment this out!
			try{raw = JSON.stringify(rad.$);
			}catch(e){ return cb("Record too big!") }
			LOG && console.log("stringified JSON in", (+new Date) - start!); // comment this out!
			if(opt.chunk < raw.length && !o.force){
				if(Radix.map(rad, f.each, true)){ return }
			}
			f.text = raw;
			f.write();
		}

		r.range = function(tree, o){
			if(!tree || !o){ return }
			if(u === o.start && u === o.end){ return tree }
			if(atomic(tree)){ return tree }
			var sub = Radix();
			Radix.map(tree as RadixTree, function(v,k){
				sub(k,v);
			}, o)
			return sub('');
		}

		;(function(){
			var Q: Dict<Radisk2ReadAs[]> = {};
			r.read = function(key, cb, o){
				o = o || {};
				if(RAD && !o.next){ // cache
					var val = RAD(key);
					//if(u !== val){
						//cb(u, val, o);
						if(atomic(val)){ cb(u, val, o); return }
						// if a node is requested and some of it is cached... the other parts might not be.
					//}
				}
				o.span = (u !== o.start) || (u !== o.end);
				var g = function Get(){} as Radisk2Get;
				g.lex = function(file){ var tmp: string | Radisk2ReadAs[] | undefined;
					file = (u === file)? u : decodeURIComponent(file);
					tmp = o.next || key || (o.reverse? o.end || '\uffff' : o.start || '');
					if(!file || (o.reverse? file < tmp : file > tmp)){
						if(o.next || o.reverse){ g.file = file }
						if(tmp = Q[g.file as /* undefined is the key 'undefined' */ string]){
							tmp.push({key: key, ack: cb, file: g.file, opt: o});
							return true;
						}
						Q[g.file as string] = [{key: key, ack: cb, file: g.file, opt: o}];
						if(!g.file){
							g.it(null, u, {});
							return true; 
						}
						r.parse(g.file, g.it);
						return true;
					}
					g.file = file;
				}
				g.it = function(err, disk: Radix2Fn | Radisk2ReadAs[] | undefined, info){
					if(g.err = err){ opt.log('err', err) }
					g.info = info;
					if(disk){ RAD = g.disk = disk as /* the parsed file (the variable is reused below) */ Radix2Fn }
					disk = Q[g.file as string]; delete Q[g.file as string];
					map(disk, g.ack);
				}
				g.ack = function(as){
					if(!as.ack){ return }
					var tmp = as.key, o = as.opt, info = g.info, rad = g.disk || noop, data = r.range(rad(tmp), o), last = rad.last;
					o.parsed = (o.parsed || 0) + (info.parsed||0);
					o.chunks = (o.chunks || 0) + 1;
					if(!o.some){ o.some = (u !== data) }
					if(u !== data){ as.ack(g.err, data, o) }
					else if(!as.file){ !o.some && as.ack(g.err, u, o); return }
					if(!o.span){
						if(/*!last || */last === tmp){ !o.some && as.ack(g.err, u, o); return }
						if(last && last > tmp && 0 != last.indexOf(tmp)){ !o.some && as.ack(g.err, u, o); return }
					}
					if(o.some && o.parsed >= (o.limit as /* undefined compares false */ number)){ return }
					o.next = as.file;
					r.read(tmp, as.ack, o);
				}
				if(o.reverse){ g.lex.reverse = true }
				r.list(g.lex);
			}
		}());

		;(function(){
			/*
				Let us start by assuming we are the only process that is
				changing the directory or bucket. Not because we do not want
				to be multi-process/machine, but because we want to experiment
				with how much performance and scale we can get out of only one.
				Then we can work on the harder problem of being multi-process.
			*/
			var Q: Dict<Radisk2ParseCb[]> = {}, s = String.fromCharCode(31);
			r.parse = function(file, cb, raw){ var q: Radisk2ParseCb[] | undefined;
				if(q = Q[file]){ return q.push(cb) } q = Q[file] = [cb];
				var p = function Parse(){} as Radisk2Parse, info: RadiskParseInfo = {};
				p.disk = Radix();
				p.read = function(err, data){ var tmp: Radisk2Split | '' | SyntaxError | undefined;
					delete Q[file];
					if((p.err = err) || (p.not = !data)){
						return map(q, p.ack);
					}
					if(typeof data !== 'string'){
						try{
							if(opt.pack <= data!.length){
								p.err = "Chunk too big!";
							} else {
								data = data!.toString(); // If it crashes, it crashes here. How!?? We check size first!
							}
						}catch(e){ p.err = e }
						if(p.err){ return map(q, p.ack) }
					}
					info.parsed = (data as /* converted above */ string).length;

					var start: number | undefined; LOG && (start = (+new Date)); // keep this commented out in production!
					if(opt.jsonify){ // temporary testing idea
						try{
							var json = JSON.parse(data as string);
							p.disk.$ = json;
							LOG && console.log('parsed JSON in', (+new Date) - start!); // keep this commented out in production!
							map(q, p.ack);
							return;
						}catch(e){ tmp = e as SyntaxError }
						if('{' === (data as string)[0]){
							p.err = tmp || "JSON error!";
							return map(q, p.ack);
						}
					}
					var start: number | undefined; LOG && (start = (+new Date)); // keep this commented out in production!
					var tmp: Radisk2Split | '' | SyntaxError | undefined = p.split(data as string), pre: string[] = [], i: number, k: string | undefined, v: RadiskDecoded, at: RadixTree | undefined, ats: RadixTree[]=[];
					if(!tmp || 0 !== tmp[1]){
						p.err = "File '"+file+"' does not have root radix! ";
						return map(q, p.ack);
					}
					while(tmp){
						k = v = u;
						i = tmp[1] as /* the depth */ number;
						tmp = p.split(tmp[2])||'';
						if('#' == tmp[0]){
							k = tmp[1] as /* the key */ string;
							pre = pre.slice(0,i);
							if(i <= pre.length){
								pre.push(k);
							}
						}
						tmp = p.split(tmp[2])||'';
						if('\n' == tmp[0]){
							at = ats[i] || p.disk.at;
							p.disk(k, u, at);
							ats[i] = p.disk.at!;
							ats[i+1] = p.disk.at![k as /* undefined is the key 'undefined' */ string] as RadixTree || (p.disk.at![k as string]={});
							continue;
						}
						if('=' == tmp[0] || ':' == tmp[0]){ v = tmp[1] }
						if(u !== k && u !== v){
// 							p.disk(pre.join(''), v)// mark's code
							at = ats[i];// || p.disk.at;
							p.disk(k, v, at);
							ats[i] = p.disk.at!;
							ats[i+1] = p.disk.at![k] as RadixTree;
						}
						tmp = p.split(tmp[2]);
					}
					LOG && console.log('parsed JSON in', (+new Date) - start!); // keep this commented out in production!
					//cb(err, p.disk);
					map(q, p.ack);
				};
				p.split = function(t){
					if(!t){ return }
					var l: Radisk2Split = [], o: {i?: number} = {}, i = -1, a = '', b: RadiskDecoded, c: undefined;
					i = t.indexOf(s);
					if(!t[i]){ return }
					a = t.slice(0, i);
					l[0] = a;
					l[1] = b = (Radisk as Radisk2Static).decode(t.slice(i), o);
					l[2] = t.slice(i + o.i!);
					return l;
				}
				p.ack = function(cb){ 
					if(!cb){ return }
					if(p.err || p.not){ return cb(p.err, u, info) }
					cb(u, p.disk, info);
				}
				if(raw){ return p.read(null, raw) }
				opt.store.get(ename(file), p.read);
			}
		}());

		;(function(){
			var dir: Radix2Fn | undefined, q: Radisk2ListCb[] | null | undefined, f = String.fromCharCode(28), ef = ename(f);
			r.list = function(cb){
				if(dir){
					var tmp = {reverse: (cb.reverse)? 1 : 0};
					Radix.map(dir, function(val, key){
						return cb(key);
					}, tmp) || cb();
					return;
				}
				if(q){ return q.push(cb) } q = [cb];
				r.parse(f, r.list.init);
			} as Radisk2List
			r.list.add = function(file, cb){
				var has = dir!(file);
				if(has || file === ef){
					return cb(u, 1);
				}
				dir!(file, true);
				cb.listed = (cb.listed || 0) + 1;
				r.write(f, dir!, function(err, ok){
					if(err){ return cb(err) }
					cb.listed = (cb.listed || 0) - 1;
					if(cb.listed !== 0){ return }
					cb(u, 1);
				}, true);
			}
			r.list.init = function(err, disk){
				if(err){
					opt.log('list', err);
					setTimeout(function(){ r.parse(f, r.list.init) }, 1000);
					return;
				}
				if(disk){
					r.list.drain(disk);
					return;
				}
				if(!opt.store.list){
					r.list.drain(Radix());
					return;
				}
				// import directory.
				opt.store.list(function(file){
					dir = dir || Radix();
					if(!file){ return r.list.drain(dir) }
					r.list.add(file, noop);
				});
			}
			r.list.drain = function(rad, tmp){
				r.list.dir = dir = rad;
				tmp = q; q = null;
				Gun.list.map(tmp, function(cb){
					r.list(cb);
				});
			}
		}());

		var noop: Radisk2Noop = function(){}, RAD: Radix2Fn | undefined, u: undefined;
		(Radisk as Radisk2Static).has![opt.file] = r;
		return r;
	}



	;(function(){
		var _ = String.fromCharCode(31), u: undefined;
		(Radisk as Radisk2Static).encode = function(d, o, s){ s = s || _;
			var t = s, tmp: string | false;
			if(typeof d == 'string'){
				var i = d.indexOf(s);
				while(i != -1){ t += s; i = d.indexOf(s, i+1) }
				return t + '"' + d + s;
			} else
			if(d && (d as Dict<unknown>)['#'] && (tmp = Gun.val.link.is(d))){
				return t + '#' + tmp + t;
			} else
			if(Gun.num.is(d)){
				return t + '+' + (d||0) + t;
			} else
			if(null === d){
				return t + ' ' + t;
			} else
			if(true === d){
				return t + '+' + t;
			} else
			if(false === d){
				return t + '-' + t;
			}// else
			//if(binary){}
		}
		;(Radisk as Radisk2Static).decode = function(t, o, s){ s = s || _;
			var d = '', i = -1, n = 0, c: number, p: string | true;
			if(s !== t[0]){ return }
			while(s === t[++i]){ ++n }
			p = t[c = n] || true;
			while(--n >= 0){ i = t.indexOf(s, i+1) }
			if(i == -1){ i = t.length }
			d = t.slice(c+1, i);
			if(o){ o.i = i+1 }
			if('"' === p){
				return d;
			} else
			if('#' === p){
				return Gun.val.link.ify(d);
			} else
			if('+' === p){
				if(0 === d.length){
					return true;
				}
				return parseFloat(d);
			} else
			if(' ' === p){
				return null;
			} else
			if('-' === p){
				return false;
			}
		}
	}());

	if(typeof window !== "undefined"){
	  var Gun: Radisk2Gun = window.Gun as Radisk2Gun;
	  var Radix: Radix2Static = window.Radix as Radix2Static;
	  window.Radisk = Radisk as /* radisk2 takes radisk's place */ RadiskStatic;
	} else { 
	  var Gun: Radisk2Gun = require('../gun');
		var Radix: Radix2Static = require('./radix2');
		try{ module.exports = Radisk }catch(e){}
	}

	Radisk.Radix = Radix;

}());
/** The options of `Radisk(opt)` (radisk2), normalized in place. */
interface Radisk2Opt {
	log?: (...args: unknown[]) => void;
	/** The prefix of the files (default `'radata'`), also the key of the cached instance. */
	file?: string;
	/** Max size of a value, and of a file read (default 30% of `memory` MB, or of 1399MB). */
	pack?: number;
	memory?: number;
	/** How long to batch writes (ms, default `wait` or 250). */
	until?: number;
	wait?: number;
	/** Write right away after that many batched writes (default 10K). */
	batch?: number;
	/** Split files bigger than this (default 1MB). */
	chunk?: number;
	/** `from`: the name of the first file (default `'!'`). */
	code?: { from?: string };
	/** Write (and try to read) files as JSON. */
	jsonify?: boolean;
	store?: RadiskStore | false;
}

/** `opt` once `Radisk` has filled in the defaults (and checked `store`). */
interface Radisk2Options extends Radisk2Opt {
	log: (...args: unknown[]) => void;
	file: string;
	pack: number;
	until: number;
	batch: number;
	chunk: number;
	code: { from: string };
	store: RadiskStore;
}

/** The options of a read, mutated and handed back as `info`. */
interface Radisk2ReadOpt extends RadiskReadOpt {
	/** Set: a range was asked (`start` or `end`). */
	span?: boolean;
	/** Set: something was found. */
	some?: boolean;
}

/** The writes waiting to be saved: a radix tree with their acks. */
interface Radisk2Batch extends Radix2Fn {
	acks: RadiskAck[];
	/** How many writes. */
	ed: number;
	to?: Timer;
}

/** `r.thrash()`: save the batch now (or once the save in progress is done: then `true`). */
interface Radisk2Thrash {
	(): true | undefined;
	/** A save is in progress... */
	ing?: boolean;
	/** ...and another one was asked. */
	more?: boolean;
	/** The batch being saved (read from while it is). */
	at?: Radisk2Batch | null;
}

/** A `r.list` callback: called with every file name (decoded in order, reversed if `reverse`) until it returns something, then without one. */
interface Radisk2ListCb {
	(file?: string): unknown;
	reverse?: boolean;
}

/** The ack of `r.list.add`, which counts the directory writes pending on itself. */
interface Radisk2ListAddCb {
	(err?: unknown, ok?: unknown): void;
	listed?: number;
}

/** `r.parse` callbacks get the file as a radix tree (`undefined` if it does not exist). */
type Radisk2ParseCb = (err: unknown, disk: Radix2Fn | undefined, info: RadiskParseInfo) => void;

/** `p.split`: what is before the next separator, the decoded value, and the rest. */
type Radisk2Split = [before?: string, value?: RadiskDecoded, rest?: string];

/** The directory: the list of files, itself a file (named char 28). */
interface Radisk2List {
	(cb: Radisk2ListCb): number | void;
	add(file: string, cb: Radisk2ListAddCb): void;
	init(err: unknown, disk?: Radix2Fn): void;
	drain(rad: Radix2Fn, tmp?: Radisk2ListCb[] | null): void;
	dir?: Radix2Fn;
}

interface Radisk2Write {
	/** Write a tree to a file, splitting it if it is bigger than `opt.chunk` (unless `o` / `o.force`). */
	(file: string, rad: Radix2Fn, cb: RadiskAck, o?: boolean | RadiskWriteOpt): void;
	jsonify(f: Radisk2Fractal, file: string, rad: Radix2Fn, cb: RadiskAck, o: RadiskWriteOpt): void;
}

/** The state of a write (a function used as a record). */
interface Radisk2Fractal {
	(): void;
	text: string;
	/** How many keys. */
	count: number;
	file: string;
	/** Keys per file, when splitting. */
	limit: number;
	/** The keys of the file being split off. */
	sub: Radix2Fn;
	each(val: unknown, key: string, k: string, pre: string[]): true | undefined;
	write(): void;
	slice(val: unknown, key: string): true | undefined;
	next(err?: unknown): void;
}

/** The state of a save (a function used as a record). */
interface Radisk2Span {
	(): void;
	/** The first key still to save. */
	start?: string;
	/** The first file after the one being merged. */
	end?: string;
	file?: string;
	err?: unknown;
	find(tree: unknown, key: string): true | undefined;
	lex: Radisk2ListCb;
	mix(file: string, start?: string, end?: string): void;
	next(err?: unknown, ok?: unknown): unknown;
}

/** A read waiting for a file. */
interface Radisk2ReadAs {
	key: string;
	ack: RadiskReadCb;
	file?: string;
	opt: Radisk2ReadOpt;
}

/** The state of a read (a function used as a record). */
interface Radisk2Get {
	(): void;
	file?: string;
	err?: unknown;
	info: RadiskParseInfo;
	disk?: Radix2Fn;
	lex: Radisk2ListCb;
	it: Radisk2ParseCb;
	ack(as: Radisk2ReadAs): void;
}

/** The state of a parse (a function used as a record). */
interface Radisk2Parse {
	(): void;
	disk: Radix2Fn;
	err?: unknown;
	not?: boolean;
	read(err: unknown, data?: StoreData): void;
	split(t?: string): Radisk2Split | undefined;
	ack(cb?: Radisk2ParseCb): void;
}

/** A no-op: an ack that ignores its arguments, and the empty file reads fall back to. */
interface Radisk2Noop {
	(...args: unknown[]): void;
	last?: undefined;
}

/** A radisk2 instance: `Radisk(opt)`. */
interface Rad2 {
	/** Read `key` (from the batch, the batch being saved, then the files). */
	(key: string, cb: RadiskReadCb, o?: Radisk2ReadOpt): void;
	/** Write `val` at `key` (batched: `opt.until`, `opt.batch`). */
	(key: string, val: unknown, cb?: RadiskAck | null): void;
	batch: Radisk2Batch;
	thrash: Radisk2Thrash;
	/** Merge a batch into the files. */
	save(rad: Radix2Fn, cb: RadiskAck): void;
	write: Radisk2Write;
	/** The part of `tree` within `o.start` / `o.end`. */
	range(tree: unknown, o?: Radisk2ReadOpt): unknown;
	read(key: string, cb: RadiskReadCb, o?: Radisk2ReadOpt): void;
	/** Read and parse a file (`raw`: its text, if known). */
	parse(file: string, cb: Radisk2ParseCb, raw?: string): number | void;
	list: Radisk2List;
}

/**
 * `require('gun/lib/radisk2')`, `window.Radisk` (in place of lib/radisk.js).
 * Instances are cached by `opt.file`. Without a valid `opt.store` it logs an
 * error.
 */
interface Radisk2Static {
	(opt?: Radisk2Opt): Rad2 | void;
	has?: Dict<Rad2>;
	/** Encode a value of the RAD format. */
	encode(d: unknown, o?: unknown, s?: string): string | undefined;
	/** Decode a value of the RAD format; `o.i` is set to where it ends. */
	decode(t: string, o?: { i?: number } | null, s?: string): RadiskDecoded;
	Radix: Radix2Static;
}

/** `Gun` with the deprecated utilities (src/deprecated.ts) used here. They only exist where `Gun` is a global (browsers). */
type Radisk2Gun = GunStatic & Pick<GunDeprecated, 'obj' | 'list' | 'val' | 'num' | 'text'>;

import type { Dict, GunDeprecated, GunStatic, Timer } from '../src/types';
import type { RadiskAck, RadiskDecoded, RadiskParseInfo, RadiskReadCb, RadiskReadOpt, RadiskStatic, RadiskStore, RadiskWriteOpt, Radix2Fn, Radix2Static, RadixTree, StoreData } from './types';
