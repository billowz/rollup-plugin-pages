const Koa = require('koa'),
	koaStatic = require('koa-static'),
	koaMount = require('koa-mount'),
	path = require('path'),
	os = require('os'),
	{ bold, green } = require('colorette'),
	{ normalizePath } = require('./util')

class Server {
	constructor({ host, port, statics = [], publicPath, defaultPage = 'index.html', sources } = {}) {
		this.host = host || '0.0.0.0'
		this.port = port || '8080'
		this.publicPath = publicPath || '/'
		defaultPage = parseSourcePath(path.join(this.publicPath, defaultPage))

		this.sources = sources || {}
		this.app = new Koa()

		this.use((ctx, next) => {
			const reqPath = parseSourcePath(ctx.path)
			if (!reqPath) {
				ctx.response.redirect(defaultPage)
				return
			}
			const source = this.sources[reqPath]

			if (source) {
				ctx.body = typeof source === 'function' ? source(reqPath, ctx, next) : source
				ctx.type = path.extname(reqPath)
			} else {
				return next()
			}
		})

		statics.forEach((dir) => {
			if (typeof dir === 'string') {
				console.log(`mount static sources: ${green(dir)} from directory ${green(dir)}`)
				this.use(koaStatic(dir), dir)
			} else if (dir) {
				console.log(`mount static sources: ${green(dir.mount)} from directory ${green(dir.path)}`)
				this.use(koaStatic(dir.path), dir.mount)
			}
		})
	}

	use(app, mount) {
		const { publicPath } = this
		this.app.use(koaMount(publicPath + (mount || ''), app))
		return this
	}

	setSources(sources) {
		this.sources = sources
	}

	add(sourcePath, source) {
		this.sources[parseSourcePath(sourcePath)] = source
	}

	remove(sourcePath) {
		delete this.sources[parseSourcePath(sourcePath)]
	}

	getHost() {
		return this.getHostList()[0]
	}

	getHostList() {
		const { host, port } = this
		return (host === '0.0.0.0' ? getHostList() : [host]).map((h) => `http://${h}:${port}`)
	}

	listen() {
		return new Promise((resolve, reject) => {
			let { serverPromise } = this
			if (!serverPromise) {
				this.serverPromise = serverPromise = new Promise((resolve, reject) => {
					this.server = this.app
						.listen({ host: this.host, port: this.port }, () => {
							console.log(
								`listening on: ${this.getHostList()
									.map((host) => bold(green(host)))
									.join('\n' + ' '.repeat(14))}`
							)
							resolve()
						})
						.on('error', (err) => {
							reject(err)
						})
				})
			}
			serverPromise.then(resolve, reject)
		})
	}
}
module.exports = Server

function parseSourcePath(sourcePath) {
	return normalizePath(sourcePath).replace(/^\/+|\/+$/g, '')
}

function getHostList() {
	const hosts = []
	Object.values(os.networkInterfaces()).forEach((addrs) => {
		addrs.forEach((addr) => {
			if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr.address)) {
				hosts.push(addr.address)
			}
		})
	})
	return hosts
}
