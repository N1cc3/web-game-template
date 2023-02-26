import * as express from 'express'
import * as http from 'http'
import * as net from 'net'
import * as path from 'path'
import * as WebSocket from 'ws'

export interface ServerGame {
	id: string
	hostConId: string
	players: ServerPlayer[]
}

interface ServerPlayer {
	name: string
	connected: boolean
	conId: string
}

interface Game<GameMsgOut> extends ServerGame {
	broadcast: (msg: GameMsgOut) => void
}

interface ExtWebSocket extends WebSocket {
	id: string
	gameId?: string
}

export type MsgIn = { type: 'host' } | { type: 'join'; gameId: string; playerName: string }
export type MsgOut =
	| { type: 'hosted'; game: ServerGame }
	| { type: 'joined'; game: ServerGame }
	| { type: 'game_not_found' }
	| { type: 'player_disconnected'; game: ServerGame }
	| { type: 'duplicate_playername' }

interface Callbacks<GameMsgIn, GameMsgOut> {
	onHost: (game: Game<GameMsgOut>) => void
	onGameMsg: (game: Game<GameMsgOut>, player: ServerPlayer, msg: GameMsgIn) => void
	onJoin: (game: Game<GameMsgOut>, player: ServerPlayer, isRejoin: boolean) => void
}

export const createServer = <GameMsgIn, GameMsgOut>({
	onHost,
	onGameMsg,
	onJoin,
}: Callbacks<GameMsgIn, GameMsgOut>) => {
	const app = express()
	const server = http.createServer(app)
	const ws = new WebSocket.Server({ server })

	const broadcast = (game: ServerGame, msg: MsgOut | GameMsgOut) => {
		ws.clients.forEach((c) => {
			const client = c as ExtWebSocket
			if (client.id === game.hostConId || game.players.map((p) => p.conId).includes(client.id)) {
				client.send(stringify(msg))
			}
		})
	}

	const games: Game<GameMsgOut>[] = []

	const { parse, stringify } = JSON

	ws.on('connection', (con: ExtWebSocket) => {
		const conId = String(Math.random())
		con.id = conId

		con.on('message', (raw) => {
			const msg = parse(raw.toString()) as MsgIn

			console.log('received: %s', msg)

			if (msg.type === 'host') {
				const game: Game<GameMsgOut> = {
					id: String(Math.floor(Math.random() * 1000)),
					hostConId: conId,
					players: [],
					broadcast: (msg) => broadcast(game, msg),
				}
				con.gameId = game.id
				games.push(game)
				onHost(game)
				con.send(stringify({ type: 'hosted', game } satisfies MsgOut))
				return
			}

			if (msg.type === 'join') {
				const game = games.find((game) => game.id === msg.gameId)
				if (!game) {
					con.send(stringify({ type: 'game_not_found' } satisfies MsgOut))
					return
				}

				const player = game.players.find((player) => player.name === msg.playerName)
				if (!player) {
					const newPlayer = { connected: true, name: msg.playerName, conId }
					con.gameId = game.id
					game.players.push(newPlayer)
					broadcast(game, { type: 'joined', game })
					return
				}

				if (player.connected) {
					con.send(stringify({ type: 'duplicate_playername' } satisfies MsgOut))
				} else {
					player.connected = true
					player.conId = conId
					con.gameId = game.id
					broadcast(game, { type: 'joined', game })
				}
				return
			}

			const gameMsg = msg as GameMsgIn
			const game = games.find((game) => game.id === con.gameId)
			if (!game) return
			const player = game.players.find((p) => p.conId === con.id)
			if (player) onGameMsg(game, player, gameMsg)
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

	app.use(express.static(path.join(__dirname, '../front/dist')))

	server.listen(process.env.PORT || 3000, () => {
		console.log(`Server started on port ${(server.address() as net.AddressInfo)?.port} :)`)
	})
}
