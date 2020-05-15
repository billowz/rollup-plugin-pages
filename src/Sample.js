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
		this.script = file
		if (file) {
			var { id, url, title, rollupOptions: options } = this,
				outName = title.replace(/ /g, '_')

			options = Object.assign({}, options, {
				input: file,
				output: Object.assign(
					{
						format: 'umd',
						sourcemap: this.sourcemap
					},
					options.output,
					{
						file: id + '.js',
						name: parseString(options.output.name, outName, [outName, id])
					}
				),
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
							console.log(`compiled sample: ${bold(blue(id))} from ${green(file)}`)
							this.reset(files, Object.values(scripts), Object.values(styles))
							this.build()
						}
					}
				])
			})

			const bundle = await rollup.rollup(options)
			if (this.write) {
				await bundle.write(options.output)
			} else {
				await bundle.generate(options.output)
			}
			if (this.watch) {
				console.log(`watch sample: ${bold(blue(id))} on ${green(file)}`)
				this.rollup = rollup.watch(options)
			}
		} else {
			this.rollup && this.rollup.close()
			this.rollup = null
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
				code: template.compileHtml({ ...options, file }),
				content: template.compileHtml({ ...options, url })
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
		this.rollup && this.rollup.close()
		this.rollup = null
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
