var Gun: GunStatic & GunDeprecated = require('../gun')
,	formidable: Formidable = require('formidable')
,	url: typeof import('url') = require('url');
module.exports = function(req?: IncomingMessage | null, res?: HttpResponse | null, next?: HttpNext){
	next = next || function(){}; // if not next, and we don't handle it, we should res.end
	if(!req || !res){ return next() }
	if(!req.url){ return next() }
	if(!req.method){ return next() }
	var msg = {} as HttpMsg;
	msg.url = url.parse(req.url, true);
	msg.method = (req.method||'').toLowerCase();
	msg.headers = req.headers;
	var u: undefined, body: Dict<string> | undefined
	,	form = new formidable.IncomingForm()
	,	post = function(err: unknown, body?: Dict<string> | null){
		if(u !== body){ msg.body = body }
		next(msg, function(reply){
			if(!res){ return }
			if(!reply){ return res.end() }
			if(Gun.obj.has(reply, 'statusCode') || Gun.obj.has(reply, 'status')){
				res.statusCode = reply.statusCode || reply.status as number;
			}
			if(reply.headers){
				if(!(res.headersSent || res.headerSent || res._headerSent || res._headersSent)){
					Gun.obj.map(reply.headers, function(val, field){
						if(val !== 0 && !val){ return }
						res.setHeader(field, val);
					});
				}
			}
			if(Gun.obj.has(reply,'chunk') || Gun.obj.has(reply,'write')){
				res.write(Gun.text.ify(reply.chunk || reply.write) || '');
			}
			if(Gun.obj.has(reply,'body') || Gun.obj.has(reply,'end')){
				res.end(Gun.text.ify(reply.body || reply.end) || '');
			}
		});
	}
	form.on('field',function(k,v){
		(body = body || {})[k] = v;
	}).on('file',function(k,v){
		return; // files not supported in gun yet
	}).on('error',function(e){
		if(form.done){ return }
		post(e);
	}).on('end', function(){
		if(form.done){ return }
		post(null, body);
	});
	form.parse(req);
}

/** The parts of `formidable` lib/http.js uses (it is not a dependency of GUN). */
interface FormidableForm {
	done?: boolean;
	on(ev: 'field', cb: (k: string, v: string) => void): FormidableForm;
	on(ev: 'file', cb: (k: string, v: unknown) => void): FormidableForm;
	on(ev: 'error', cb: (e: unknown) => void): FormidableForm;
	on(ev: 'end', cb: () => void): FormidableForm;
	parse(req: IncomingMessage): void;
}
interface Formidable {
	IncomingForm: new () => FormidableForm;
}

import type { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeader, ServerResponse } from 'http';
import type { UrlWithParsedQuery } from 'url';
import type { Dict, GunDeprecated, GunStatic } from '../src/types';
import type { HttpMsg, HttpNext, HttpResponse } from './types';
