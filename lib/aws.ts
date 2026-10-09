;module.exports = (function(a: AwsGun, own: object){

	function s3(this: AwsS3 | void, opt?: AwsS3Opt): AwsS3 | 0{
		if(!(this instanceof s3)){
			return new (s3 as AwsS3Static)(opt);
		}
		var s = this as AwsS3;
		opt = opt || {};
		opt.bucket = opt.bucket || opt.Bucket || process.env.AWS_S3_BUCKET;
		opt.region = opt.region || process.env.AWS_REGION || "us-east-1";
		opt.accessKeyId = opt.key = opt.key || opt.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
		opt.secretAccessKey = opt.secret = opt.secret || opt.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
		if(!opt.accessKeyId || !opt.secretAccessKey){
			return 0;
		}
		s.config = opt;
		s.AWS = require('aws-sdk');
		s.on = a.on;
		if(s.config.fakes3 = s.config.fakes3 || opt.fakes3 || process.env.fakes3){
			s.AWS.config.endpoint = s.config.endpoint = opt.fakes3 || s.config.fakes3 || process.env.fakes3;
			s.AWS.config.sslEnabled = s.config.sslEnabled = false;
			s.AWS.config.bucket = s.config.bucket = (s.config.bucket as /* required with fakes3 (upstream throws without one) */ string).replace('.','p');
		}
		s.AWS.config.update(s.config);
		s.S3 = function(){
			var s = new this.AWS.S3();
			if(this.config.fakes3){
				s.endpoint = s.config.endpoint;
			}
			return s;
		}
		return s;
	};
	s3.id = function(m: AwsS3Params){ return m.Bucket +'/'+ m.Key }
	s3.chain = s3.prototype as AwsS3;
	s3.chain.PUT = function(key, o, cb, m){
		if(!key){ return }
		m = m || {}
		m.Bucket = m.Bucket || this.config.bucket;
		m.Key = m.Key || key;
		if(a.obj.is(o) || a.list.is(o)){
			m.Body = a.text.ify(o);
			m.ContentType = 'application/json';
		} else {
			m.Body = a.text.is(o)? o : a.text.ify(o);
		}
		this.S3().putObject(m, function(e,r){
			//a.log('saved', e,r);
			if(!cb){ return }
			cb(e,r);
		});
		return this;
	}
	s3.chain.GET = function(key, cb, o){
		if(!key){ return }
		var s = this
		, m: AwsS3Params = {
			Bucket: s.config.bucket
			,Key: key
		}, id = s3.id(m);
		s.on(id, function(arg: AwsGetArgs){
			var e = arg[0], d = arg[1], t = arg[2], m = arg[3], r = arg[4];
			this.off();
			delete s.batch![id];
			if(!a.fn.is(cb)){ return }
			try{ cb(e,d,t,m,r);
			}catch(e){
				console.log(e);
			}
		});
		s.batch = s.batch || {};
		if(s.batch[id]){ return s }
		s.batch[id] = (s.batch[id] || 0) + 1;
		s.S3().getObject(m, function(e,r){
			var d: unknown, t: string, m: Dict<string> | undefined;
			r = r || (this && this.httpResponse);
			if(e || !r){ return s.on(id, [e]) }
			r.Text = r.text = t = (r.Body||r.body||'' as AwsBody).toString('utf8');
			r.Type = r.type = r.ContentType || (r.headers||{})['content-type'];
			if(r.type && 'application/json' === r.type){
				d = a.obj.ify(t);
			}
			m = r.Metadata;
			s.on(id, [e, d, t, m, r]); // Warning about the r parameter, is is the raw response and may result in stupid SAX errors.
		});
		return s;
	}
	s3.chain.del = function(key, cb){
		if(!key){ return }
		var m: AwsS3Params = {
			Bucket: this.config.bucket
			,Key: key
		}
		this.S3().deleteObject(m, function(e,r){
			if(!cb){ return }
			cb(e, r);
		});
		return this;
	}
	s3.chain.dbs = function(o, cb){
		cb = cb || o;
		var m = {}
		this.S3().listBuckets(m, function(e,r){
			//a.log('dbs',e);
			a.list.map((r||{} as AwsList).Contents, function(v){console.log(v);});
			//a.log('---end list---');
			if(!a.fn.is(cb)) return;
			cb(e,r);
		});
		return this;
	}
	s3.chain.keys = function(from, upto, cb){
		cb = cb || upto || from;
		var m: AwsS3Params = {
			Bucket: this.config.bucket
		}
		if(a.text.is(from)){
			m.Prefix = from;
		}
		if(a.text.is(upto)){
			m.Delimiter = upto;
		}
		this.S3().listObjects(m, function(e,r){
			//a.log('list',e);
			a.list.map((r||{} as AwsList).Contents, function(v){console.log(v)});
			//a.log('---end list---');
			if(!a.fn.is(cb)) return;
			cb(e,r);
		});
		return this;
	}
	return s3;
})(require('../gun'), {});
/**
Knox S3 Config is:
knox.createClient({
    key: ''
  , secret: ''
  , bucket: ''
  , endpoint: 'us-standard'
  , port: 0
  , secure: true
  , token: ''
  , style: ''
  , agent: ''
});

aws-sdk for s3 is:
{ "accessKeyId": "akid", "secretAccessKey": "secret", "region": "us-west-2" }
AWS.config.loadFromPath('./config.json');
 {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID = ''
	,secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY = ''
	,Bucket: process.env.s3Bucket = ''
	,region: process.env.AWS_REGION = "us-east-1"
	,sslEnabled: ''
}
**/
/** `opt` of `s3(opt)`, normalized from the `AWS_*` environment variables. Handed to aws-sdk's `AWS.config.update`. */
interface AwsS3Opt {
	bucket?: string;
	Bucket?: string;
	region?: string;
	key?: string;
	accessKeyId?: string;
	secret?: string;
	secretAccessKey?: string;
	/** The endpoint of an S3 compatible server (fakes3): no SSL, and `.` in the bucket name becomes `p`. */
	fakes3?: string;
	endpoint?: string;
	sslEnabled?: boolean;
}

/** The parameters of an S3 request. */
interface AwsS3Params {
	Bucket?: string;
	Key?: string;
	Body?: unknown;
	ContentType?: string;
	Prefix?: string;
	Delimiter?: string;
}

/** An aws-sdk error. */
interface AwsError {
	code?: string;
	message?: string;
}

/** A body: a Buffer (or a string). */
interface AwsBody {
	toString(encoding?: string): string;
}

/** A `getObject` response (or the raw `httpResponse`), which `GET` decorates with `text` and `type`. */
interface AwsGot {
	Body?: AwsBody;
	body?: AwsBody;
	ContentType?: string;
	headers?: Dict<string>;
	Metadata?: Dict<string>;
	Text?: string;
	text?: string;
	Type?: string;
	type?: string;
}

/** A `listBuckets` / `listObjects` response. */
interface AwsList {
	Contents?: unknown[];
}

/** An aws-sdk callback. */
type AwsCb<R = unknown> = (err: AwsError | null, res?: R) => void;

/** What `GET` hands its callback: the error, the parsed JSON (if `application/json`), the text, the metadata and the raw response. */
type AwsGetArgs = [err?: AwsError | null, data?: unknown, text?: string, meta?: Dict<string>, res?: AwsGot];

type AwsGetCb = (...args: AwsGetArgs) => void;

/** The parts of an aws-sdk (v2) `AWS.S3` client used here. */
interface AwsS3Client {
	endpoint?: string;
	config: AwsS3Opt;
	putObject(params: AwsS3Params, cb: AwsCb): void;
	/** `this` is the `AWS.Response`. */
	getObject(params: AwsS3Params, cb: (this: { httpResponse?: AwsGot } | undefined, err: AwsError | null, res?: AwsGot) => void): void;
	deleteObject(params: AwsS3Params, cb: AwsCb): void;
	listBuckets(params: AwsS3Params, cb: AwsCb<AwsList>): void;
	listObjects(params: AwsS3Params, cb: AwsCb<AwsList>): void;
}

/** The parts of `require('aws-sdk')` used here. */
interface AwsSdk {
	config: AwsS3Opt & { update(opt: AwsS3Opt): void };
	S3: new () => AwsS3Client;
}

/** An S3 connection: `s3(opt)`. */
interface AwsS3 {
	config: AwsS3Opt;
	AWS: AwsSdk;
	/** `Gun.on`: `GET` emits its results on the id of the object (to batch concurrent reads). */
	on: Onto;
	/** A new client. */
	S3(this: AwsS3): AwsS3Client;
	/** Reads in flight, by id. */
	batch?: Dict<number>;
	/** Write `o` (JSON unless a string) at `key`. `undefined` without a key. */
	PUT(key: string, o: unknown, cb?: AwsCb, m?: AwsS3Params): AwsS3 | undefined;
	GET(key: string, cb?: AwsGetCb, o?: unknown): AwsS3 | undefined;
	del(key: string, cb?: AwsCb): AwsS3 | undefined;
	/** List the buckets (`o` is the callback when `cb` is missing). */
	dbs(o?: AwsCb<AwsList>, cb?: AwsCb<AwsList>): AwsS3;
	/** List the keys (each argument can be the callback). */
	keys(from?: string | AwsCb<AwsList>, upto?: string | AwsCb<AwsList>, cb?: string | AwsCb<AwsList>): AwsS3;
}

/**
 * `require('gun/lib/aws')`: `s3(opt)` or `new s3(opt)`. Without credentials
 * the constructor returns `0`, which `new` discards: the connection is then
 * returned unconfigured.
 */
interface AwsS3Static {
	(opt?: AwsS3Opt): AwsS3;
	new (opt?: AwsS3Opt): AwsS3;
	/** The id of an object: `Bucket/Key`. */
	id(m: AwsS3Params): string;
	/** The prototype of connections. */
	chain: AwsS3;
}

/** `Gun` with the deprecated utilities (src/deprecated.ts) used here. They only exist where `Gun` is a global (browsers). */
type AwsGun = GunStatic & Pick<GunDeprecated, 'fn' | 'obj' | 'list' | 'text'>;

import type { Dict, GunDeprecated, GunStatic, Onto } from '../src/types';
