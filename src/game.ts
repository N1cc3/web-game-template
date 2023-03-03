import { createServer } from './server'

export type GameMsgIn = { type: 'public_msg'; msg: string } | { type: 'private_msg'; msg: string; recipient: string }
export type GameMsgOut = { type: 'chat_msg'; sender: string; msg: string } & (
	| { private: false }
	| { private: true; recipient: string }
)

createServer<GameMsgIn, GameMsgOut>({
	onHost(game) {
		game.broadcast({ type: 'chat_msg', sender: 'Server', msg: 'Chat started...', private: false })
	},
	onGameMsg(game, player, msg) {
		if (msg.type === 'public_msg') {
			game.broadcast({ type: 'chat_msg', sender: player.name, msg: msg.msg, private: false })
		}
		if (msg.type === 'private_msg') {
			game.send(player.name, msg.recipient, {
				type: 'chat_msg',
				sender: player.name,
				recipient: msg.recipient,
				msg: msg.msg,
				private: true,
			})
		}
	},
	onJoin(game, player) {},
})
