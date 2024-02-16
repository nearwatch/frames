const fs 	= require('fs')
const countries = require('./country.json')
const template 	= fs.readFileSync('frames/card.html','utf8').toString()
const scores	= {}

exports.getParams = (query, payload) => {
	const step = query?.step
	switch (step) {
		case 'result':
			const win = payload?.untrustedData.buttonIndex == query.country
			const user = 'id'+payload?.untrustedData.fid
			scores[user] = win ? (scores[user]?scores[user]+1:1) : 0 
			return {
				html: template.replace(/color\:black/g, win?'color\:green':'color\:red')
					      .replace(/%title%/g, win?'You are right!':'You are wrong!')
					      .replace(/%description%/g,'This is '+countries[+query.data].name+'. Your scores: '+scores[user]+''),
				square: true,
				post_url: '?step=play',  
				page_html: '<div>National flag guessing game</div>',  
				buttons: [
					{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
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
			return {
				svg: fs.readFileSync('./frames/'+countries[Math.floor(Math.random()*countries.length)].flag_1x1,'utf8').toString(),
				square: true,
				post_url: '?step=play',  
				page_html: '<div>National flag guessing game</div>',  
				buttons: [
					{label:'Guess the country by its flag', action:'post'}
				]
			}
	}
}		
