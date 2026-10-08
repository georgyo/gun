;(function(){
	// on fires when shortcut keydowns or on touch after command selected and then touchdown
	var m = meta;
	m.edit({name: "Add", combo: ['A']});
	m.edit({name: "Row", combo: ['A', 'R'],
		on: function(eve){
			m.tap().append('<div class="hold center" style="min-height: 9em; padding: 2%;">');
		}
	});
	m.edit({name: "Columns", combo: ['A','C'],
		on: function(eve){
			var on = m.tap(), tmp: HotQuery, c: number;
			var html = '<div class="unit col" style="min-height: 9em; padding: 2%;"></div>';
			if(!on.children('.col').length){ html += html }
			c = (tmp = on.append(html).children('.col')).length;
			tmp.each(function(){
				$(this).css('width', (100/c)+'%');
			})
		}
	});
	m.edit({name: "Text", combo: ['A','T'],
		on: function(eve){
			m.tap().append('<p contenteditable="true">Text</p>');
		}
	});
	m.edit({name: "Drag", combo: ['D']});
	;(function(){
		$(document).on('click', function(){
			var tmp = $('.m-on');
			if(!tmp.length){ return }
			tmp.removeClass('m-on');
		})
		m.edit({combo: [38], // up
			on: function(eve){
				var on = m.tap().removeClass('m-on');
				on = on.prev().or(on.parent()).or(on);
				on.addClass('m-on');
			}, up: function(){ 
			}
		});
		m.edit({combo: [40], // down
			on: function(eve){
				var on = m.tap().removeClass('m-on');
				on = on.next().or(on.children().first()).or(on);
				on.addClass('m-on');
			}, up: function(){ 
			}
		});
		m.edit({combo: [39], // right
			on: function(eve){
				var on = m.tap().removeClass('m-on');
				on = on.children().first().or(on.next()).or(on.parent()).or(on);
				on.addClass('m-on');
			}, up: function(){ 
			}
		});
		m.edit({combo: [37], // left
			on: function(eve){
				var on = m.tap().removeClass('m-on');
				on = on.parent().or(on);
				on.addClass('m-on');
			}, up: function(){ 
			}
		});
	}());
	m.edit({name: "Turn", combo: ['T']});
	m.edit({name: "Size", combo: ['S']});
	m.edit({name: "X", combo: ['S','X'],
		on: function(eve){
			var on = m.tap(), was = on.width();
			$(document).on('mousemove.tmp', function(eve){
				var be = was + ((eve.pageX||0) - was);
				on.css({'max-width': be, width: '100%'});
			})
		}, up: function(){ $(document).off('mousemove.tmp') }
	});
	m.edit({name: "Y", combo: ['S','Y'],
		on: function(eve){
			var on = m.tap(), was = on.height();
			$(document).on('mousemove.tmp', function(eve){
				var be = was + ((eve.pageY||0) - was);
				on.css({'min-height': be});
			})
		}, up: function(){ $(document).off('mousemove.tmp') }
	});
	m.edit({name: "Fill", combo: ['F'],
		on: function(eve){
			var on = m.tap();
			m.ask('Color name, code, or URL?', function(color){
				var css = on.closest('p').length? 'color' : 'background';
				on.css(css, color);
			});
		}
	});
}());

/** lib/meta.js (`window.meta`), which this file extends with editing commands. Only what is used here. */
declare var meta: HotMeta;
/** jQuery (with lib/meta.js' `$.fn.or`). Only what is used here. */
declare var $: (s: string | Document | Element) => HotQuery;

/** A jQuery selection. */
interface HotQuery {
	length: number;
	append(html: string): HotQuery;
	children(selector?: string): HotQuery;
	first(): HotQuery;
	prev(): HotQuery;
	next(): HotQuery;
	parent(): HotQuery;
	closest(selector: string): HotQuery;
	/** lib/meta.js: this selection, or `s` (default `body`) if it is empty. */
	or(s?: HotQuery): HotQuery;
	each(fn: (this: Element) => void): HotQuery;
	css(name: string, value: string | number): HotQuery;
	css(props: { [name: string]: string | number }): HotQuery;
	addClass(c: string): HotQuery;
	removeClass(c: string): HotQuery;
	width(): number;
	height(): number;
	on(ev: string, fn: (eve: { pageX?: number; pageY?: number }) => void): HotQuery;
	off(ev: string): HotQuery;
}

/** A command of lib/meta.js: run `on` when its key `combo` is pressed, `up` when released. */
interface HotEdit {
	name?: string;
	/** Letters (key names) or key codes. */
	combo: Array<string | number>;
	on?: (eve: unknown) => void;
	up?: (eve: unknown) => void;
}

interface HotMeta {
	edit(e: HotEdit): void;
	/** The element the user is on. */
	tap(): HotQuery;
	/** Prompt the user. */
	ask(help: string, cb: (answer: string) => void, opt?: unknown): void;
}
