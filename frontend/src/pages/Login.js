import React, {useState, useContext} from 'react';
import { UserContext } from '../context/UserContext';

export default function Login({onLogin}){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(UserContext);

  const submit = async (e) =>{
    e.preventDefault();
    try{
      await login(email, password);
      if(onLogin) onLogin();
    }catch(e){
      setError('Login failed');
    }
  }

  return (
    <div>
      <h2>Iniciar sesión</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  )
}
