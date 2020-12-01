import resolve from '@rollup/plugin-node-resolve'
import pages from '..'

export default {
	input: 'test/samples/**/*.spl.js',
	plugins: [
		pages({
			dir: 'test/samples',
			template: 'test/samples/**/*.html',
			data: {
				header: [{ tag: 'link', attrs: { href: 'test.css' } }]
			},
			assets: ['test/samples/**/*.css', 'test/samples/**/*.jpg']
		}),
		resolve(),
	],
	output: {
		compact: false,
		dir: 'test/dist',
		format: 'amd',
		sourcemap: true,
		manualChunks: {
			lib: ['test/lib']
		},
		chunkFileNames: '[name].js'
	}
}
