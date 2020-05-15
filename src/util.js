const os = require('os')

module.exports = {
	hosts() {
		const hosts = []
		Object.values(os.networkInterfaces()).forEach((addrs) => {
			addrs.forEach((addr) => {
				if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr.address)) {
					hosts.push(addr.address)
				}
			})
		})
		return hosts
	},
	normalizePath(path) {
		return path.replace(/[\\/]+/g, '/')
	},
	parseString(str, defaultValue, handlerArgs) {
		if (typeof str === 'function') {
			return str.apply(null, handlerArgs || [])
		} else if (str) {
			return String(str)
		}
		return defaultValue
	},
	assign(dist, source) {
		let assigned = 0
		for (const key in source) {
			if (!dist[key]) assigned++
			dist[key] = source[key]
		}
		return assigned
	}
}
