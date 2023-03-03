import { KeyboardEventHandler, useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { HostedGame } from '../../src/server'
import { MsgIn, MsgOut } from '../../src/server'
import { GameMsgIn, GameMsgOut } from '../../src/game'

const url = import.meta.env.DEV ? 'ws://localhost:3000/' : `ws://${window.location.host}`
const ws = new WebSocket(url)

type Chat = { name: string; msg: string; private: boolean }[]

export const App = () => {
	const [game, setGame] = useState<HostedGame>()
	const [id, setId] = useState<string>('')
	const [playerName, setPlayerName] = useState<string>('')
	const [chat, setChat] = useState<Chat>([])
	const [acceptedPlayerName, setAcceptedPlayerName] = useState<string>()

	useEffect(() => {
		ws.onopen = () => console.log('connected')
		ws.onclose = () => console.log('disconnected')
		ws.onmessage = (raw) => {
			const msg = JSON.parse(raw.data) as MsgOut
			if (msg.type === 'hosted') setGame(msg.game)
			if (msg.type === 'joined') {
				setGame(msg.game)
				if (msg.playerName === playerName) setAcceptedPlayerName(playerName)
			}
			if (msg.type === 'player_disconnected') setGame(msg.game)
			if (msg.type === 'duplicate_playername') alert('Duplicate player name!')

			const gameMsg = msg as unknown as GameMsgOut
			if (gameMsg.type === 'chat_msg') {
				setChat((chat) => [
					...chat,
					{
						name:
							gameMsg.private && gameMsg.sender === acceptedPlayerName ? `(to: ${gameMsg.recipient})` : gameMsg.sender,
						msg: gameMsg.msg,
						private: gameMsg.private,
					},
				])
			}
		}
	}, [playerName, acceptedPlayerName])

	const onHost = () => ws.send(JSON.stringify({ type: 'host' } satisfies MsgIn))
	const onJoin = () => ws.send(JSON.stringify({ type: 'join', gameId: id, playerName } satisfies MsgIn))
	const onSubmit = (chatMsg: string, recipient?: string) => {
		if (recipient) ws.send(JSON.stringify({ type: 'private_msg', recipient, msg: chatMsg } satisfies GameMsgIn))
		else ws.send(JSON.stringify({ type: 'public_msg', msg: chatMsg } satisfies GameMsgIn))
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
			<input placeholder="game id" onChange={(e) => setId(e.target.value)} value={id} />
			<input placeholder="player name" onChange={(e) => setPlayerName(e.target.value)} value={playerName} />
			<button onClick={onJoin}>Join</button>
			{game && <Lobby game={game} isPlayer={Boolean(acceptedPlayerName)} onSubmit={onSubmit} chat={chat} />}
		</div>
	)
}

const Lobby = ({
	game,
	isPlayer,
	onSubmit,
	chat,
}: {
	game: HostedGame
	isPlayer: boolean
	onSubmit: (msg: string, recipient?: string) => void
	chat: Chat
}) => {
	const [msg, setMsg] = useState('')
	const [recipient, setRecipient] = useState<string>()

	const keyDown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
		if (ev.code === 'Enter') {
			onSubmit(msg, recipient)
			setMsg('')
			setRecipient(undefined)
		}
	}

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
				<>
					<input
						placeholder="chat message"
						value={msg}
						onChange={(ev) => setMsg(ev.currentTarget.value)}
						onKeyDown={keyDown}
					/>
					<input
						placeholder="send to (empty means all)"
						value={recipient ?? ''}
						onChange={(ev) => setRecipient(ev.currentTarget.value)}
						onKeyDown={keyDown}
					/>
				</>
			)}

			{chat.map((msg) => (
				<div key={`${msg.name}-${msg.msg}`} style={{ color: msg.private ? 'purple' : 'black' }}>
					{msg.name}: {msg.msg}
				</div>
			))}
		</div>
	)
}
