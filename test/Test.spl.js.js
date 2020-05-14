;(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined'
		? factory(require('test'))
		: typeof define === 'function' && define.amd
		? define(['test'], factory)
		: ((global = global || self), factory(global.test))
})(this, function (test) {
	'use strict'

	test = test && Object.prototype.hasOwnProperty.call(test, 'default') ? test['default'] : test

	console.log(test())
})
