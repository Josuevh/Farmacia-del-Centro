import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Outlet, NavLink } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

const NAV_ITEMS = [
  { to: '/admin/products', label: 'Productos' },
  { to: '/admin/chat', label: 'Chat' },
  { to: '/admin/prescriptions', label: 'Recetas' },
  { to: '/admin/orders', label: 'Órdenes' },
  { to: '/admin/payments', label: 'Pagos' },
  { to: '/admin/events', label: 'Eventos Stripe' },
];

export default function AdminLayout(){
  const { user, logout } = useContext(UserContext);
  const [chatUnread, setChatUnread] = useState(0);
  const navItems = user?.role === 'admin'
    ? [...NAV_ITEMS, { to: '/admin/operators', label: 'Operadores' }]
    : NAV_ITEMS;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = () => {
      axios.get('/chat/admin/unread-count', { headers })
        .then(r => setChatUnread(r.data.unread_count))
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <img src="/logo-farmacia-del-centro.png" alt="Farmacia del Centro Chilpancingo" className="admin-brand-mark" />
            <div className="admin-brand-text">
              <strong>Farmacia del Centro Chilpancingo</strong>
              <span>Panel administrativo</span>
            </div>
          </div>

          <nav className="admin-nav">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'active' : ''}>
                {item.label}
                {item.to === '/admin/chat' && chatUnread > 0 && (
                  <span className="admin-nav-badge">{chatUnread}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="admin-user-box">
            <div className="admin-user-pill">
              <span className="admin-user-avatar">{user?.email?.charAt(0)}</span>
              <span>{user?.email}</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
