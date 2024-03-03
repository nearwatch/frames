const fs 	    = require('fs')
const fetch 	= require('node-fetch')
const spyman 	= fs.readFileSync('frames/spyman.svg','utf8').toString()
const template= fs.readFileSync('frames/balance.html','utf8').toString()
const zerion	= {authorization:'Basic '}
const buffer	= {}	

async function getUserInfo(fid){
	try{
		const res = await fetch('https://www.bountycaster.xyz/api/v1/fid/'+fid+'/addresses', {timeout:5000})
		if (!res.ok) return res.status == 404 ? {error:'User not found'} : {error:res.status}
		const data = await res.json()
		if (!data.found) return {error:'User not found'}
		return {user:data.address.fname, address:data.address.data.address}
	}catch(error){return {error}}
}
async function getUserByName(name){
	try{
		const res = await fetch('https://hub.farcaster.standardcrypto.vc:2281/v1/userNameProofByName?name='+name, {timeout:5000})
		if (!res.ok) return res.status == 404 ? {error:'Username not found'} : {error:res.status}
		const data = await res.json()
		return data
	}catch(error){return {error}}
}
async function getUserBalance(addr){
	if (buffer[addr] && Date.now()-buffer[addr]<30000) return {error:'Data is being collected'}
	try{
		const res = await fetch('https://api.zerion.io/v1/wallets/'+addr+'/portfolio', {headers:{accept:'application/json', ...zerion}, timeout:60000})
		if (!res.ok) return {error:res.status}
		if (res.status == 202) {
			buffer[addr] = Date.now()
			return {error:'Data is being collected'}
		} 
		delete buffer[addr]
		const data = await res.json()
		return data?.data?.attributes
	}catch(error){return {error}}
}
exports.getParams = async (query={}, payload) => {
	const window = (text='', query={}) => {
		if (typeof text != 'string'){
			query = text
			text = ''
		}
		const values = {
			name:'@'+query.name, 
			fid:'fid: '+query.fid, 
			address:query.address?query.address.substr(0,6)+'...'+query.address.substr(-4):'', 
			updated:query.updated?query.updated:'', 
			balance:query.balance?'$'+query.balance:''
		}
		const result = {
			input: 'Enter fid, username or wallet', 
			post_url: '',
			no_cache: true,
			buttons: [{label:'Get '+(query.address && !query.balance?'balance':'info'), action:'post'}]
		}
		let temp = template
		for (const key of Object.keys(query)){
			result.post_url += (result.post_url.length?'&':'?')+key+'='+query[key]
			if (values[key] && key!='updated' && key!='balance'){
				temp = temp.replace('%text%',values[key])
				if (!query.balance && text.length == 0) delete result.input
			}
		}
		if (query.balance || text.length>0){ 
			result.post_url = ''
			if (query.balance || text=='Data is being collected') result.buttons.push({label:'Etherscan', action:'link', target:'https://etherscan.io/address/'+query.address+'#multichain-portfolio'})
		}
		temp = temp.replace('%text%',text).replace(/%text%/g,'').replace('%balance%',values.balance).replace('%updated%',values.updated)
		result.svg = spyman.replace(/%message%/g, temp)
		return result
	}
	let text = payload?.untrustedData.inputText?.toLowerCase().trim()
	if (text!=undefined) {
		if (text.length==0 && payload?.untrustedData.fid) query.fid = payload?.untrustedData.fid
		else if (/^0x[0-9a-f]+$/.test(text)) query.address = text
		else if (/^\d+$/i.test(text)) query.fid = text
		else if (/^\S+$/i.test(text)) query.name = text
		else return window('Wrong username')
	}
	if (query.address){
		const balance = await getUserBalance(query.address)	
		if (balance.error) return window('Error getting balances')
		query.balance = balance?.total?.positions?.toFixed(2)
		query.updated = new Date().toISOString().substr(0,16).replace('T',' ')
		return window(query)
	} else if (query.fid || query.name){
		if (!query.fid){
			const user = await getUserByName(query.name[0]=='@'?query.name.substr(1):query.name)
			if (user.error || !user.fid) return window('Username not found')
			query.fid = user.fid
		}
		const userData = await getUserInfo(query.fid)		
		if (userData.error || !userData.address) return window('wallet is not recognized',query)
		query.name = userData.user
		query.address = userData.address
		query.updated = new Date().toISOString().substr(0,16).replace('T',' ')
		return window(query)
	} 
	return window()
}
