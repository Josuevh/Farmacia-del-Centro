import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function Cart(){
  const [cart, setCart] = useState({items: [], total_amount: 0});

  async function fetchCart(){
    try{
      const token = localStorage.getItem('access_token');
      const resp = await axios.get('/cart/', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setCart(resp.data);
    }catch(e){
      setCart({items: [], total_amount: 0});
    }
  }

  useEffect(()=>{ fetchCart(); },[]);

  const handleCheckout = async () => {
    const token = localStorage.getItem('access_token');
    if(!token){ alert('Necesitas iniciar sesión para pagar'); return }
    // call checkout-order with items
    try{
      const resp = await axios.post('/payments/checkout-order', { items: cart.items.map(i=>({ product_id: i.product_id, quantity: i.quantity })) }, { headers: { Authorization: `Bearer ${token}` } });
      if(resp.data.checkout_url) window.location.href = resp.data.checkout_url;
    }catch(e){ alert('Error al iniciar checkout') }
  }

  return (
    <div>
      <h2>Carrito</h2>
      <ul>
        {cart.items.map((it)=> <li key={it.product_id}>{it.product_id} — {it.quantity} — ${it.total_price}</li>)}
      </ul>
      <div>Total: ${cart.total_amount}</div>
      <button onClick={handleCheckout}>Pagar</button>
    </div>
  )
}
