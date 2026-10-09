// if(!(typeof navigator == "undefined") && navigator.product == "ReactNative"){
//     require("./lib/mobile.js");
// }
module.exports = require('./gun.js') as GunStatic;

/** `require('gun')` in a bundler (package.json `browser`): gun.js, the `Gun` constructor. */
type GunBrowser = GunStatic;

import type { GunStatic } from './src/types';
