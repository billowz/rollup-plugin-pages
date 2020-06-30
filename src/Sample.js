const Emitter = require('events'),
	path = require('path'),
	rollup = require('rollup'),
	write = require('write'),
	{ bold, green, blue } = require('colorette'),
	HtmlTemplate = require('./HtmlTemplate'),
	{ parseString, normalizePath } = require('./util')

class Sample extends Emitter {
	constructor(manager, id, url) {
		super()
		this.manager = manager
		this.id = id
		this.url = url
		this.sourcemap = manager.sourcemap
		this.watch = manager.watch
		this.rollupOptions = manager.rollupOptions
		this.templateData = manager.templateData
		this.write = manager.write

		let name = path.basename(id)
		if (name === 'index') {
			name = path.basename(path.dirname(id))
		}
		name = name.replace(/_/g, ' ')
		this.name = name
		this.title = parseString(manager.sampleTitle, name, [name, id])

		this.reset()
	}

	reset(files, scripts, styles) {
		this.files = files || {}
		this.scripts = scripts || []
		this.styles = styles || []
	}

	eachFiles(cb) {
		const { files } = this
		for (const k in files) {
			cb(files[k])
		}
	}

	async setScript(file) {
		this.watcher && this.watcher.close()
		this.watcher = null

		this.script = file
		if (file) {
			var { id, url, title, rollupOptions: options, write } = this,
				outName = title.replace(/ /g, '_')

			console.log(`compiling sample: ${bold(blue(id))} from ${green(file)}`)

			options = Object.assign({}, options, {
				input: file,
				output: Object.assign({}, options.output, {
					file: id + '.js',
					name: parseString(options.output.name, outName, [outName, id])
				}),
				plugins: (options.plugins || []).concat([
					{
						name: 'sample',
						generateBundle: (output, bundle) => {
							const { scripts, styles, files } = parseBundle(
								bundle,
								path.dirname(id),
								path.dirname(url),
								/^es/.test(output.format)
							)
							this.reset(files, Object.values(scripts), Object.values(styles))
							console.log(`bundles sample: ${bold(blue(id))} from ${green(file)}`)
							this.build()
						}
					}
				])
			})

			const bundle = await rollup.rollup(options)
			console.log('')
			if (this.watch) {
				const watcher = (this.watcher = rollup.watch(options)),
					generator = ({ code }) => {
						if (code === 'BUNDLE_END') {
							bundle.generate(options.output)
						}
					}
				return new Promise((resolve, reject) => {
					watcher.on('event', wait)
					function wait({ code, error }) {
						if (code === 'ERROR') {
							watcher.off('event', wait)
							reject(error)
						} else if (!write) {
							if (code === 'BUNDLE_END') {
								bundle.generate(options.output).then(resolve, reject)
								watcher.off('event', wait)
								watcher.on('event', generator)
							}
						} else if (code === 'END') {
							watcher.off('event', wait)
							resolve()
						}
					}
				})
			} else if (write) {
				await bundle.write(options.output)
			} else {
				await bundle.generate(options.output)
			}
		} else {
			this.reset()
			this.build()
		}
	}

	setHtml(file) {
		this.html = file
		this.template = file ? new HtmlTemplate(file, false) : null
		this.build()
	}

	build() {
		if (!this.valid()) {
			this.reset()
			return
		}
		const { files, manager } = this,
			template = this.template || manager.sampleTemplate,
			options = {
				...manager.getTemplateTags(this.scripts, this.styles),
				title: this.title,
				name: this.name,
				data: this.templateData
			},
			file = this.id + '.html',
			url = this.url + '.html',
			page = {
				file,
				url,
				type: 'asset',
				code: template.compile({ ...options, file }),
				content: template.compile({ ...options, url })
			}
		this.page = page
		files[page.file] = page
		if (this.write) {
			write(page.file, page.code)
		}
		console.log(`builded sample: ${bold(blue(this.id))}, file: ${green(page.file)}, url: ${green(page.url)}`)
		this.emit('change', files)
	}

	valid() {
		return this.script || this.template
	}

	destory() {
		this.watcher && this.watcher.close()
		this.watcher = null
	}
}

function parseBundle(bundle, baseDir, baseUrl, esModule) {
	const scripts = {},
		styles = {},
		files = {}
	let fileName, file
	for (fileName in bundle) {
		const { code, type, map } = bundle[fileName]
		file = {
			type,
			code,
			url: normalizePath(path.join(baseUrl || '', fileName)),
			file: normalizePath(path.join(baseDir || '', fileName))
		}
		switch (path.extname(file.file)) {
			case '.js':
				scripts[file.file] = file
				file.map = map
				file.isScript = true
				file.attributes = esModule ? { type: 'module' } : { type: 'text/javascript' }
				break
			case '.css':
				styles[file.file] = file
				file.isStyle = true
				break
		}
		files[file.file] = file
	}
	return { scripts, styles, files }
}
Sample.parseBundle = parseBundle
module.exports = Sample
