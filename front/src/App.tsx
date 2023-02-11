import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

const url = import.meta.env.DEV ? 'ws://localhost:3000/' : `ws://${window.location.host}`
const ws = new WebSocket(url)

export const App = () => {
	const [count, setCount] = useState(0)

	useEffect(() => {
		ws.onopen = () => console.log('connected')
		ws.onmessage = (msg) => setCount(Number(msg.data))
		ws.onclose = () => console.log('disconnected')
	}, [])

	const onCountClick = () => ws.send(String(count + 1))

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
			<div className="card">
				<button onClick={onCountClick}>count is {count}</button>
			</div>
		</div>
	)
}
