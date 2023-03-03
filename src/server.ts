import * as express from 'express'
import * as http from 'http'
import * as net from 'net'
import * as path from 'path'
import * as WebSocket from 'ws'

export interface HostedGame {
	id: string
	hostConId: string
	players: Player[]
}

export interface Player {
	name: string
	connected: boolean
	conId: string
}

interface Game<GameMsgOut> extends HostedGame {
	/** Sends message to all clients.
	 * @param msg Serializeable public message
	 */
	broadcast: (msg: GameMsgOut) => void
	/** Sends message to a specic player.
	 * @param from Player name of sender
	 * @param to Player name of reciever
	 * @param msg Serializeable private message
	 */
	send: (from: string, to: string, msg: GameMsgOut) => void
}

interface ExtWebSocket extends WebSocket {
	id: string
	gameId?: string
}

/** Generic messages the server expects. Used for all games. Send these from the client */
export type MsgIn = { type: 'host' } | { type: 'join'; gameId: string; playerName: string }
/** Generic messages sent by the server. Used for all games. Listen to these on the client. */
export type MsgOut =
	| { type: 'hosted'; game: HostedGame }
	| { type: 'joined'; game: HostedGame; playerName: string }
	| { type: 'game_not_found' }
	| { type: 'player_disconnected'; game: HostedGame }
	| { type: 'duplicate_playername' }

interface Callbacks<GameMsgIn, GameMsgOut> {
	/** Called when a new game has been hosted. Use to create the initial game state.
	 * @param game The newly created game.
	 */
	onHost: (game: Game<GameMsgOut>) => void
	/** Called on every message the server recieves.
	 * Check the message type, run your game logic and update the game state accordingly.
	 * Remember to broadcast the new game state to the players.
	 * @param game The game the message was sent in
	 * @param player The player who sent the message
	 * @param msg The message
	 */
	onGameMsg: (game: Game<GameMsgOut>, player: Player, msg: GameMsgIn) => void
	/** Called when a player joins or rejoins the game.
	 * Use to initialize player data and to send the current private player state.
	 * @param game The game that was joined/rejoined
	 * @param player The player who joined/rejoined
	 * @param isRejoin Boolean whether this was a rejoin or not.
	 */
	onJoin: (game: Game<GameMsgOut>, player: Player, isRejoin: boolean) => void
}

/** Creates the websocket server. Provides game frontend from front/dist folder.
 * Provide two type arguments: GameMsgIn and GameMsgOut.
 * These are the types of messages your game server will want to recieve in and send out.
 */
export const createServer = <GameMsgIn, GameMsgOut>({
	onHost,
	onGameMsg,
	onJoin,
}: Callbacks<GameMsgIn, GameMsgOut>) => {
	const app = express()
	const server = http.createServer(app)
	const ws = new WebSocket.Server({ server })

	const broadcast = (game: HostedGame, msg: MsgOut | GameMsgOut) => {
		ws.clients.forEach((c) => {
			const client = c as ExtWebSocket
			if (client.id === game.hostConId || game.players.map((p) => p.conId).includes(client.id)) {
				client.send(stringify(msg))
			}
		})
	}

	const sendTo = (game: HostedGame, fromName: string, toName: string, msg: MsgOut | GameMsgOut) => {
		const from = game.players.find((p) => p.name === fromName)
		const to = game.players.find((p) => p.name === toName)
		ws.clients.forEach((c) => {
			const client = c as ExtWebSocket
			if (client.id === to?.conId || client.id === from?.conId) client.send(stringify(msg))
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
					send: (from, to, msg) => sendTo(game, from, to, msg),
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
					onJoin(game, newPlayer, false)
					broadcast(game, { type: 'joined', game, playerName: newPlayer.name })
					return
				}

				if (player.connected) {
					con.send(stringify({ type: 'duplicate_playername' } satisfies MsgOut))
				} else {
					player.connected = true
					player.conId = conId
					con.gameId = game.id
					onJoin(game, player, true)
					broadcast(game, { type: 'joined', game, playerName: player.name })
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
		console.log(`Server started on port ${(server.address() as net.AddressInfo)?.port}`)
	})
}
