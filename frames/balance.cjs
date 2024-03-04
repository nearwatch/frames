const fs 	= require('fs')
const fetch 	= require('node-fetch')
const spyman 	= fs.readFileSync('frames/spyman.svg','utf8').toString()
const template  = fs.readFileSync('frames/balance.html','utf8').toString()
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
	if (buffer[addr] && Date.now()-buffer[addr].time < 300000){
		if (!buffer[addr].error){
			console.log('restore zerion data from cache')
			return buffer[addr]
		}
		if (Date.now()-buffer[addr].time < 30000) return {error:buffer[addr].error}
	}
	try{
		const res = await fetch('https://api.zerion.io/v1/wallets/'+addr+'/portfolio', {headers:{accept:'application/json', ...zerion}, timeout:60000})
		if (!res.ok) return {error:res.status}
		if (res.status == 202) {
			buffer[addr] = {time:Date.now(), error:'Data is being collected'}
			return {error:buffer[addr].error}
		} 
		delete buffer[addr]
		const data = await res.json()
		if (!data?.data?.attributes){
			buffer[addr] = {time:Date.now(), error:'No data. Try later'}
			return {error:buffer[addr].error}
		}	
		buffer[addr] = {time:Date.now(), updated:new Date().toISOString().substr(0,16).replace('T',' '), ...data.data.attributes}
		return data.data.attributes
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
			if (key!='details' && key!='balance' && key!='updated') result.post_url += (result.post_url.length?'&':'?')+key+'='+query[key]
			if (values[key] && key!='updated' && key!='balance'){
				temp = temp.replace('%text%',values[key])
				if (!query.balance && text.length == 0) delete result.input
			}
		}
		if (query.balance || text.length>0){ 
			if (query.balance || text=='Data is being collected'){
				if (query.balance){
					const bt = query.details?.positions_distribution_by_type
					const bc = query.details?.positions_distribution_by_chain
					result.page_html = '<div>'+(query.name?'<h3>@'+query.name+'</h3>':'')+(query.fid?'fid: '+query.fid+'<br />':'')+(query.address?'address: '+query.address+'<br />':'')+(query.balance?'<h4>Total: $'+query.balance+'</h4>':'')+'</div>'
					result.page_html += bt ? '<div>by type:<ul>'+Object.keys(bt).map(key => '<li>'+key+': $'+bt[key].toFixed(2)).join('</li>')+'</ul></div>' : ''
					result.page_html += bc ? '<div>by chain:<ul>'+Object.keys(bc).map(key => '<li>'+key+': $'+bc[key].toFixed(2)).join('</li>')+'</ul></div>' : ''
					result.page_html += query.updated ? '<div style="margin-top:50px; color:silver">updated '+query.updated+'</div>' : ''
					result.buttons.push({label:'More details', action:'link', target:'https://frames.doe.cx/balance'+result.post_url})
				}
				result.buttons.push({label:'Etherscan', action:'link', target:'https://etherscan.io/address/'+query.address+'#multichain-portfolio'})
			}
			result.post_url = ''
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
		query.details = balance
		query.balance = balance?.total?.positions?.toFixed(2)
		query.updated = balance.updated || new Date().toISOString().substr(0,16).replace('T',' ')
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
