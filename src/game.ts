import { createServer } from './server'

export type GameMsgIn = { type: 'public_msg'; msg: string } | { type: 'private_msg'; msg: string; playerId: string }
export type GameMsgOut = { type: 'chat_msg'; playerName: string; msg: string; private: boolean }

const server = createServer<GameMsgIn, GameMsgOut>({
	onHost(game) {
		game.broadcast({ type: 'chat_msg', playerName: 'Server', msg: 'Chat started...', private: false })
	},
	onGameMsg(game, player, msg) {
		if (msg.type === 'public_msg')
			game.broadcast({ type: 'chat_msg', playerName: player.name, msg: msg.msg, private: false })
	},
	onJoin(game, player) {},
})
