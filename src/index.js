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
	{ normalizePath } = require('./util'),
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
		template = join(dir, '**/*.html'),
		defaultTemplate = defaultPageTemplate,
		indexTemplate = defaultIndexPageTemplate,
		requirejs = 'require.js',
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
					assets.map((asset) =>
						glob.sync(asset, globOptions).map(async (file) => {
							const source = await getCache(file, readFile),
								fileName = transformPath(file)
							this.emitFile({ type: 'asset', id: fileName, fileName, source })
						})
					)
				)
			)

			this.emitFile({
				type: 'asset',
				id: 'requirejs',
				fileName: requirejs,
				source: await getCache(require.resolve('requirejs/require.js'), readFile)
			})

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
			addPage = (compile, id, path, script) => {
				pageMap[id] = createPage(compile, id, path || `${id}.html`, script)
			}

		await Promise.all(
			glob.sync(template, globOptions).map(async (file) => {
				const compile = await getPageCompiler(file),
					path = transformPath(file),
					id = getPageId(path),
					chunk = entryMap[id]
				addPage(compile, id, path, chunk && chunk.fileName)
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
				const append = (node, title, initCategory) => {
						const pages = node.pages || (node.pages = []),
							categories = node.categories || (node.categories = [])
						pages.push(page)
						return (categories[title] = initCategory(categories[title]))
					},
					node = page.category.reduce(
						(node, title) =>
							append(node, title, (category) => category || { title: title, isCategory: true }),
						indexPage
					)
				append(node, page.title, (category) => {
					if (category) {
						page.categories = category.categories
						page.pages = category.pages
					}
					return page
				})
			}
		})

		initCategories(indexPage)

		pages.forEach((page) => (page.source = page.compile(page)))
		return [indexPage, pages]

		function initCategories(node) {
			if (node.categories) {
				node.pages.sort((p1, p2) => p1.id.localeCompare(p2.id))
				node.categories = Object.values(node.categories)
					.map((node) => initCategories(node))
					.sort((p1, p2) => {
						if (!!p1.categories === !!p2.categories) {
							return p1.title.localeCompare(p2.title)
						}
						return !!p1.categories === !!p2.categories
							? p1.title.localeCompare(p2.title)
							: p1.categories
							? 1
							: -1
					})
				node.walkCategory = (enter, exit) => {
					walkCategory(node.categories, 0, enter, exit)
				}
			}
			return node
		}

		function walkCategory(nodes, level, enter, exit) {
			nodes.forEach((node, i) => {
				enter(node, i, level)
				if (node.categories) {
					walkCategory(node.categories, level + 1, enter, exit)
				}
				exit(node, i, level)
			})
		}
	}

	function createPage(compile, id, page, script) {
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
			title,
			category,
			page,
			script,
			data,
			pkg,
			compile,
			header: (data.header || []).concat(scriptTag(requirejs)).map(parseTag),
			body: (data.body || [])
				.concat(
					(script && {
						tag: 'script',
						body: `require(["${normalizePath(relative(dir, script))}"])`
					}) ||
						[]
				)
				.map(parseTag)
		}

		function parseTag(tag) {
			if (typeof tag === 'string') return tag
			const { tag: tagName, attrs, body } = tag

			return `<${tagName} ${Object.entries({ ...defaultTagAttrs[tagName], ...attrs })
				.map(([attr, value]) => {
					return `${attr}="${value && linkAttrs[attr] ? normalizePath(relative(dir, value)) : value}"`
				})
				.join(' ')}${closedTag[tagName] ? `>` : `>${body || ''}</${tagName}>`}`
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
		return normalizePath(relativePath).replace(/^(\.\.\/)+/g, '')
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
