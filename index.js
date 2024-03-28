import fs 	from 'fs'
import satori 	from 'satori'
import parse  	from 'html-react-parser'
import {Resvg} 	from '@resvg/resvg-js'
import polka  	from 'polka'
import bparser	from 'body-parser'
import cache    from './cache.cjs' 
import {getSSLHubRpcClient,Message} from "@farcaster/hub-nodejs"
import {fonts, fontFiles} from './fonts.cjs' 

const server = polka()
const domain = 'https://frames.doe.cx' 
const frames  = {}
for (const file of fs.readdirSync('./frames')){ 
	const x = /^(\S+?)\.cjs$/.exec(file)
	if (x) {
		frames[x[1]] = await import('./frames/'+x[1]+'.cjs')
		console.log(x[1]+' frame loaded')
	}
}

async function toImage(element, square, width=1200, is_svg){
	const key = cache.getHash(element+width+square)
	if (cache.getFile(key)) return domain+'/images/'+key
	let svg = element
	if (!is_svg){
		const options = {width, height:square?width:Math.round(width/1.91), fonts, debug:false } 
		const dom = parse('<div style="width:'+width+'; height:'+options.height+'; display:flex; alignItems:stretch">'+element+'</div>')
		svg = await satori(dom, options)
	}
	const resvg = new Resvg(svg, {
		background: 'rgba(255,255,255,.9)', 
		font: {defaultFontFamily:'Roboto', fontFiles, loadSystemFonts:false},
	})
	const pngData = resvg.render()
	const png = pngData.asPng()
	cache.saveFile(key, png)
	return domain+'/images/'+key
}
function generateMeta(params, meta = ''){
// open graph	
	if (params.title) 	meta += '<title>'+params.title+'</title><meta property="og:title" content="'+params.title+'"/>'
	if (params.description) meta += '<meta property="og:description" content="'+params.description+'"/>'
	meta += '<meta property="og:image" content="'+params.image+'"/>'
// open frame
	meta += '<meta property="of:version" content="vNext"/><meta property="of:accepts:xmtp" content="2024-02-01"/>'  
	meta += '<meta property="of:image" content="'+params.image+'"/>'
	if (params.post_url) meta += '<meta property="of:post_url" content="'+params.post_url+'"/>'
	if (params.input) meta += '<meta property="of:input:text" content="'+params.input+'"/>'
	meta += '<meta property="of:image:aspect_ratio" content="'+(params.square?'1:1':'1.91:1')+'"/>'
	if (params.state) meta += '<meta property="of:state" content="'+params.state+'"/>'
    	if (params.buttons) {
		for (let i=0; i<params.buttons.length; i++){
			meta += '<meta property="of:button:'+(i+1)+'" content="'+params.buttons[i].label+'"/>'
			if (params.buttons[i].action) meta += '<meta property="of:button:'+(i+1)+':action" content="'+params.buttons[i].action+'"/>'
			if (params.buttons[i].target) meta += '<meta property="of:button:'+(i+1)+':target" content="'+params.buttons[i].target+'"/>'
		}
	}
// farcaster frame
	meta += '<meta property="fc:frame" content="vNext"/>' 
	meta += '<meta property="fc:frame:image" content="'+params.image+'"/>'
	meta += '<meta property="fc:frame:image:aspect_ratio" content="'+(params.square?'1:1':'1.91:1')+'"/>'
	if (params.post_url) meta += '<meta property="fc:frame:post_url" content="'+params.post_url+'"/>'
	if (params.state) meta += '<meta property="fc:frame:state" content="'+params.state+'"/>'
	if (params.input) meta += '<meta property="fc:frame:input:text" content="'+params.input+'"/>'
    	if (params.buttons) {
		for (let i=0; i<params.buttons.length; i++){
			meta += '<meta property="fc:frame:button:'+(i+1)+'" content="'+params.buttons[i].label+'"/>'
			if (params.buttons[i].action) meta += '<meta property="fc:frame:button:'+(i+1)+':action" content="'+params.buttons[i].action+'"/>'
			if (params.buttons[i].target) meta += '<meta property="fc:frame:button:'+(i+1)+':target" content="'+params.buttons[i].target+'"/>'
		}
	}
	return meta
}
async function request(req, res){
	if (req.body?.trustedData?.messageBytes){
		try{
			const client = getSSLHubRpcClient('hub-grpc.pinata.cloud')
			const result = await client.validateMessage(Message.decode(Buffer.from(req.body.trustedData.messageBytes, 'hex')))
			if (result.isOk() && result.value.valid) req.body.trustedData = result.value.message.data
			else if (req.method == "POST") console.log('Request was not validated')
		}catch(err){ console.log('validation error:',err) }
	}
	const query = req.query ? JSON.parse(JSON.stringify(req.query)) : null
	if (query.redirect_url) return (res.writeHead(302,{Location:query.redirect_url, 'Content-Type':'text/html'}), res.end())
	let params
	try{
		if (!frames[req.params.frame]) return
		params = await frames[req.params.frame].getParams(query, req.method == "POST" ? req.body : null)
		params.image = params.gif || params.png || await toImage(params.svg || params.html, params.square, params.width, params.svg?1:0)
		if (params.post_url != undefined) params.post_url = domain+'/'+req.params.frame+(params.post_url?params.post_url:'')
		const page_html = '<body>'+(params.page_html?params.page_html:'<h2><code>Farcaster Frame Server</code></h2><p><a href="https://github.com/nearwatch/frames" target="_blank">GitHub Repo</a></p>')+'</body>'
		res.writeHead(200,{'Content-Type':'text/html', 'Cache-Control':'public, max-age='+(params.age?params.age:86400)+', must-revalidate'})
		res.end('<!DOCTYPE html><html><head><meta charset="utf-8">'+generateMeta(params)+'</head>'+(req.method == "POST"?'':page_html)+'</html>')
	}catch(err){
		console.log(err)
		res.writeHead(400)
		res.end('Something went wrong')
	}
}
server.use(bparser.json())
server.get('/', (req, res) => res.end('Under construction'))
server.get('/images/:image', cache.sendFile)
server.get('/:frame', request)
server.post('/:frame', request)
server.listen(5000, err => console.log(err?err:'frame server running ...'))
