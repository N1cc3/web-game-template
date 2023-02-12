import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { Game } from '../../src/server'
import { MsgIn, MsgOut } from '../../src/server'

const url = import.meta.env.DEV ? 'ws://localhost:3000/' : `ws://${window.location.host}`
const ws = new WebSocket(url)

export const App = () => {
	const [game, setGame] = useState<Game>()
	const [id, setId] = useState<string>('')
	const [playerName, setPlayerName] = useState<string>('')

	useEffect(() => {
		ws.onopen = () => console.log('connected')
		ws.onclose = () => console.log('disconnected')
		ws.onmessage = (raw) => {
			const msg = JSON.parse(raw.data) as MsgOut
			if (msg.type === 'hosted') setGame(msg.game)
			if (msg.type === 'joined') setGame(msg.game)
			if (msg.type === 'player_disconnected') setGame(msg.game)
			if (msg.type === 'duplicate_playername') alert('Duplicate player name!')
		}
	}, [])

	const onHost = () => ws.send(JSON.stringify({ type: 'host' } satisfies MsgIn))
	const onJoin = () => ws.send(JSON.stringify({ type: 'join', gameId: id, playerName } satisfies MsgIn))

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
			{game && <Lobby game={game} />}
		</div>
	)
}

const Lobby = ({ game }: { game: Game }) => {
	return (
		<div>
			<div>{game.id}</div>
			{game.players.map((p) => (
				<div key={p.name}>
					{p.name} {String(p.connected)}
				</div>
			))}
		</div>
	)
}
