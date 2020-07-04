const path = require('path'),
	chokidar = require('chokidar'),
	glob = require('glob'),
	write = require('write'),
	colorette = require('colorette'),
	{ green } = colorette,
	Server = require('./Server'),
	Sample = require('./Sample'),
	Template = require('./HtmlTemplate'),
	{ parseString, assign, normalizePath } = require('./util'),
	{ parseBundle } = Sample

const defaultSampleTemplate = path.join(__dirname, 'sampleTemplate.html'),
	defaultIndexTemplate = path.join(__dirname, 'indexTemplate.html')

const extReg = /\.[^\\/]+$/
class SampleManager {
	constructor(options, { dist, sourcemap, cache = {} }) {
		let {
			sampleDir = 'samples',
			sampleDist = 'samples',
			sampleHtml = '**/*.html',
			sampleScript = '**/*.spl.js',
			sampleTitle,
			sampleTemplate = defaultSampleTemplate,
			indexTemplate = defaultIndexTemplate,
			sampleData = {},
			write = true,
			watch = false,
			server = true,
			compile: rollupOptions = {}
		} = options

		sampleDir = path.isAbsolute(sampleDir) ? sampleDir : path.join(process.cwd(), sampleDir)
		sampleDist = path.join(dist || '', sampleDist || '')
		const sampleBaseUrl = sampleDist || ''

		rollupOptions = Object.assign({}, rollupOptions, {
			cache,
			output: Object.assign(
				{
					format: 'umd',
					sourcemap
				},
				rollupOptions.output
			),
			watch: Object.assign({}, rollupOptions.watch, { skipWrite: !write })
		})

		this.write = write
		this.watch = watch
		this.sourcemap = sourcemap
		this.cache = cache

		this.sampleHtml = sampleHtml
		this.sampleScript = sampleScript
		this.sampleTitle = sampleTitle
		this.dist = dist
		this.sampleDir = sampleDir
		this.sampleDist = sampleDist
		this.sampleBaseUrl = sampleBaseUrl

		this.rollupOptions = rollupOptions

		this.userScripts = (options.scripts || []).map(parseSource)
		this.userStyles = (options.styles || []).map(parseSource)
		this.links = (options.links || []).map(parseSource)
		this.sampleData = sampleData

		this.sampleTemplate = new Template(sampleTemplate, watch)
		this.indexTemplate = new Template(indexTemplate, watch)

		this.htmlExt = sampleHtml.match(extReg)[0]
		this.scriptExt = sampleScript.match(extReg)[0]

		this.samples = {}
		this.files = {}
		this.scripts = {}
		this.styles = {}

		this.server = server && new Server(options, normalizePath(path.join(this.sampleBaseUrl, 'index.html')))

		this.attachServerFiles = this.attachServerFiles.bind(this)
	}

	getTemplateTags(scripts = [], styles = []) {
		return {
			scripts: this.userScripts.concat(Object.values(this.scripts)).concat(scripts),
			styles: this.userStyles.concat(Object.values(this.styles)).concat(styles),
			links: this.links,
			metas: this.metas
		}
	}

	async init() {
		const opts = { cwd: this.sampleDir, ignoreInitial: true },
			addSampleHtml = this.sampleFileProcessor(async (sample, file) => sample.setHtml(file), this.htmlExt, true),
			addSampleScript = this.sampleFileProcessor(
				async (sample, file) => await sample.setScript(file),
				this.scriptExt,
				true
			)

		for (const file of glob.sync(this.sampleHtml, opts)) await addSampleHtml(file)
		for (const file of glob.sync(this.sampleScript, opts)) await addSampleScript(file)

		this.sampleTemplate.on('change', () => this.eachSamples((sample) => !sample.template && sample.build()))
		this.indexTemplate.on('change', () => this.buildIndex())

		if (this.watch) {
			this.htmlWatcher = chokidar
				.watch(this.sampleHtml, opts)
				.on('add', addSampleHtml)
				.on('change', addSampleHtml)
				.on(
					'unlink',
					this.sampleFileProcessor((sample) => sample && sample.setHtml(null), this.htmlExt)
				)

			this.scriptWatcher = chokidar
				.watch(this.sampleScript, opts)
				.on('add', addSampleScript)
				.on(
					'unlink',
					this.sampleFileProcessor((sample) => sample && sample.setScript(null), this.scriptExt)
				)
		}
		this.inited = true
		this.buildIndex()
		if (this.server) await this.server.listen()
	}

	sampleFileProcessor(cb, ext, create) {
		return async (file) => {
			const { samples, server } = this
			let id = file.substring(0, file.lastIndexOf(ext)),
				url = normalizePath(path.join(this.sampleBaseUrl, id))
			id = normalizePath(path.join(this.sampleDist, id))
			let sample = samples[id],
				created = false
			if (!sample && create) {
				sample = new Sample(this, id, url)
				created = true
			}
			await cb.call(this, sample, path.join(this.sampleDir, file), id)
			if (sample.valid()) {
				samples[id] = sample

				if (created) {
					this.buildIndex()
					server && sample.on('change', this.attachServerFiles)
				}
				this.attachServerFiles(sample.files)
			} else {
				delete samples[id]
			}
		}
	}

	buildIndex() {
		if (this.inited) {
			const title = parseString(this.sampleTitle, 'Samples', []),
				file = normalizePath(path.join(this.sampleDist, 'index.html')),
				url = normalizePath(path.join(this.sampleBaseUrl, 'index.html')),
				options = { ...this.getTemplateTags(), title, data: this.sampleData },
				page = (this.indexPage = {
					file,
					url,
					type: 'asset',
					code: this.indexTemplate.compile({
						...options,
						file,
						samples: this.parseSampleCategory({ file })
					}),
					content: this.indexTemplate.compile({
						...options,
						url,
						samples: this.parseSampleCategory({ url })
					})
				})
			if (this.write) {
				write(page.file, page.code)
			}
			this.attachServerFiles({ [file]: page })
		}
	}

	parseSampleCategory({ file, url }) {
		const base = path.dirname(file || url),
			cs = {}
		Object.values(this.samples)
			.map((sample) => {
				const f = normalizePath(path.relative(base, (url && sample.page.url) || sample.page.file)),
					category = path.dirname(f)
				return {
					title: sample.title,
					name: sample.name,
					file: f,
					category: category === '.' ? '' : category
				}
			})
			.sort((s1, s2) => s1.file.localeCompare(s2.file))
			.forEach((sample) => {
				const category = sample.category,
					c = cs[category] || (cs[category] = { category, samples: [] })
				c.samples.push(sample)
			})
		return Object.values(cs)
	}

	attachServerFiles(files) {
		const { server } = this
		if (server) {
			for (const k in files) {
				parseFile(files[k], this.sourcemap, ({ url, code, content }) => {
					console.log(`attach server content: ${green(url)}`)
					server.setContent(url, content || code)
				})
			}
		}
	}

	addBundle(bundle, esModule) {
		const { scripts, styles, files } = parseBundle(bundle, this.dist, '', esModule)
		this.attachServerFiles(files)
		if (assign(this.files, files) + assign(this.scripts, scripts) + assign(this.styles, styles)) {
			this.eachSamples((sample) => sample.build())
		}
	}

	eachSamples(cb) {
		const { samples } = this
		for (const k in samples) {
			cb(samples[k])
		}
	}

	eachFiles(cb) {
		this.eachSamples((sample) => sample.eachFiles(cb))
		cb(this.indexPage)
	}

	destory() {
		this.htmlWatcher && this.htmlWatcher.close()
		this.scriptWatcher && this.scriptWatcher.close()
		this.sampleTemplate.destroy()
		this.indexTemplate.destroy()
	}
}

function parseFile(chunk, sourcemap, cb) {
	var { file, url, code, content, map, type } = chunk
	if (sourcemap && map) {
		code += `//# sourceMappingURL=${path.basename(file)}.map`
		cb({ file: file + '.map', url: url + '.map', code: map.toString(), type: 'asset' })
	}
	cb({ file, url, code, content, type })
}

module.exports = SampleManager

function parseSource(source) {
	return typeof source === 'string' ? { file: source } : source
}
