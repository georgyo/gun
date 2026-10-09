window.fun = function fun(e?: FunEvent){ setTimeout(() => {
	e = e || {}; var $img = $('<div class="joy"></div>')
		.css({position: 'fixed', width: 100,
			top: (e.y || e.clientY || (Math.random() * $(window).height()))-50,
			left: (e.x || e.clientX || e.pageX || (Math.random() * $(window).width()))-50,
			transform: 'rotate('+(Math.random() * 360)+'deg)'
		}).appendTo('body');
		setTimeout(() => { $img.remove() },800);
},10)};
$(document).on('keyup', fun).on('touchstart', fun).on('mousedown', fun);

/** Where to show the effect (a mouse or touch event, or a point); random without. */
interface FunEvent {
	x?: number;
	y?: number;
	clientX?: number;
	clientY?: number;
	pageX?: number;
}

/** `window.fun(e)`: a fun effect where the user clicks, touches or types (lib/fun.js, a browser toy that needs jQuery). */
type Fun = (e?: FunEvent) => void;

/** The parts of jQuery (a global) lib/fun.js uses. */
interface FunJQuery {
	css(props: Dict<string | number>): FunJQuery;
	appendTo(target: string): FunJQuery;
	remove(): FunJQuery;
	height(): number;
	width(): number;
	on(events: string, handler: (e: FunEvent) => void): FunJQuery;
}
declare var $: (selector: string | Window | Document) => FunJQuery;

/** The global `window.fun`, read as a bare global. */
declare var fun: Fun;

declare global {
	interface Window {
		/** lib/fun.js. */
		fun?: Fun;
	}
}

import type { Dict } from '../src/types';
