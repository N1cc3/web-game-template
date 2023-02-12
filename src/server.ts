import * as express from 'express'
import * as http from 'http'
import * as net from 'net'
import * as path from 'path'
import * as WebSocket from 'ws'

export interface Game {
	id: string
	hostConId: string
	players: Player[]
}

export interface Player {
	name: string
	connected: boolean
	conId: string
}

interface ExtWebSocket extends WebSocket {
	id: string
}

const app = express()
const server = http.createServer(app)
const ws = new WebSocket.Server({ server })

const games: Game[] = []

export type MsgIn = { type: 'host' } | { type: 'join'; gameId: string; playerName: string }
export type MsgOut =
	| { type: 'hosted'; game: Game }
	| { type: 'joined'; game: Game }
	| { type: 'game_not_found' }
	| { type: 'player_disconnected'; game: Game }
	| { type: 'duplicate_playername' }

const { parse, stringify } = JSON

ws.on('connection', (con: ExtWebSocket) => {
	const conId = String(Math.random())
	con.id = conId

	con.on('message', (raw) => {
		const msg = parse(raw.toString()) as MsgIn

		console.log('received: %s', msg)

		if (msg.type === 'host') {
			const game: Game = { id: String(Math.floor(Math.random() * 1000)), hostConId: conId, players: [] }
			games.push(game)
			con.send(stringify({ type: 'hosted', game } satisfies MsgOut))
		}

		if (msg.type === 'join') {
			const game = games.find((game) => game.id === msg.gameId)
			if (!game) {
				con.send(stringify({ type: 'game_not_found' } satisfies MsgOut))
				return
			}

			const player = game.players.find((player) => player.name === msg.playerName)
			if (!player) {
				game.players.push({ connected: true, name: msg.playerName, conId })
				broadcast(game, { type: 'joined', game })
				return
			}

			if (player.connected) {
				con.send(stringify({ type: 'duplicate_playername' } satisfies MsgOut))
			} else {
				player.connected = true
				player.conId = conId
				broadcast(game, { type: 'joined', game })
			}
		}
	})

	con.on('close', () => {
		games.forEach((game) => {
			const player = game.players.find((p) => p.conId === conId)
			if (player) {
				player.connected = false
				broadcast(game, { type: 'player_disconnected', game })
			}
		})
	})
})

const broadcast = (game: Game, msg: MsgOut) => {
	ws.clients.forEach((c) => {
		const client = c as ExtWebSocket
		if (client.id === game.hostConId || game.players.map((p) => p.conId).includes(client.id)) {
			client.send(stringify(msg))
		}
	})
}

app.use(express.static(path.join(__dirname, '../front/dist')))

server.listen(process.env.PORT || 3000, () => {
	console.log(`Server started on port ${(server.address() as net.AddressInfo)?.port} :)`)
})
