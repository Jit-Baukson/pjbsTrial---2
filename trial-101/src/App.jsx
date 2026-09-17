import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Stickit from './pages/stickit.jsx'
import Shopping from './pages/shopping.jsx'
function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/" element={<Stickit/>}/>
      <Route path="/shopping" element={<Shopping/>}/>
    </Routes>

  );
}

export default App
