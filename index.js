import fs 	from 'fs'
import satori 	from 'satori'
import parse  	from 'html-react-parser'
import {Resvg} 	from '@resvg/resvg-js'
import polka  	from 'polka'
import bparser	from 'body-parser'

const server = polka()
const domain = 'https://frames.doe.cx' 
const fonts  = [
  {name:"Roboto", data:fs.readFileSync("./fonts/Roboto/Roboto-Black.ttf"),  weight:900, style:"normal"},
  {name:"Roboto", data:fs.readFileSync("./fonts/Roboto/Roboto-Bold.ttf"),   weight:700, style:"normal"},
  {name:"Roboto", data:fs.readFileSync("./fonts/Roboto/Roboto-Regular.ttf"),weight:500, style:"normal"},
  {name:"Roboto", data:fs.readFileSync("./fonts/Roboto/Roboto-Medium.ttf"), weight:400, style:"normal"},
  {name:"Roboto", data:fs.readFileSync("./fonts/Roboto/Roboto-Light.ttf"),  weight:300, style:"normal"}
];
const frames  = {}
for (const file of fs.readdirSync('./frames')){ 
	const x = /^(\S+?)\.cjs$/.exec(file)
	if (x) {
		frames[x[1]] = await import('./frames/'+x[1]+'.cjs')
		console.log(x[1]+' frame loaded')
	}
}

async function toImage(element, square, width=1200, is_svg){
	let svg = element
	if (!is_svg){
		const options = {width, height:square?width:Math.round(width/1.91), fonts}
		const dom = parse('<div style="width:'+width+'; height:'+options.height+'; display:flex; alignItems:stretch">'+element+'</div>')
		svg = await satori(dom, options)
	}
	const resvg = new Resvg(svg, {background:'rgba(255,255,255,.9)', font:{loadSystemFonts:false}})
	const pngData = resvg.render()
	const png = pngData.asPng()
	return 'data:image/png;base64,'+png.toString('base64')
}
function generateMeta(params, meta = ''){
	if (params.title) 		meta += '<title>'+params.title+'</title>'
	if (params.description) meta += '<meta name="description" content="'+params.description+'"/>'
	meta += '<meta property="og:image" content="'+params.image+'"/>'
	meta += '<meta property="fc:frame" content="vNext"/>'
	meta += '<meta property="fc:frame:image" content="'+params.image+'"/>'
	meta += '<meta property="fc:frame:image:aspect_ratio" content="'+(params.square?'1:1':'1.91:1')+'"/>'
	if (params.post_url) 	meta += '<meta property="fc:frame:post_url" content="'+params.post_url+'"/>'
	if (params.input) 		meta += '<meta property="fc:frame:input:text" content="'+params.input+'"/>'
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
	try{
		const params = frames[req.params.frame].getParams(req.query ? JSON.parse(JSON.stringify(req.query)) : null, req.method == "POST" ? req.body : null)
		params.image = params.gif || params.png || await toImage(params.svg || params.html, params.square, params.width, params.svg?1:0)
		params.post_url	= domain+'/'+req.params.frame+params.post_url
		res.end('<!DOCTYPE html><html><head>'+generateMeta(params)+'</head>'+(req.method == "POST"?'':'<body><h2><code>Node.js frame server</code></h1><p>Github repo <a href="hyyps://github.org" target="_blank">here</a></p></body>')+'</html>')
	}catch(err){
		console.log(err)
		res.writeHead(400)
		res.end('Something went wrong')
	}
}
server.use(bparser.json())
server.get('/', (req, res) => res.end('Under construction'))
server.get('/:frame', request)
server.post('/:frame', request)
server.listen(5000, err => console.log(err?err:'frame server running ...'))
