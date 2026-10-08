function afore<T>(tag: OntoNode<T> | OntoTag<T> | undefined, hear: OntoCallback<T> | OntoListener<T>){
	if(!tag){ return }
	tag = (tag as /* a listener (the end of a list has no `the`) */ OntoListener<T>).the; // grab the linked list root
	var tmp = tag.to as AforeFirst<T>; // grab first listener
	hear = tmp.on.on(tag.tag, hear as OntoCallback<T>); // add us to end
	hear.to = tmp || hear.to; // make our next be current first
	hear.back.to = hear.to; // make our back point to our next
	tag.last = hear.back; // make last be same as before
	hear.back = tag; // make our back be the start
	tag.to = hear; // make the start be us
	return hear;
}
if(typeof module !== "undefined"){ module.exports = afore } // afore(gun._.on('in'), function(){ })

/** The first listener of a list: its host has an emitter (a chain meta, the root). */
type AforeFirst<T> = OntoListener<T> & { on: OntoHost & { on: Onto } };

/**
 * `require('gun/lib/afore')`: subscribe `hear` to the tag of `tag` (a listener,
 * e.g. `gun._.on('in')`), first in the list instead of last.
 */
type Afore = <T>(tag: OntoNode<T> | OntoTag<T> | undefined, hear: OntoCallback<T>) => OntoListener<T> | undefined;

import type { Onto, OntoCallback, OntoHost, OntoListener, OntoNode, OntoTag } from '../src/types';
