import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Prescriptions from './pages/Prescriptions';
import MyOrders from './pages/MyOrders';
import Login from './pages/Login';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminPayments from './pages/AdminPayments';
import AdminEvents from './pages/AdminEvents';
import AdminPrescriptions from './pages/AdminPrescriptions';
import AdminChat from './pages/AdminChat';
import AdminOperators from './pages/AdminOperators';
import { UserProvider, UserContext } from './context/UserContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/Toast';

function ProtectedUser({ children }){
  const { user } = useContext(UserContext);
  if(!user) return <Navigate to="/login" replace />;
  return children;
}

function RootRoutes(){
  const { user, loading } = useContext(UserContext);

  if (loading) return <div className="center-loader"><div className="spinner" /></div>;

  // Los operadores usan el mismo panel que el admin (el cliente lo pidió así); solo
  // la gestión de operadores queda exclusiva del rol 'admin' (dueño de la cuenta).
  if (user?.role === 'admin' || user?.role === 'operador') {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/prescriptions" element={<AdminPrescriptions />} />
          <Route path="/admin/chat" element={<AdminChat />} />
          {user.role === 'admin' && <Route path="/admin/operators" element={<AdminOperators />} />}
          <Route path="*" element={<Navigate to="/admin/products" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Products />} />
        <Route path="/cart" element={<ProtectedUser><Cart /></ProtectedUser>} />
        <Route path="/login" element={<Login onLogin={() => window.location.href = '/' } />} />
        <Route path="/prescriptions" element={<ProtectedUser><Prescriptions /></ProtectedUser>} />
        <Route path="/orders" element={<ProtectedUser><MyOrders /></ProtectedUser>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App(){
  return (
    <UserProvider>
    <CartProvider>
    <ToastProvider>
    <BrowserRouter>
      <RootRoutes />
    </BrowserRouter>
    </ToastProvider>
    </CartProvider>
    </UserProvider>
  )
}
