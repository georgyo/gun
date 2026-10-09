var Gun: Rs3Gun = require('../gun');
var Radisk: RadiskStatic = require('./radisk');
var Radix = Radisk.Radix;
var u: undefined, AWS: Rs3Aws;

Gun.on('create', function(root){
	this.to.next(root);
	var opt = root.opt;
	if(!opt.s3 && !process.env.AWS_S3_BUCKET){ return }
	//opt.batch = opt.batch || (1000 * 10);
	//opt.until = opt.until || (1000 * 3); // ignoring these now, cause perf > cost
	//opt.chunk = opt.chunk || (1024 * 1024 * 10); // 10MB // when cost only cents

	try{AWS = require('aws-sdk');
	}catch(e){
		console.log("Please `npm install aws-sdk` or add it to your package.json !");
		AWS_SDK_NOT_INSTALLED;
	}

	var opts = opt.s3 || (opt.s3 = {});
	opts.bucket = opts.bucket || process.env.AWS_S3_BUCKET;
	opts.region = opts.region || process.env.AWS_REGION || "us-east-1";
	opts.accessKeyId = opts.key = opts.key || opts.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
	opts.secretAccessKey = opts.secret = opts.secret || opts.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

	// opts.fakes3 should be the domain name of the S3-compatible service
	if(opts.fakes3 = opts.fakes3 || process.env.fakes3){
		opts.endpoint = opts.fakes3;
		opts.sslEnabled = false;
		opts.bucket = opts.bucket!.replace('.','p');
	}

	opts.config = new AWS.Config(opts);
	opts.s3 = opts.s3 || new AWS.S3(opts.config);

	opt.store = Object.keys(opts.s3).length === 0 ? opt.store : Store(opt);
});

function Store(opt: Rs3StoreOpt): Rs3Store{
	opt = opt || {};
	opt.file = String(opt.file || 'radata');
	var opts = opt.s3! /* set by the `create` hook */, s3 = opts.s3!;
	var c: Rs3Cache = {p: {}, g: {}, l: {}};
	
	var store = function Store(){} as Rs3Store;
	if((Store as Rs3Static)[opt.file]){
		console.log("Warning: reusing same S3 store and options as 1st.");
		return (Store as Rs3Static)[opt.file]!;
	}
	(Store as Rs3Static)[opt.file] = store;

	store.put = function(file, data, cb){
		var params = {Bucket: opts.bucket, Key: file, Body: data};
		//console.log("RS3 PUT ---->", (data||"").slice(0,20));
		c.p[file] = data;
		delete c.g[file];//Gun.obj.del(c.g, file);
		delete c.l[1];//Gun.obj.del(c.l, 1);
    s3.putObject(params, function(err, ok){
    	delete c.p[file];
    	cb(err, 's3');
    });
	};
	store.get = function(file, cb){ var tmp: string | Rs3GetCb[] | undefined;
		if(tmp = c.p[file]){ cb(u, tmp); return }
		if(tmp = c.g[file]){ tmp.push(cb); return }
		var cbs = c.g[file] = [cb];
		var params = {Bucket: opts.bucket, Key: file||''};
		//console.log("RS3 GET ---->", file);
		s3.getObject(params, function got(err, ack){
			if(err && 'NoSuchKey' === err.code){ err = u }
			//console.log("RS3 GOT <----", err, file, cbs.length, ((ack||{}).Body||'').length);//.toString().slice(0,20));
			delete c.g[file];//Gun.obj.del(c.g, file);
			var data: StoreData | undefined, data = ((ack||'') as Partial<Rs3Got>).Body;
			//console.log(1, process.memoryUsage().heapUsed);
			var i = 0, cba; while(cba = cbs[i++]){ cba && cba(err, data) }//Gun.obj.map(cbs, cbe);
		});
	};
	store.list = function(cb, match, params, cbs){
		if(!cbs){
			if(c.l[1]){ return c.l[1].push(cb) }
			cbs = c.l[1] = [cb];
		}
		params = params || {Bucket: opts.bucket};
		//console.log("RS3 LIST --->");
		s3.listObjectsV2(params, function(err, data){
			//console.log("RS3 LIST <---", err, data, cbs.length);
			if(err){ return Gun.log(err, err.stack) }
			var IT = data.IsTruncated, cbe = function(cb: Rs3ListCb){
				if(cb.end){ return }
				if(Gun.obj.map(data.Contents, function(content){
					return cb(content.Key);
				})){ cb.end = true; return }
				if(IT){ return }
				// Stream interface requires a final call to know when to be done.
				cb.end = true; cb();
			}
			// Gun.obj.map(cbs, cbe); // lets see if fixes heroku
			if(!IT){ delete c.l[1]; return }
	    params.ContinuationToken = data.NextContinuationToken;
	  	store.list(cb, match, params, cbs);
    });
	};
	//store.list(function(){ return true });
	if(false !== opt.rfs){ require('./rfsmix')(opt, store) } // ugly, but gotta move fast for now.
	return store;
}

module.exports = Store;

/** `opt.s3`: where to store (defaults from the `AWS_*` environment variables), normalized for aws-sdk. */
interface Rs3Opt {
	bucket?: string;
	region?: string;
	key?: string;
	accessKeyId?: string;
	secret?: string;
	secretAccessKey?: string;
	/** The domain of an S3 compatible service (or `process.env.fakes3`). */
	fakes3?: string;
	endpoint?: string;
	sslEnabled?: boolean;
	/** Set: the `AWS.Config`. */
	config?: unknown;
	/** The S3 client (an `AWS.S3`, made from `config` if not given). */
	s3?: Rs3Client;
}

/** The options `Store(opt)` uses (the root's `opt`). */
interface Rs3StoreOpt extends RadiskOpt {
	s3?: Rs3Opt;
	rfs?: boolean;
}

/** The parts of the aws-sdk (v2) S3 client used here. */
interface Rs3Client {
	putObject(params: { Bucket?: string; Key: string; Body: string }, cb: (err?: Rs3Error | null, ok?: unknown) => void): void;
	getObject(params: { Bucket?: string; Key: string }, cb: (err?: Rs3Error | null, ack?: Rs3Got) => void): void;
	listObjectsV2(params: Rs3ListParams, cb: (err: Rs3Error | null, data: Rs3List) => void): void;
}

/** An aws-sdk error. */
interface Rs3Error {
	code?: string;
	stack?: string;
}

interface Rs3Got {
	Body?: StoreData;
}

interface Rs3ListParams {
	Bucket?: string;
	ContinuationToken?: string;
}

interface Rs3List {
	IsTruncated?: boolean;
	Contents?: Array<{ Key?: string }>;
	NextContinuationToken?: string;
}

/** The parts of `require('aws-sdk')` used here. */
interface Rs3Aws {
	Config: new (opts: Rs3Opt) => unknown;
	S3: new (config: unknown) => Rs3Client;
}

type Rs3GetCb = (err?: unknown, data?: StoreData) => void;

/** A list callback; `end` is set once it got its final call. */
interface Rs3ListCb {
	(file?: string): unknown;
	end?: boolean;
}

/** Writes in flight (`p`), reads in flight (`g`) and the list in flight (`l[1]`). */
interface Rs3Cache {
	p: Dict<string>;
	g: Dict<Rs3GetCb[]>;
	l: Dict<Rs3ListCb[]>;
}

/** An S3 store for lib/radisk.js. */
interface Rs3Store extends RadiskStore {
	(): void;
	list(cb: Rs3ListCb, match?: unknown, params?: Rs3ListParams, cbs?: Rs3ListCb[]): unknown;
}

/** `require('gun/lib/rs3')`: `Store(opt)`, which also keeps the stores by `opt.file`. */
interface Rs3Static {
	(opt: Rs3StoreOpt): Rs3Store;
	[file: string]: Rs3Store | undefined;
}

/** `Gun` with the deprecated `Gun.obj.map` (src/deprecated.ts) used here. */
type Rs3Gun = GunStatic & Pick<GunDeprecated, 'obj'>;

/** Read on purpose when aws-sdk is missing: never defined, so it throws a ReferenceError. */
declare var AWS_SDK_NOT_INSTALLED: never;

declare module '../src/types' {
	interface GunOptions {
		/** lib/rs3.js. */
		s3?: Rs3Opt;
	}
}

import type { Dict, GunDeprecated, GunStatic } from '../src/types';
import type { RadiskOpt, RadiskStatic, RadiskStore, StoreData } from './types';
