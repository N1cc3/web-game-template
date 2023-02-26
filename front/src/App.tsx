import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { ServerGame } from '../../src/server'
import { MsgIn, MsgOut } from '../../src/server'
import { GameMsgIn, GameMsgOut } from '../../src/game'

const url = import.meta.env.DEV ? 'ws://localhost:3000/' : `ws://${window.location.host}`
const ws = new WebSocket(url)

type Chat = { name: string; msg: string }[]

export const App = () => {
	const [game, setGame] = useState<ServerGame>()
	const [id, setId] = useState<string>('')
	const [playerName, setPlayerName] = useState<string>('')
	const [chat, setChat] = useState<Chat>([])
	const [isPlayer, setIsPlayer] = useState(false)

	useEffect(() => {
		ws.onopen = () => console.log('connected')
		ws.onclose = () => console.log('disconnected')
		ws.onmessage = (raw) => {
			const msg = JSON.parse(raw.data) as MsgOut
			if (msg.type === 'hosted') setGame(msg.game)
			if (msg.type === 'joined') {
				setGame(msg.game)
				setIsPlayer(true)
			}
			if (msg.type === 'player_disconnected') setGame(msg.game)
			if (msg.type === 'duplicate_playername') alert('Duplicate player name!')

			const gameMsg = msg as unknown as GameMsgOut
			if (gameMsg.type === 'chat_msg') setChat((chat) => [...chat, { name: gameMsg.playerName, msg: gameMsg.msg }])
		}
	}, [])

	const onHost = () => ws.send(JSON.stringify({ type: 'host' } satisfies MsgIn))
	const onJoin = () => ws.send(JSON.stringify({ type: 'join', gameId: id, playerName } satisfies MsgIn))
	const onSubmit = (chatMsg: string) => {
		ws.send(JSON.stringify({ type: 'public_msg', msg: chatMsg } satisfies GameMsgIn))
	}

	return (
		<div className="app">
			<div>
				<a href="https://vitejs.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://reactjs.org" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<button onClick={onHost}>Host</button>
			<br />
			<input placeholder="game id" onChange={(e) => setId(e.target.value)} />
			<input placeholder="player name" onChange={(e) => setPlayerName(e.target.value)} />
			<button onClick={onJoin}>Join</button>
			{game && <Lobby game={game} isPlayer={isPlayer} onSubmit={onSubmit} chat={chat} />}
		</div>
	)
}

const Lobby = ({
	game,
	isPlayer,
	onSubmit,
	chat,
}: {
	game: ServerGame
	isPlayer: boolean
	onSubmit: (msg: string) => void
	chat: Chat
}) => {
	return (
		<div>
			<div>{game.id}</div>
			{game.players.map((p) => (
				<div key={p.name}>
					{p.name} {String(p.connected)}
				</div>
			))}
			<br />
			{isPlayer && (
				<input
					placeholder="chat message"
					onKeyDown={(ev) => {
						if (ev.code === 'Enter') {
							onSubmit(ev.currentTarget.value)
							ev.currentTarget.value = ''
						}
					}}
				/>
			)}

			{chat.map((msg) => (
				<div key={`${msg.name}-${msg.msg}`}>
					{msg.name}: {msg.msg}
				</div>
			))}
		</div>
	)
}
