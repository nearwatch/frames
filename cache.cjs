const crypto = require('crypto')
const cache  = {}

setInterval(()=>{
	let size = 0
	const d = Date.now()
	for (const key of Object.keys(cache))
		if (!cache[key]?.date || d-cache[key].date > 900000) delete cache[key]; else size += cache[key].file.length
	console.log('cache size:', size)
}, 300000)

exports.sendFile = (req, res) => {
	const file = cache[req.params.image]?.file
	if (!file) return (res.writeHead(400), res.end())
	res.writeHead(200,{'content-type':'image/png'})
	return res.end(file,'binary')
}
exports.getHash  = (data) => 'file'+crypto.createHash('sha256').update(data).digest("hex")
exports.saveFile = (key, data) => cache[key] = {date:Date.now(), file:data}
exports.isCached = (key) => cache[key]?true:false
