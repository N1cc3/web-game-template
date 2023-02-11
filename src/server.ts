import * as express from 'express'
import * as http from 'http'
import * as net from 'net'
import * as path from 'path'
import * as WebSocket from 'ws'

const app = express()
const server = http.createServer(app)
const ws = new WebSocket.Server({ server })

let count = 0

ws.on('connection', (con: WebSocket) => {
	con.on('message', (msg) => {
		console.log('received: %s', msg)
		count = Number(msg)
		ws.clients.forEach((c) => c.send(count))
	})
	con.send(count)
})

app.use(express.static(path.join(__dirname, '../front/dist')))

server.listen(process.env.PORT || 3000, () => {
	console.log(`Server started on port ${(server.address() as net.AddressInfo)?.port} :)`)
})
