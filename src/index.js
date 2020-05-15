const path = require('path'),
	SampleManager = require('./SampleManager'),
	{ normalizePath } = require('./util')

module.exports = function (options = {}) {
	let sampleManager

	return {
		name: 'sample',
		async generateBundle(output, bundle) {
			const dist = normalizePath(path.join(output.dir || '', output.file ? path.dirname(output.file) : ''))
			const esModule = /^es/.test(output.format)
			if (!sampleManager) {
				sampleManager = new SampleManager(options, {
					dist,
					sourcemap: output.sourcemap,
					cache: this.cache
				})
				sampleManager.addBundle(bundle, esModule)
				await sampleManager.init()
			} else {
				sampleManager.addBundle(bundle, esModule)
			}
		}
	}
}
