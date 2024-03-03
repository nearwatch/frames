const crypto = require('crypto')
const cache  = {}

setInterval(()=>{
	let size = 0
	const d = Date.now()
	for (const key of Object.keys(cache))
		if (!cache[key]?.date || d-cache[key].date > 900000) delete cache[key]; else size += (cache[key].file ? cache[key].file.length : cache[key].base64.length)
	if (size) console.log('cache size:', size)
}, 300000)

exports.sendFile = (req, res) => {
	const file = cache[req.params.image]?.file
	if (!file) return (res.writeHead(400), res.end())
	if (cache[req.params.image].no_cache) delete cache[req.params.image]
	res.writeHead(200,{'content-type':'image/png'})
	return res.end(file,'binary')
}
exports.getHash  = (data) => 'file'+crypto.createHash('sha256').update(data).digest("hex")
exports.saveFile = (key, data, no_cache) => {
	cache[key] = {date:Date.now()}
	if (no_cache) cache[key].no_cache = true
	if (data.length < 190000){
		if (no_cache) {
			delete cache[key]
			return {base64:'data:image/png;base64,'+data.toString('base64')}
		} 
		cache[key].base64 = 'data:image/png;base64,'+data.toString('base64')
	} else cache[key].file = data
	return cache[key]
}
exports.getCache = (key) => cache[key] && !cache[key].no_cache ? cache[key] : undefined
