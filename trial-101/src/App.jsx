import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Stickit from './pages/stickit.jsx'
import Shopping from './pages/shopping.jsx'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Stickit/>}/>
      <Route path="/shopping" element={<Shopping/>}/>
      <Route path="/shopping/:category" element={<Shopping/>}/>
    </Routes>

  );
}

export default App
