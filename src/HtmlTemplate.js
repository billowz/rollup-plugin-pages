const Emitter = require('events'),
	chokidar = require('chokidar'),
	ejs = require('ejs'),
	fs = require('fs'),
	path = require('path'),
	{ green } = require('colorette'),
	{ makeHtmlAttributes, identCode, htmlTags, normalizePath } = require('./util')

class HtmlTemplate extends Emitter {
	constructor(template, watch) {
		super()
		if (typeof template !== 'function') {
			this.file = template
			if (watch) {
				this.watcher = chokidar
					.watch(this.file, { ignoreInitial: true })
					.on('change', (file) => this.setTemplate(file))
			}
		}
		this.setTemplate(template, false)
	}

	setTemplate(template, emit = true) {
		this.template = typeof template === 'function' ? template : loadFileTemplate(template)
		emit && this.emit('change', this)
		return this
	}

	compileHtml(options, onErr) {
		const { file, url, scripts = [], styles = [], links = [], metas = [] } = options
		const base = path.dirname(file || url)

		function getSrc(tag) {
			return normalizePath(path.relative(base, (url && tag.url) || tag.file))
		}
		try {
			return this.template({
				...options,
				file: file || url,
				scripts,
				styles,
				links,
				metas,
				scriptTags: (ident) =>
					htmlTags(
						scripts.map((script) => {
							const attrs = makeHtmlAttributes(script.attributes)
							return script.file
								? `<script src="${getSrc(script)}" ${attrs}></script>`
								: `<script ${attrs}>\n${identCode(script.code, ident)}\n${ident || ''}</script>`
						}),
						ident
					),
				styleTags: (ident) =>
					htmlTags(
						styles.map((style) =>
							style.file
								? `<link href="${getSrc(style)}" rel="stylesheet" type="text/css"></style>`
								: `<style type="text/css">\n${identCode(style.code, ident)}\n${ident || ''}</style>`
						),
						ident
					),
				linkTags: (ident) =>
					htmlTags(
						links.map(
							(link) => `<link href="${getSrc(links)}" ${makeHtmlAttributes(link.attributes)}></link>`
						),
						ident
					),
				metaTags: (ident) =>
					htmlTags(
						metas.map((meta) => `<meta ${makeHtmlAttributes(meta.attributes)}></meta>`),
						ident
					)
			})
		} catch (e) {
			console.error(e)
			if (onErr) {
				onErr(e)
			} else {
				throw new Error(
					`compile html: ${file || url} failed${
						this.file ? ` from file template: ${this.file}` : ' from constom template'
					}`
				)
			}
		}
	}

	destroy() {
		const { watcher } = this
		watcher && watcher.close()
	}
}

function loadFileTemplate(file) {
	console.log(`load html file: ${green(file)}`)
	return ejs.compile(fs.readFileSync(file).toString())
}

module.exports = HtmlTemplate
