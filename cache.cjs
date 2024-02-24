const crypto = require('crypto')
const cache  = {}

setInterval(()=>{
	const d = Date.now()
	for (const key of Object.keys(cache))
		if (!cache[key]?.date || d-cache[key].date > 180000) delete cache[key]
},180000)

exports.saveFile = (png) => {
	const key = crypto.randomBytes(16).toString('hex')
	cache[key] = {date:Date.now(), file:png}
	return key
}
exports.sendFile = (req, res) => {
	const file = cache[req.params.image]?.file
	if (!file) return (res.writeHead(400), res.end())
	delete cache[req.params.image]	
	res.writeHead(200,{'content-type':'image/png'})
	return res.end(file,'binary')
}

