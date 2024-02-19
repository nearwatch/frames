const fs 	= require('fs')
const fetch	= require('node-fetch')
const template1	= fs.readFileSync('frames/card.html','utf8').toString()
const template2	= fs.readFileSync('frames/degen_card.html','utf8').toString()

async function getImage(imageUrl) {
	const response = await fetch(imageUrl)
	let file_type = 'image/jpeg'
	response.headers.forEach((value,key) => {if (key == 'content-type') file_type = value})
	if (file_type == 'image/webp') return 'data:image/jpeg;base64,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NthU4P8AF/Fz6fnXjHivxHqviTUPtuqT72HEcajEcS+ijt9eprGooGlYKKKKBhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVPaXVxaXMdzazSQTxNuSSNiGU+xqCigD1Dw78YNYslSLWLKLUkAwZUPlSn0z/AAn8hXo/h74j+FdZVVTUFs7g4/c3f7s546Hofzr5opQaBNH2IrBlDAgg9CDkU6vlbw54v8ReH8Lpmpyxwj/lhJ+8i/75PA/DFel+FvjHbMEg8RWLQvwDc23zL25Zeo79M0CasevUVl6Druk65b+fpV/b3a4BIjf5lznG5eo6HrWlQIdRTaKAHUU2lFABijFLTJZY4k3yyJGn952AH5mgB2KMVx2u/ErwlpSHGpLfS9orQeYfxP3R+dee6z8ZNYuCV0rTbWyUgYabMzg859B+lA0rnt1xPFbxGWeWOKMcl3YKB+JrifEnxS8M6TuitZm1S4GRttvuA8dXPH5Z6V4PreuavrMnmarqNzeN2Ej/ACj6KOB+VZpORQOx33ib4q+JNT3R2LR6VAegg5k/Fz/QCuEnmluJmmnlkllc5Z3YsxPuTTCc0lAwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAlhnmgkEsEskUg6OjFSPxFd/4X+LPiDTWWLU1XVrfuZDtmHPZxwfoRXndFAH0t4Y+IvhjXCIlvPsVyeBDdkIT06N908nHXNdeOQD2PSvjv8AWul8M+NfEXh9gtjfs8A628+ZIz+BOR+BFArH1BijFeW+FvjDpdyywa7aPp8h/wCW8eZIu/UfeA6etekaXqVhqlt9p0+8guoem+Jwwz/Sgk8e8T/GO7mdovD1ilvH2nuRuc+4ToPxzXnGu+INZ1yXfq2o3F3zkK7fIv0UcD8qzWptBY7dSE5pKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAdu9quaVqOoaVdC6068ntJgR88Tlc+x9R7HNUacvegAam08jNJtoAbRTttG2gBtFO20baAG0U7bRtoAbRTttG2gBtFO20baAG0U7bRtoAbRTttG2gBtFO20baAG0U7bRtoAbRTttG2gBtFO20baAG0U7bRtoAbRTttG2gBtFO20baAG0U7bRtoAbRTttG2gBtFO20baAG0U7bRtoAbTl70baUDFAH//2Q=='
	const buffer = await response.buffer()
	return 'data:'+file_type+';base64,'+buffer.toString('base64')
}
exports.getParams = async (query, payload) => {
	const alert = (text) => ({html:template1.replace(/%title%/g,'Degen Tips').replace(/%description%/g,text), post_url:'?step=info', buttons:[{label:'Retry', action:'post'}]})
	const step  = query?.step
	switch (step) {
		case 'info':
			try{
				const id = payload?.untrustedData.fid 
				if (!id) return alert('User not defined')
				const res = await fetch('https://www.degen.tips/api/airdrop2/tip-allowance?fid='+id,{timeout:15000})
				const result = await res.json()
				if (!result.length) return alert('No user data found')
				let points
				if (result[0].wallet_address){
					try{
						const res = await fetch('https://www.degen.tips/api/airdrop2/points?address='+result[0].wallet_address,{timeout:15000})
						const result2 = await res.json()
						if (result2[0].points) points = result2[0].points
					} catch(err){}
				}
				return {
					html: template2.replace(/%photo%/g, await getImage(result[0].avatar_url))
						       .replace(/%updated%/g, result[0].snapshot_date.split('T')[0])
						       .replace(/%name%/g, result[0].display_name)
						       .replace(/%rank%/g, result[0].user_rank)
						       .replace(/%tipslimit%/g, result[0].tip_allowance)
						       .replace(/%remaining%/g, result[0].remaining_allowance)
						       .replace(/%points%/g, points?'<div style="display:flex; margin-top:10px;">will receive: '+points+'</div>':''),
					width: 600,
					post_url:'?step=info',
					buttons: [
						{label:'Repo', action:'link', target:'https://github.com/nearwatch/frames/'},
						{label:'Retry', action:'post'}
					]
				}
			} catch(err){
				return alert(err.toString())				
			}
		default:
			return {
				html: template1.replace(/%title%/g, 'Degen Tips').replace(/%description%/g,'get your account information'),
				post_url: '?step=info',  
				buttons: [{label:'Get Info', action:'post'}]
			}
	}
}
