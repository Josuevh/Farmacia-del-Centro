import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext({});

export function UserProvider({ children }){
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    async function fetchMe(){
      if(!token){ setLoading(false); return }
      try{
        const resp = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        setUser(resp.data);
        localStorage.setItem('user_role', resp.data.role);
      }catch(e){
        setUser(null);
        setToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
      }finally{ setLoading(false) }
    }
    fetchMe();
  }, [token]);

  const login = async (email, password) =>{
    const resp = await axios.post('/auth/login', { email, password });
    const t = resp.data.access_token;
    setToken(t);
    localStorage.setItem('access_token', t);
    // fetch user info
    const me = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } });
    setUser(me.data);
    localStorage.setItem('user_role', me.data.role);
    return me.data;
  };

  const logout = () =>{
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
  };

  return (
    <UserContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}
