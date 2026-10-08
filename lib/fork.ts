/*
describe('API Chain Features', function(){

    describe('Gun.chain.fork', function(){
        var gun = Gun();
        var fork;
        it('create fork', function(done){
            fork = gun.fork().wire();
            done();
        });			
        it('put data via fork', function(done){								
            fork.get("fork-test").get("fork").put("test123").once(()=>done());				
        });			
        it('get data via main', function(done){								
            gun.get("fork-test").get("fork").once((data)=>{
                expect(data).to.be("test123");
                done();
            });				
        });			
        it('put data via main', function(done){								
            gun.get("fork-test").get("main").put("test321").once(()=>done());				
        });			
        it('get data via fork', function(done){								
            fork.get("fork-test").get("main").once((data)=>{
                expect(data).to.be("test321");
                done();
            });				
        });
    })

})
*/
(function (Gun: GunStatic, u?: undefined) {
    /**
     * 
     *  credits: 
     *      github:bmatusiak
     * 
     */
    Gun.chain.fork = function(this: Chain, g?: Fork): Fork {
        var gun = this._;
        var w = {} as /* its methods are added right below */ Fork,
            mesh = () => {
                var root = gun.root,
                    opt = root.opt;
                return opt.mesh || Gun.Mesh(root);
            }
        w.link = function(this: Fork) {
            if (this._l) return this._l;
            this._l = {
                send: (msg: ForkFrame) => {
                    if (!this.l || !this.l.onmessage)
                        throw 'not attached';
                    this.l.onmessage(msg);
                }
            }
            return this._l;
        };
        w.attach = function(this: Fork, l: ForkLink) {
            if (this.l)
                throw 'already attached';
            var peer = { wire: l };
            l.onmessage = function(msg: ForkFrame) {
                mesh().hear(msg.data || msg, peer);
            };
            mesh().hi(this.l = l && peer);
        };
        w.wire = function(opts?: GunOptionsInput) {
            var f = new Gun(opts);
            f.fork(w);
            return f;
        };
        if (g) {
            w.attach(g.link());
            g.attach(w.link());
        }
        return w;
    };

    
})((typeof window !== "undefined") ? window.Gun : require('../gun'))

/** What goes through a fork's link: the raw string the mesh says (or a parsed message, or an event with the raw `data`). */
type ForkFrame = (string | Msg) & { data?: string };

/** One end of an in-memory wire between two GUN instances. */
interface ForkLink {
	send(msg: ForkFrame): void;
	/** Set by `attach`. */
	onmessage?: (msg: ForkFrame) => void;
}

/** The peer a fork is attached to. */
interface ForkPeer extends Peer {
	wire: ForkLink;
	/** Read by `link().send`; lib/fork.js sets `onmessage` on the wire, not on the peer. */
	onmessage?: (msg: ForkFrame) => void;
}

/** `gun.fork()`: connects GUN instances in memory. */
interface Fork {
	/** This side's end of the wire (created once). */
	link(this: Fork): ForkLink;
	_l?: ForkLink;
	/** Connect to the other side's end. Throws if already attached. */
	attach(this: Fork, l: ForkLink): void;
	/** The peer attached to. */
	l?: ForkPeer;
	/** A new GUN instance, forked from this one. */
	wire(opts?: GunOptionsInput): Chain<RootMeta>;
}

declare module '../src/types' {
	interface Chain {
		/** lib/fork.js: link this instance with another one's fork `g` (or get a fork to link with). */
		fork(this: Chain, g?: Fork): Fork;
	}
}

import type { Chain, GunOptionsInput, GunStatic, Msg, Peer, RootMeta } from '../src/types';
