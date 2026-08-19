import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Products from './pages/Products';
import Checkout from './pages/Checkout';
import Cart from './pages/Cart';
import AdminOrders from './pages/AdminOrders';
import AdminPayments from './pages/AdminPayments';
import AdminEvents from './pages/AdminEvents';
import Login from './pages/Login';
import { UserProvider, UserContext } from './context/UserContext';

export default function App(){
  return (
    <UserProvider>
    <BrowserRouter>
      <div>
        <h1>Farmacia del Centro</h1>
        <UserContext.Consumer>
          {({ user, logout }) => (
            <div style={{float:'right'}}>
              {user ? (
                <>
                  <span>{user.email} ({user.role})</span>
                  <button onClick={logout} style={{marginLeft:8}}>Logout</button>
                </>
              ) : null}
            </div>
          )}
        </UserContext.Consumer>
        <nav>
          <Link to="/">Productos</Link> | <Link to="/cart">Carrito</Link> | <Link to="/checkout">Checkout</Link> | <Link to="/admin/orders">Admin</Link> | <Link to="/login">Login</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login onLogin={() => window.location.href = '/' } />} />
          <Route path="/admin/orders" element={<ProtectedAdmin><AdminOrders /></ProtectedAdmin>} />
          <Route path="/admin/payments" element={<ProtectedAdmin><AdminPayments /></ProtectedAdmin>} />
          <Route path="/admin/events" element={<ProtectedAdmin><AdminEvents /></ProtectedAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
    </UserProvider>
  )
}


function ProtectedAdmin({ children }){
  const { user, loading } = React.useContext(UserContext);
  if(loading) return <div>Loading...</div>;
  if(!user) return <Navigate to="/login" replace />;
  if(user.role !== 'admin') return <div>Acceso denegado: admin required</div>;
  return children;
}
