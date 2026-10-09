import type { Ask, AskHost, AskOpt, Dict, Msg, MsgId, OntoCallback, OntoListener, OntoTag } from './types';
// request / response module, for asking and acking messages.
require('./onto'); // depends upon onto!
module.exports = function ask(this: AskHost, cb?: OntoCallback<Msg, AskOpt | undefined> | MsgId | { '#': MsgId } | null | false | '', as?: AskOpt): MsgId | true | undefined {
	if(!this.on){ return }
	var lack = (this.opt||{}).lack || 9000;
	if(!('function' == typeof cb)){
		if(!cb){ return }
		var id: MsgId = (cb as Partial<Msg>)['#'] || cb as MsgId, tmp: OntoTag | OntoListener<Msg> | undefined = ((this.tag||'') as Dict<OntoTag>)[id as string];
		if(!tmp){ return }
		if(as){
			tmp = this.on(id as string, as) as OntoListener<Msg>;
			clearTimeout(tmp.err);
			tmp.err = setTimeout(function(){ (tmp as OntoListener<Msg>).off() }, lack);
		}
		return true;
	}
	var id = (as && as['#']) || random(9);
	if(!cb){ return id }
	var to = this.on(id as string, cb, as);
	to.err = to.err || setTimeout(function(){ to.off();
		to.next({err: "Error: No ACK yet.", lack: true});
	}, lack);
	return id;
} as Ask
var random = String.random || function(){ return Math.random().toString(36).slice(2) }
	
