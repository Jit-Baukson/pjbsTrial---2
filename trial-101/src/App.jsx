import { Routes, Route, Navigate } from 'react-router-dom'
import Stickit from './pages/stickit.jsx'
import Shopping from './pages/shopping.jsx'
import Login from './pages/login.jsx'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/home" element={<Stickit/>}/>
      <Route path="/shopping" element={<Shopping/>}/>
      <Route path="/shopping/:category" element={<Shopping/>}/>
    </Routes>

  );
}

export default App
