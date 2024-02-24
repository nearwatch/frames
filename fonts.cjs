const fs = require('fs')

exports.fonts  = [
  {name:"Roboto", 	data:fs.readFileSync("./fonts/Roboto/Roboto-Bold.ttf"),   weight:700, style:"normal"},
  {name:"Roboto", 	data:fs.readFileSync("./fonts/Roboto/Roboto-Regular.ttf"),weight:500, style:"normal"},
  {name:"Roboto", 	data:fs.readFileSync("./fonts/Roboto/Roboto-Italic.ttf"), weight:500, style:"italic"},
  {name:"Roboto Black", data:fs.readFileSync("./fonts/Roboto/Roboto-Black.ttf"),  weight:900, style:"normal"},
  {name:"Roboto Medium",data:fs.readFileSync("./fonts/Roboto/Roboto-Medium.ttf"), weight:400, style:"normal"},
  {name:"Roboto Light", data:fs.readFileSync("./fonts/Roboto/Roboto-Light.ttf"),  weight:300, style:"normal"},
  {name:"Noto Emoji",	data:fs.readFileSync("./fonts/NotoEmoji-Regular.ttf"), 	  weight:500, style:"normal"},
]
exports.fontFiles = fs.readdirSync('fonts/Roboto/').filter(e => e.endsWith('.ttf')).map(e => './fonts/Roboto/'+e).concat(["./fonts/NotoEmoji-Regular.ttf"])