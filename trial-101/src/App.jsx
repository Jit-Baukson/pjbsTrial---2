import { Routes, Route, Navigate } from 'react-router-dom'
import Stickit from './pages/stickit.jsx'
import Shopping from './pages/shopping.jsx'
import Login from './pages/login.jsx'
import Cart from './pages/cart.jsx'
import Checkout from './pages/checkout.jsx'
import Receipt from './pages/receipt.jsx'
import NotFound from './pages/notFound.jsx'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/home" element={<Stickit/>}/>
      <Route path="/shopping" element={<Shopping/>}/>
      <Route path="/shopping/:category" element={<Shopping/>}/>
      <Route path="/cart" element={<Cart/>}/>
      <Route path="/checkout" element={<Checkout/>}/>
      <Route path="/receipt/:orderId" element={<Receipt/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>

  );
}

export default App
