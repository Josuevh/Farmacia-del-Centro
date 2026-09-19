import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { UserContext } from './UserContext';

export const CartContext = createContext({ cartCount: 0, refreshCart: () => {} });

export function CartProvider({ children }){
  const { user } = useContext(UserContext);
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setCartCount(0); return; }
    try{
      const resp = await axios.get('/cart/', { headers: { Authorization: `Bearer ${token}` } });
      const count = (resp.data.items || []).reduce((sum, it) => sum + it.quantity, 0);
      setCartCount(count);
    }catch(e){ setCartCount(0); }
  }, []);

  useEffect(() => {
    if (user) refreshCart();
    else setCartCount(0);
  }, [user, refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}
