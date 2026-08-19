import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function Products(){
  const [items, setItems] = useState([]);
  useEffect(()=>{
    axios.get('/products')
      .then(r=>setItems(r.data))
      .catch(()=>setItems([]))
  },[])
  const addToCart = async (id) => {
    const token = localStorage.getItem('access_token');
    try{
      await axios.post('/cart/add', { product_id: id, quantity: 1 }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      alert('Añadido al carrito');
    }catch(e){ alert('No se pudo añadir al carrito') }
  }
  return (
    <div>
      <h2>Productos</h2>
      <ul>
        {items.map(p=> <li key={p.id}>{p.name} — ${p.price} <button onClick={()=>addToCart(p.id)}>Agregar</button></li>)}
      </ul>
    </div>
  )
}
