import type { Onto, OntoCallback, OntoEnd, OntoHost, OntoListener, OntoNext, OntoNode, OntoTag } from './types';
// On event emitter generic javascript utility.
module.exports = function onto(this: OntoHost, tag?: string | OntoTag | OntoNode | false, arg?: unknown, as?: unknown): { to: Onto } | OntoNode | undefined {
	if(!tag){ return {to: onto as Onto} }
	var u: undefined, f = 'function' == typeof arg, tag: string | OntoTag | OntoNode | false | undefined = (this.tag || (this.tag = {}))[tag as string] || f && (
		this.tag[tag as string] = {tag: tag as string, to: (onto as Onto)._ = { next: function(this: OntoEnd, arg: unknown){ var tmp: OntoNext | undefined;
			if(tmp = this.to){ tmp.next(arg) }
	}}});
	if(f){
		var be = {
			off: (onto as Onto).off ||
			((onto as Onto).off = function(this: OntoListener): true | undefined {
				if(this.next === (onto as Onto)._!.next){ return !0 }
				if(this === this.the.last){
					this.the.last = this.back;
				}
				this.to.back = this.back;
				this.next = (onto as Onto)._!.next;
				this.back.to = this.to;
				if(this.the.last === this.the){
					delete this.on.tag![this.the.tag];
				}
			}),
			to: (onto as Onto)._,
			next: arg as OntoCallback<unknown>,
			the: tag as OntoTag,
			on: this,
			as: as,
		} as OntoListener;
		(be.back = (tag as OntoTag).last || tag as OntoTag).to = be;
		return (tag as OntoTag).last = be;
	}
	if((tag = (tag as OntoTag).to) && u !== arg){ tag.next(arg) }
	return tag;
} as Onto;
	
