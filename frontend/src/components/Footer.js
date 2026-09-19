import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Footer(){
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="container app-footer-inner">
        <div className="footer-col footer-brand-col">
          <div className="brand footer-brand">
            <img src="/logo-farmacia-del-centro.png" alt="Farmacia del Centro Chilpancingo" className="brand-mark" />
            Farmacia del Centro Chilpancingo
          </div>
          <p className="footer-tagline">Tu farmacia online de confianza. Pide en línea y recoge en tienda cuando gustes.</p>
          <span className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3c3 3.5 6 7.7 6 11a6 6 0 11-12 0c0-3.3 3-7.5 6-11z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="12" cy="13" r="2.3" stroke="currentColor" strokeWidth="1.7" fill="none"/></svg>
            Paseo Alejandro Cervantes Delgado, Universal, 39080 Chilpancingo de los Bravo, Gro.
          </span>
          <span className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            Horario: 10:00 a.m. – 9:00 p.m.
          </span>
          <a href="tel:+527476889254" className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1.1L6.6 10.8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            747 688 9254
          </a>
        </div>

        <div className="footer-col">
          <strong className="footer-col-title">Navegación</strong>
          <NavLink to="/">Productos</NavLink>
          <NavLink to="/cart">Carrito</NavLink>
          <NavLink to="/orders">Mis pedidos</NavLink>
          <NavLink to="/prescriptions">Mis recetas</NavLink>
        </div>

        <div className="footer-col">
          <strong className="footer-col-title">Compra con confianza</strong>
          <span className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            Pago seguro procesado con Stripe
          </span>
          <span className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M9 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Recetas verificadas por un farmacéutico
          </span>
          <span className="footer-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v11H8l-4 4V4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            Atención en vivo por chat
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {year} Farmacia del Centro Chilpancingo. Todos los derechos reservados.</span>
        </div>
      </div>
    </footer>
  )
}
