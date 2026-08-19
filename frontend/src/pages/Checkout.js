import React from 'react';
import axios from 'axios';

export default function Checkout(){
  const handleBuy = async () => {
    try{
      const token = localStorage.getItem('access_token');
      const items = [{ product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }]; // ajustar product_id real
      const resp = await axios.post('/payments/checkout-order', { items, success_url: window.location.href + 'success', cancel_url: window.location.href + 'cancel' }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const url = resp.data.checkout_url;
      if(url) window.location.href = url;
    }catch(e){
      alert('Error creating checkout session')
    }
  }
  return (
    <div>
      <h2>Checkout Demo</h2>
      <button onClick={handleBuy}>Pagar $5.00</button>
    </div>
  )
}
