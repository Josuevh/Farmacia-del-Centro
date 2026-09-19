import React, {useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Cart(){
  const [cart, setCart] = useState({items: [], total_amount: 0});
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const { showToast } = useToast();

  async function fetchCart(){
    try{
      const resp = await axios.get('/cart/', { headers: authHeaders() });
      setCart(resp.data);
    }catch(e){
      setCart({items: [], total_amount: 0});
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchCart(); },[]);

  const removeItem = async (productId) => {
    setRemovingId(productId);
    try{
      await axios.post('/cart/remove', { product_id: productId }, { headers: authHeaders() });
      await fetchCart();
    }catch(e){
      showToast('No se pudo quitar el producto', 'error');
    }finally{
      setRemovingId(null);
    }
  }

  const handleCheckout = async () => {
    const token = localStorage.getItem('access_token');
    if(!token){ showToast('Necesitas iniciar sesión para pagar', 'error'); return }
    setCheckingOut(true);
    try{
      const origin = window.location.origin;
      const resp = await axios.post('/payments/checkout-order', {
        items: cart.items.map(i=>({ product_id: i.product_id, quantity: i.quantity })),
        success_url: `${origin}/orders`,
        cancel_url: `${origin}/cart`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if(resp.data.checkout_url) window.location.href = resp.data.checkout_url;
    }catch(e){ showToast(e.response?.data?.detail || 'Error al iniciar checkout', 'error') }
    finally{ setCheckingOut(false) }
  }

  if(loading) return <div className="center-loader"><div className="spinner" /></div>;

  const itemCount = cart.items.reduce((sum, it) => sum + it.quantity, 0);
  const needsPrescription = cart.items.some(it => it.requires_prescription);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Carrito</h2>
          <p>Revisa tus productos antes de pagar</p>
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 3h2l1.4 9.6a2 2 0 002 1.7h8.4a2 2 0 002-1.7L20 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="20" r="1.5" fill="currentColor"/><circle cx="17" cy="20" r="1.5" fill="currentColor"/></svg>
          </span>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos desde el catálogo para continuar.</p>
          <Link to="/" className="btn btn-primary btn-sm" style={{marginTop: 16}}>Ver catálogo</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map((it)=> (
              <div className="cart-row card" key={it.product_id}>
                <div className="cart-row-thumb">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5 20.5L4 14a4.95 4.95 0 117-7l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M13.5 3.5L20 10a4.95 4.95 0 11-7 7l-1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 12l6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="cart-row-body">
                  <strong>{it.product_name}</strong>
                  <span>Cantidad: {it.quantity}</span>
                  {it.requires_prescription && <span className="badge badge-warning cart-row-badge">Requiere receta</span>}
                </div>
                <div className="cart-row-price">${Number(it.total_price).toFixed(2)}</div>
                <button
                  className="cart-row-remove"
                  aria-label={`Quitar ${it.product_name}`}
                  disabled={removingId === it.product_id}
                  onClick={()=>removeItem(it.product_id)}
                >
                  {removingId === it.product_id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>

          <div className="card cart-summary">
            <h3>Resumen</h3>
            <div className="summary-row">
              <span>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span>
              <strong>${Number(cart.total_amount).toFixed(2)}</strong>
            </div>
            {needsPrescription && (
              <p className="cart-prescription-hint">
                Este pedido incluye productos que requieren receta.{' '}
                <Link to="/prescriptions">Sube tu receta aquí</Link> si aún no lo has hecho.
              </p>
            )}
            <button className="btn btn-primary btn-block" disabled={checkingOut} onClick={handleCheckout}>
              {checkingOut ? 'Procesando…' : 'Pagar'}
            </button>
            <Link to="/" className="cart-continue-link">Seguir comprando</Link>
          </div>
        </div>
      )}
    </div>
  )
}
