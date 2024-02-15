const fs 	  = require('fs')
const template 	  = fs.readFileSync('frames/card.html','utf8').toString()

exports.getParams = (query, payload) => {
	const step = query?.step
	const name = payload?.untrustedData.inputText || query?.name || "Anon"
	switch (step) {
		case 'flip-coin':
			return {
				html: template.replace(/%title%/g,`Hello, ${name}!`)
					      .replace(/%description%/g,'Let\'s play heads or tails. Your call.'),
				post_url: '?name='+name+'&step=result',  
				buttons: [
					{label:'Heads', action:'post'},
					{label:'Tails', action:'post'},
				]
			}
		case 'result':
			const userChoice = payload?.untrustedData.buttonIndex === 2 ? "Heads" : "Tails"
			const coinFlip = Math.random() < 0.5 ? "Heads" : "Tails"
			const didWin = userChoice === coinFlip
			return {
				html: template.replace(/%title%/g,didWin ? `Congratulations, ${name}!` : `Better luck next time, ${name}!`)
							  .replace(/%description%/g,`You chose ${userChoice.toLowerCase()}, and the coin landed on ${coinFlip.toLowerCase()}.`),
				post_url: '?name='+name+'&step=flip-coin', 
				buttons: [
					{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
					{label:'Play Again', action:'post'}
				]
			}
		default:
			return {
				html: template.replace(/%title%/g,'React free Node.js frame server')
					      .replace(/%description%/g,'no more overhead'),
				post_url: '?step=flip-coin',  
				input: 'What&#x27;s your name?',
				buttons: [
					{label:'Submit', action:'post'},
				]
			}
	}
}
