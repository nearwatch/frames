const fs 	= require('fs')
const countries = require('./country.json')
const template 	= fs.readFileSync('frames/card.html','utf8').toString()

exports.getParams = (query, payload) => {
	const step = query?.step
	switch (step) {
		case 'result':
			const win = payload?.untrustedData.buttonIndex == query.country
			return {
				html: template.replace(/color\:black/g, win?'color\:green':'color\:red')
							  .replace(/%title%/g, win?'You are right!':'You are wrong!')
							  .replace(/%description%/g,'This is '+countries[+query.data].name),
				square: true,
				post_url: '',  
				buttons: [
					{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
					{label:'Play Again', action:'post'}
				]
			}
		default:
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
				buttons: list.map(e => ({label:countries[e].name, action:'post'}))
			}
	}
}		
