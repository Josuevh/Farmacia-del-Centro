import React, { useContext, useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { CartContext } from '../context/CartContext';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import BarcodeScanner from '../components/BarcodeScanner';

function Header(){
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useContext(CartContext);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen);
    return () => document.body.classList.remove('nav-open');
  }, [menuOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    navigate(`/?q=${encodeURIComponent(term)}`);
  };

  const handleBarcodeDetected = (code) => {
    setScannerOpen(false);
    navigate(`/?barcode=${encodeURIComponent(code)}`);
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand">
          <img src="/logo-farmacia-del-centro.png" alt="Farmacia del Centro Chilpancingo" className="brand-mark" />
          Farmacia del Centro Chilpancingo
        </div>

        <NavLink to="/cart" className="header-cart-icon" aria-label="Carrito">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 3h2l1.4 9.6a2 2 0 002 1.7h8.4a2 2 0 002-1.7L20 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="20" r="1.5" fill="currentColor"/><circle cx="17" cy="20" r="1.5" fill="currentColor"/></svg>
          {cartCount > 0 && <span className="header-cart-badge">{cartCount}</span>}
        </NavLink>

        <button
          className={"nav-toggle" + (menuOpen ? ' open' : '')}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span /><span /><span />
        </button>

        <div className={"nav-panel" + (menuOpen ? ' open' : '')}>
          <nav className="main-nav">
            <NavLink to="/" end>Productos</NavLink>
            <NavLink to="/cart">Carrito</NavLink>
            <UserContext.Consumer>
              {({ user }) => user ? (
                <NavLink to="/orders">Mis pedidos</NavLink>
              ) : null}
            </UserContext.Consumer>
            <UserContext.Consumer>
              {({ user }) => user ? (
                <NavLink to="/prescriptions">Mis recetas</NavLink>
              ) : null}
            </UserContext.Consumer>
          </nav>

          <UserContext.Consumer>
            {({ user, logout }) => (
              <div className="user-box">
                {user ? (
                  <>
                    <div className="user-pill">
                      <span className="user-avatar">{user.email.charAt(0)}</span>
                      <span>{user.email}</span>
                      <span className="role-tag">{user.role}</span>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={logout}>Salir</button>
                  </>
                ) : (
                  <NavLink to="/login" className="btn btn-primary btn-sm">Iniciar sesión</NavLink>
                )}
              </div>
            )}
          </UserContext.Consumer>
        </div>

        {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />}
      </div>

      <form className="app-header-search-row" onSubmit={submitSearch}>
        <div className="app-header-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            className="app-header-search-input"
            placeholder="¿Qué estás buscando? Ej. paracetamol, vitamina C…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button
            type="button"
            className="header-scan-btn"
            aria-label="Escanear código de barras"
            onClick={() => setScannerOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2M6 8v8M9 8v8M12 8v8M15 8v8M18 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="submit" className="app-header-search-submit" aria-label="Buscar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </form>

      {scannerOpen && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScannerOpen(false)} />
      )}
    </header>
  )
}

export default function CustomerLayout(){
  const { user } = useContext(UserContext);
  return (
    <div>
      <Header />
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
      {user && <ChatWidget />}
    </div>
  )
}
