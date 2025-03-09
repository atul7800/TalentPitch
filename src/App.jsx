import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PopupBody from './components/PopupBody'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <PopupBody />
    </>
  )
}

export default App
