module.exports = {
	normalizePath(path) {
		return path.replace(/[\\/]+/g, '/')
	},
	mapObj(obj, cb) {
		const out = {}
		for (const k in obj) {
			out[k] = cb(obj[k], k)
		}
		return out
	}
}
