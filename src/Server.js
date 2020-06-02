const Koa = require('koa'),
	koaStatic = require('koa-static'),
	koaMount = require('koa-mount'),
	{ hosts } = require('./util'),
	{ bold, green } = require('colorette')

class Server {
	constructor({ host, port, statics = [], publicPath } = {}, defaultPage = '/index.html') {
		this.host = host || '0.0.0.0'
		this.port = port || '8080'
		this.publicPath = publicPath || '/'

		this.contents = {}
		this.app = new Koa()

		this.use((ctx, next) => {
			const path = ctx.path.replace(/^\/+/g, '')
			if (!path) {
				ctx.response.redirect(defaultPage)
				return
			}

			const content = this.contents[path.replace(/^\/+/g, '')]

			if (content) {
				ctx.body = typeof content === 'function' ? content(path, ctx, next) : content
			} else {
				return next()
			}
		})

		statics.forEach((dir) => {
			if (typeof dir === 'string') {
				this.use(koaStatic(dir), dir)
			} else if (dir) {
				this.use(koaStatic(dir.path), dir.mount)
			}
		})
	}
	listen() {
		if (!this.server) {
			const { host, port } = this
			return new Promise((resolve, reject) => {
				this.server = this.app.listen({ host, port }, () => {
					resolve()
					console.log(
						`listening on: ${(host === '0.0.0.0' ? hosts() : [host])
							.map((h) => bold(green(`http://${h}:${port}`)))
							.join('\n' + ' '.repeat(14))}`
					)
				})
				this.server.on('error', (err) => reject(err))
			})
		}
	}
	use(app, mount) {
		const { publicPath } = this
		this.app.use(koaMount(publicPath + (mount || ''), app))
		return this
	}
	setContent(path, content) {
		const { contents } = this
		contents[path] = content
	}
}
module.exports = Server
