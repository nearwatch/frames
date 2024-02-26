const fs 	= require('fs')
const fetch	= require('node-fetch')
const {JSDOM} 	= require('jsdom')
const template 	= fs.readFileSync('frames/card.html','utf8').toString()
const template2	= fs.readFileSync('frames/tph_text.html','utf8').toString()
const template3	= fs.readFileSync('frames/tph_image.html','utf8').toString()

async function getImage(imageUrl){
    const response = await fetch(imageUrl)
	let file_type = 'image/jpeg'
	response.headers.forEach((value,key) => {if (key == 'content-type') file_type = value})
    const buffer = await response.buffer()
    return 'data:'+file_type+';base64,'+buffer.toString('base64')
}
async function getPage(url){
	let i
	const not_empty   = (text) => text.replace(/\<.+?\>/g,'').replace(/\s/g,'').length != 0
	const show_list   = (text) => text.replace(/<\/?[uo]l>/g,'').replace(/<li>/g,() => '<div style="display:flex; flexDirection:row; gap:10px; margin-top:20px;">'+(text[1]==='u'?'·':(++i)+'.')+' ').replace(/<\/li>/g,'</div>')
	const add_buttons = (text) => text?.match(/\[(.+?)\]/g)?.map(e => /^\[(.+?)\;(http.+?)\]$/.exec(e)).filter(e => e).map(e => ({label:e[1], action:'link', target:e[2]})) || []
	try{
		const res = await fetch(url,{timeout:15000})	
		if (!res.ok) return ({error:res.statusText+' ('+res.status+')'})
		let html = await res.text()
		const ua = /\[url;(http.+?)\]/.exec(html)
		const result = {
			square:  html.indexOf('[square]')>0,
			nohp: 	 html.indexOf('[no_home_page]')>0,
			url:	 ua && ua[1],
			pages:   [],
			buttons: [],
		}
		html = html.replace(/\[square\]/g,'').replace(/\[no_home_page\]/g,'').replace(/\[url;(http.+?)\]/g,'')
		const dom = new JSDOM(html)
		result.title  = dom.window.document.querySelector('title')?.textContent?.replace(' – Telegraph','')
		result.author = dom.window.document.querySelector('a[rel]')?.textContent
		result.date   = dom.window.document.querySelector('time')?.textContent
		let text = ''	
		dom.window.document.querySelectorAll('p,blockquote,figure,ul,ol,h3,h4').forEach(e => {
			i = 0
			if (e.innerHTML.startsWith('<img') || e.innerHTML == '[next]'){
				if (not_empty(text)){ 
					result.buttons.push(add_buttons(text))
					result.pages.push({text: text.replace(/\[.+?\]/g,'').trim()})
				}
				text = ''
				const image = /\<img src="(.+?)"\>\<figcaption\>(.+?)?\<\/figcaption\>/.exec(e.innerHTML)
				if (image){
					result.pages.push({image:(image[1]?.startsWith('http')?'':'https://telegra.ph')+image[1], text:image[2]?.replace(/\[.+?\]/g,'').trim()})
					result.buttons.push(add_buttons(image[2]))
				}
			} 
			else if (e.outerHTML.startsWith('<h')) text += e.outerHTML.replace(/\<h3.+?\>/,'<h2>').replace('</h3>','</h2>').replace(/\<h4.+?\>/,'<h3>').replace('</h4>','</h3>')
			else if (/^\<[uo]l/.test(e.outerHTML)) text += '<div style="display:flex; flexDirection:column;">'+show_list(e.outerHTML)+'</div>'
			else if (not_empty(e.innerHTML)) text += '<div style="display:flex; margin-top:20px; flexDirection:row; gap:10px;">'+e.innerHTML+'</div>'
		})
		if (not_empty(text)){
			result.buttons.push(add_buttons(text))
			result.pages.push({text: text.replace(/\[.+?\]/g,'').trim()})
		}
		return result
	} catch(err) {
		return {error:err}
	}
}
exports.getParams = async (query, payload) => {
	let source = payload?.untrustedData.inputText || query?.url
	const prefix = /^(https?\:\/\/)?(telegra\.ph\/)?(.+)/.exec(source)
	if (!source || (prefix[1] && !prefix[2]) || !prefix[3]) return {
		html:template.replace(/%title%/g,'Telegraph Frames Viewer').replace(/%description%/g,'frames.doe.cx/tph?url=your_telegraph_link'), 
		post_url:'', 
		input:'Enter url of telegraph document', 
		buttons:[
			{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
			{label:'Load document', action:'post'}
		]
	}
	source = (prefix[1]?'':'https://')+(prefix[2]?'':'telegra.ph/')+source
	const doc = await getPage(source)
	if (doc.error || !doc.pages?.length) return {
		html:template.replace(/%title%/g,doc.error || 'No pages found in document').replace(/%description%/g, source), 
		post_url:'', 
		input:'Enter url of telegraph document', 
		buttons:[
			{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
			{label:'Retry', action:'post'}
		]
	}
	let page = query?.page ? +query.page : 0
	const button = payload?.untrustedData.buttonIndex
	if (button) page += (!page || button > 1 ? 1 : -1)
	if (page > doc.pages.length) page=0
	if (!page && doc.nohp) page=1
	if (!page) return {
		square: doc.square,
		html: template.replace(/%title%/g, doc.title?doc.title:'').replace(/%description%/g, (doc.author?.length?doc?.author+' · ':'')+doc.date),
		post_url: '?page=0&url='+source,  
		page_html: '<script>window.location="'+(doc.url || source)+'"</script>',
		buttons: [{label:'Start', action:'post'}]
	}
	const result = {
		square: doc.square,
		post_url: '?page='+page+'&url='+source,  
		page_html: '<script>window.location="'+(doc.url || source)+'"</script>',
		buttons: [
			{label:'Prev'+(page<2?'':' · '+(page-1)), action:'post'},
			...doc.buttons[page-1],
			{label:page<doc.pages.length ? 'Next · '+(page+1) : 'Repeat', action:'post'}
		]
	}
	if (result.buttons.length>4 || (doc.nohp && page == 1)) result.buttons.shift()
	if (result.buttons.length>4 || doc.pages.length == 1)   result.buttons.pop()
	if (result.buttons.length>4) result.buttons.length = 4
	if (doc.pages[page-1].image){
		result.width = 500
		if (doc.pages[page-1].text && doc.pages[page-1].text.length) result.html = template3.replace(/%image%/g, await getImage(doc.pages[page-1].image)).replace(/%text%/g, doc.pages[page-1].text).replace(/%page%/g, page+' of '+doc.pages.length)  
		else result.png = doc.pages[page-1].image
	} else result.html = template2.replace(/%image%/g,'').replace(/%text%/g, doc.pages[page-1].text).replace(/%page%/g, page+' of '+doc.pages.length)
	return result
}
