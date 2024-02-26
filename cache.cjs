const crypto = require('crypto')
const cache  = {}, count = {}

setInterval(()=>{
	let size = 0
	const d = Date.now()
	for (const key of Object.keys(cache))
		if (!cache[key]?.date || d-cache[key].date > 3600000){
			delete cache[key]
			delete count[key]
		} else size += cache[key].file.length
	console.log('cache size:', size)
},900000)

exports.sendFile = (req, res) => {
	const file = cache[req.params.image]?.file
	if (!file) return (res.writeHead(400), res.end())
	res.writeHead(200,{'content-type':'image/png'})
	return res.end(file,'binary')
}
exports.getHash  = (data) => 'file'+crypto.createHash('sha256').update(data).digest("hex")
exports.getFile  = (key)  => {
	count[key] = count[key] ? count[key]+1 : 1
	if (count[key] < 6) delete cache[key]
	return cache[key]
}
exports.saveFile = (key, data) => cache[key] = {date:Date.now(), file:data}
