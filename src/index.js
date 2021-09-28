const { join, isAbsolute, relative, resolve, basename, dirname } = require('path'),
	fs = require('fs'),
	glob = require('glob'),
	isGlob = require('is-glob'),
	globParent = require('glob-parent'),
	ejs = require('ejs'),
	fromPairs = require('lodash/fromPairs'),
	isString = require('lodash/isString'),
	partition = require('lodash/partition'),
	flattenDeep = require('lodash/flattenDeep'),
	startCase = require('lodash/startCase'),
	get = require('lodash/get'),
	{ bold, cyan } = require('colorette'),
	{ normalizePath, mapObj } = require('./util'),
	Server = require('./Server')

const globOptions = { absolute: true, nodir: true },
	pkg = require(resolve('.', 'package.json')),
	closedTag = {
		link: true
	},
	linkAttrs = { href: true, src: true },
	defaultTagAttrs = {
		link: {
			rel: 'stylesheet',
			type: 'text/css'
		},
		script: {
			type: 'text/javascript'
		},
		style: {
			type: 'text/css'
		}
	}

let server,
	setupServer = process.env.SERVER,
	host = process.env.HOST,
	port = process.env.PORT

process.argv.slice(2).forEach((arg, i, args) => {
	switch (arg) {
		case '--host':
			host = args[i + 1]
			break
		case '--port':
			port = args[i + 1]
			break
		case '--server':
			setupServer = true
			break
	}
})

const defaultPageTemplate = join(__dirname, 'template/page.html'),
	defaultIndexPageTemplate = join(__dirname, 'template/index.html')
module.exports = function (options = {}) {
	const {
		dir = process.cwd(),
		getPageId = defaultPageId,
		getTitle = defaultPageTitle,
		data = {},
		header = [],
		body = [],
		template = join(dir, '**/*.html'),
		defaultTemplate = defaultPageTemplate,
		indexTemplate = defaultIndexPageTemplate,
		assets = []
	} = options

	if (setupServer == null) setupServer = options.server
	if (host == null) host = options.host
	if (port == null) port = options.port

	let entryFiles,
		rollupWatchGlob,
		watchMode,
		fileCaches = {}

	return {
		name: 'pages-generator',
		options(rollupOptions) {
			rollupWatchGlob = get(rollupOptions, 'watch.chokidar.disableGlobbing') !== true
			watchMode = this.meta.watchMode

			const [entries, otherEntries] = partition(flattenDeep([rollupOptions.input]), isString)
			entryFiles = entries
			return {
				...rollupOptions,
				input: {
					...fromPairs(
						flattenDeep(entries.map((file) => glob.sync(file, globOptions))).map((file) => [
							getPageId(transformPath(file)),
							file
						])
					),
					...otherEntries
				}
			}
		},

		async buildStart() {
			if (watchMode) {
				const watchFile = (file) => {
					this.addWatchFile(isGlob(file) && rollupWatchGlob ? globParent(file) : file)
				}
				entryFiles.forEach(watchFile)
				watchFile(assets)
				watchFile(template)
				watchFile(defaultTemplate)
				watchFile(indexTemplate)
			}
		},

		watchChange(id) {
			delete fileCaches[cacheId(id)]
		},

		async generateBundle({ sourcemap }, bundle) {
			const [indexPage, pages] = await generate(
				Object.values(bundle).filter(({ type, isEntry }) => type === 'chunk' && isEntry)
			)

			pages.forEach(({ page, source }) => {
				this.emitFile({ type: 'asset', id: page, fileName: page, source })
			})

			await Promise.all(
				flattenDeep(
					assets.map((asset) => {
						if (typeof asset === 'string') {
							asset = [asset]
						}
						const [pattern, target] = asset
						return glob.sync(pattern, globOptions).map(async (file) => {
							const source = await getCache(file, readFile),
								fileName = target
									? outputPath(typeof target === 'function' ? target(file) : target)
									: transformPath(file)
							this.emitFile({ type: 'asset', id: fileName, fileName, source })
						})
					})
				)
			)

			if (setupServer === true || (setupServer !== false && watchMode)) {
				const sources = Object.values(bundle).reduce((sources, { fileName, code, source, map }) => {
					if (sourcemap && map) {
						var url
						if (sourcemap === 'inline') {
							url = map.toUrl()
						} else {
							url = `${basename(fileName)}.map`
							sources[`${fileName}.map`] = map.toString()
						}
						if (sourcemap !== 'hidden') {
							code += `//# sourceMappingURL=${url}\n`
						}
					}
					sources[fileName] = code || source
					return sources
				}, {})
				if (!server) {
					server = new Server({ ...options, host, port, sources, defaultPage: indexPage.page })
					await server.listen()
				} else {
					server.setSources(sources)
				}
			}

			console.log(
				`generated pages: ${pages
					.sort((p1, p2) => p1.id.localeCompare(p2.id))
					.map(
						({ id, page }) =>
							`${cyan(id)} ${bold('→')} ${bold(cyan(server ? `${server.getHost()}/${page}` : page))}`
					)
					.join('\n' + ' '.repeat(17))}`
			)
		}
	}

	async function generate(entries) {
		const entryMap = entries.reduce((map, chunk) => ((map[chunk.name] = chunk), map), {}),
			pageCompiler = await getPageCompiler(defaultTemplate),
			indexCompiler = await getPageCompiler(indexTemplate),
			indexId = getPageId('index.html'),
			pageMap = {},
			addPage = (compiler, id, path, script) => {
				pageMap[id] = createPage(compiler, id, path || `${id}.html`, script)
			}

		await Promise.all(
			glob.sync(template, globOptions).map(async (file) => {
				const compiler = await getPageCompiler(file),
					path = transformPath(file),
					id = getPageId(path),
					chunk = entryMap[id]
				addPage(compiler, id, path, chunk && chunk.fileName)
			})
		)

		entries.forEach(({ fileName, name: id }) => {
			!pageMap[id] && addPage(pageCompiler, id, null, fileName)
		})

		if (!pageMap[indexId]) {
			pageMap[indexId] = createPage(indexCompiler, indexId, `index.html`, null)
		}

		const pages = Object.values(pageMap),
			indexPage = pageMap[indexId]

		pages.forEach((page) => {
			if (indexPage !== page) {
				const append = (parent, title, initNode) => {
						const pages = parent.pages || (parent.pages = []),
							children = parent.children || (parent.children = {})
						pages.push(page)
						return (children[title] = initNode(children[title] ))
					},
					parent = page.category.reduce(
						(parent, title) =>
							append(parent, title, (node) => (node || {
								title,
								isPage: false,
								isCategory: true,
								data,
								pkg
							})),
						indexPage
					)
				page.isPage = true
				append(parent, page.title, (node) => {
					if(node){
						page.pages = node.pages
						page.children = node.children
						page.isCategory = node.isCategory
					}
					return page
				})
			}
		})

		initHierachy(indexPage)

		pages.forEach((page) => {
			page.allPages = indexPage.pages
			page.source = page.compiler(page)
		})

		return [indexPage, pages]

		function initHierachy(node) {
			if (node.children) {
				node.pages.sort((p1, p2) => p1.id.localeCompare(p2.id))
				node.children = Object.values(node.children)
					.map((node) => initHierachy(node))
					.sort((p1, p2) => {
						return p1.isCategory === p2.isCategory
							? p1.title.localeCompare(p2.title)
							: p1.isCategory
							? 1
							: -1
					})
				node.walkHierachy = (enter, exit) => {
					walkHierachy(node.children, 0, enter, exit)
				}
			} else {
				node.walkHierachy = ()=>{}
			}
			return node
		}

		function walkHierachy(nodes, level, enter, exit) {
			nodes.forEach((node, i) => {
				enter(node, i, level)
				if (node.children) {
					walkHierachy(node.children, level + 1, enter, exit)
				}
				exit && exit(node, i, level)
			})
		}
	}

	function createPage(compiler, id, page, main) {
		const dir = dirname(page)
		let title = getTitle(id, page, pkg),
			category
		if (Array.isArray(title)) {
			category = title
			title = category.pop() || indexTitle
		} else {
			category = []
		}
		return {
			id,
			page,
			main: main && normalizePath(relative(dir, main)),
			title,
			category,
			dir,
			data,
			pkg,
			header: header.map(parseTag),
			body: body.map(parseTag),
			compiler
		}

		function parseTag(tag){
			if (typeof tag === 'string') return { html: ()=> tag }
			const { tag: tagName, attrs, body } = tag

			return {
				tag: tagName,
				attrs: mapObj({ ...defaultTagAttrs[tagName], ...attrs }, (value, attr) => {
					return linkAttrs[attr] ? normalizePath(relative(dir, value)) : value
				}),
				body: body || '',
				html() {
					return `<${this.tag} ${Object.entries(this.attrs)
						.map(([attr, value])=>`${attr}="${value}"`).join(' ')
					}${closedTag[tagName] ? `>` : `>${this.body}</${this.tag}>`}`
				}
			}
		}
	}

	function getPageCompiler(file) {
		return getCache(file, readTemplate)
	}

	function cacheId(file) {
		return normalizePath(isAbsolute(file) ? file : join(process.cwd(), file))
	}
	function getCache(file, getter) {
		const id = cacheId(file)
		return fileCaches[id] || (fileCaches[id] = getter(file))
	}

	function transformPath(file) {
		let relativePath = relative(dir, file)
		if (isAbsolute(relativePath)) {
			relativePath = relative('./', file)
		}
		return outputPath(relativePath)
	}
	function outputPath(file) {
		return normalizePath(file).replace(/^(\.\.\/)+/g, '')
	}
}

module.exports.defaultPageTemplate = defaultPageTemplate
module.exports.defaultIndexPageTemplate = defaultIndexPageTemplate
module.exports.defaultPageId = defaultPageId
module.exports.defaultPageTitle = defaultPageTitle
module.exports.scriptTag = scriptTag
module.exports.linkTag = linkTag
module.exports.styleTag = styleTag

function defaultPageId(path) {
	return path.replace(/\.[^/]*$/, '')
}
function defaultPageTitle(id, path, pkg) {
	const title = id
		.replace(/\/?index$/, '')
		.split('/')
		.filter(Boolean)
		.map((name) => startCase(name))
	return title.length ? title : pkg.name
}

function scriptTag(src, attrs) {
	return { tag: 'script', attrs: { src, ...attrs } }
}
function linkTag(src, attrs) {
	return { link: 'script', attrs: { src, ...attrs } }
}
function styleTag(content) {
	return { link: 'style', content }
}
function readTemplate(file) {
	return readFile(file).then((buff) => ejs.compile(buff.toString()))
}

function readFile(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, (err, data) => {
			if (err) reject(err)
			else resolve(data)
		})
	})
}
