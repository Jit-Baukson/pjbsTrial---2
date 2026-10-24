import { Routes, Route, Navigate } from 'react-router-dom'
import Stickit from './pages/stickit.jsx'
import Shopping from './pages/shopping.jsx'
import Login from './pages/login.jsx'
import Cart from './pages/cart.jsx'
import Checkout from './pages/checkout.jsx'
import Receipt from './pages/receipt.jsx'
import Profile from './pages/profile.jsx'
import NotFound from './pages/notFound.jsx'
import RequireAuth from './components/requireAuth.jsx'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/home" element={<Stickit/>}/>
      <Route path="/shopping" element={<Shopping/>}/>
      <Route path="/shopping/:category" element={<Shopping/>}/>
      <Route path="/cart" element={<Cart/>}/>
      <Route path="/checkout" element={<RequireAuth><Checkout/></RequireAuth>}/>
      <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>}/>
      <Route path="/receipt/:orderId" element={<Receipt/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>

  );
}

export default App
