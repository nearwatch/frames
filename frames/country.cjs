const fs 	= require('fs')
const fetch	= require('node-fetch')
const countries = require('./country.json')
const template 	= fs.readFileSync('frames/card.html','utf8').toString()
const redis 	= require('redis')
const users 	= require('../users.json')

const {StackClient} = require("@stackso/js-core")
const stack = new StackClient({apiKey: ''})

async function getWallet(fid){
	try{
		const res = await fetch('https://client.warpcast.com/v2/user?fid='+fid,{timeout:15000})	
		if (!res.ok) return ({error:res.statusText+' ('+res.status+')'})
		const data = await res.json()
		return data?.result?.extras?.custodyAddress.toLowerCase()
	} catch(error) {
		return {error}
	}
}
async function addScores(fid, scores=1){
	console.log('add',scores,'score(s) for',fid)
	const wallet = await getWallet(fid)
	if (!wallet || wallet.error) return 
	try{
		const client = redis.createClient({url:process.env.REDIS_URL})
		await client.connect()
		await client.set('wallet:'+wallet, fid)
		await client.set('fid:'+fid, wallet)
		await client.quit()
	} catch(err){console.log(err)}
	await stack.track("guessed", {account:wallet, points:1}).catch(console.log)
}
async function getLB(){
	try{
		const pointSystem = await stack.getDefaultPointSystem()
		const resp = await pointSystem.leaderboard.get({limit: 20, offset: 0, includeMetadata:true, includeIdentities:true})
		return resp?.leaderboard.map(e => ({walletAddress:e.walletAddress.toLowerCase(), totalPoints:e.totalPoints}))
	} catch(error){ return {error} }
}
exports.getParams = async (query, payload) => {
	const step = query?.step
	switch (step) {
		case 'result':
			const win = payload?.untrustedData.buttonIndex == query.country
			const user = 'country.'+payload?.untrustedData.fid
			if (win && payload?.untrustedData.fid) addScores(payload.untrustedData.fid)
			return {
				html: template.replace(/color\:black/g, win?'color\:green':'color\:red')
							  .replace(/%title%/g, win?'You are right!':'You are wrong!')
							  .replace(/%description%/g,'This is '+countries[+query.data].name+'. Click on the frame to see the leaderboard'),
				square: true,
				post_url: '?step=play',  
				page_html: '<div>National flag guessing game</div>',  
				buttons: [
					{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
					{label:'Leaderboard', action:'link', target:'https://frames.doe.cx/country'},
					{label:'Play Again', action:'post'}

				]
			}
		case 'play':
			const size = 3
			const list = []
			for (let i=0; i<size; i++){
				let p = Math.floor(Math.random()*countries.length);
				while (list.includes(p)) p = Math.floor(Math.random()*countries.length);
				list.push(p)
			}
			const win_ptr = Math.floor(Math.random()*size)
			return {
				svg: fs.readFileSync('./frames/'+countries[list[win_ptr]].flag_1x1,'utf8').toString(),
				square: true,
				post_url: '?step=result&country='+(win_ptr+1)+'&data='+list[win_ptr],  
				page_html: '<div>National flag guessing game</div>',  
				buttons: list.map(e => ({label:countries[e].name, action:'post'}))
			}
		default:
			let table = [], html = ''
			try{
				const client = redis.createClient({url:process.env.REDIS_URL})
				await client.connect()
				const stackLB = await getLB()
				if (stackLB && !stackLB.error) 
					for (const item of stackLB) table.push({id: (await client.get('wallet:'+item.walletAddress)) || item.walletAddress, score:item.totalPoints})
				await client.quit()
			} catch(err){console.log(err)}
			table.sort((a,b) => a.score<b.score?1:-1)
			table = table.filter(e => e.score)
			if (table.length > 20) table.length = 20
			const ids = table.map(e => e.id)
			const ul = users.filter(e => ids.includes(e.id))
			const cell_style = 'display:table-cell; padding:10px; border: 0.3px solid maroon; vertical-align: middle;' 
			const img_style  = ' width:50px; height:50px; background-color:#ccc; background-size:cover; background-position:center;' 
			html += '<h3>Top '+table.length+'</h3><div style="display:table; width:400px; border-collapse:collapse;">'
			for (let i=0; i<table.length; i++){
				const user = ul.find(e => e.id == table[i].id)
				html += '<div style="display: table-row;"><div style="'+cell_style+img_style+' background-image: url(\''+(user?user?.img:'')+'\');"></div><div style="'+cell_style+'">'+(user?user.name:"Unknown user")+'</div><div style="'+cell_style+' text-align:center;">'+table[i].score+'</div></div>'
			}	
			html += '</div>'
			return {
				svg: fs.readFileSync('./frames/'+countries[Math.floor(Math.random()*countries.length)].flag_1x1,'utf8').toString(),
				square: true,
				age: 0,
				post_url: '?step=play',  
				page_html: '<div style="padding:10px;">'+html+'</div>',  
				buttons: [
					{label:'Guess the country by its flag', action:'post'}
				]
			}
	}
}		
