import resolve from '@rollup/plugin-node-resolve'
import sample from '..'

export default {
	input: 'test/lib/index.js',
	plugins: [
		resolve(),
		sample({
			sampleDir: 'test/samples',
			sampleDist: 'examples',
			sampleScript: '**/*.spl.js',
			sampleTitle(name, id) {
				return `Test - ${name || 'Examples'}`
			},
			statics: ['node_modules'],
			watch: !!process.env.ROLLUP_WATCH,
			server: !!process.env.ROLLUP_WATCH,
			write: false,
			compile: {
				external: ['test'],
				output: {
					globals: {
						test: 'test'
					}
				}
			},
			scripts: [
				'node_modules/vconsole/dist/vconsole.min.js',
				{
					code: `
var vconsole
if((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)))
	vconsole = new VConsole()
	`
				}
			],
			styles: [
				{
					code: `
body {
	margin: 0;
	padding: 0;
	position: absolute;
	width: 100%;
	height: 100%;
}
				`
				}
			]
		})
	],
	output: {
		compact: true,
		name: 'test',
		file: 'test/dist/test.js',
		format: 'umd',
		sourcemap: true
	}
}
