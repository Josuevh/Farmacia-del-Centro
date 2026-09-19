import React, {useState, useContext} from 'react';
import { UserContext } from '../context/UserContext';

export default function Login({onLogin}){
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useContext(UserContext);

  const isRegister = mode === 'register';

  const switchMode = (next) => {
    setMode(next);
    setError('');
  }

  const submit = async (e) =>{
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      if(onLogin) onLogin();
    }catch(e){
      setError(isRegister
        ? (e.response?.data?.detail || 'No se pudo crear la cuenta. ¿Ya tienes una con ese correo?')
        : 'Credenciales incorrectas. Inténtalo de nuevo.');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="card auth-card">
        <div className="auth-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 20.5L4 14a4.95 4.95 0 117-7l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M13.5 3.5L20 10a4.95 4.95 0 11-7 7l-1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 12l6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="auth-mode-toggle">
          <button type="button" className={!isRegister ? 'active' : ''} onClick={()=>switchMode('login')}>Iniciar sesión</button>
          <button type="button" className={isRegister ? 'active' : ''} onClick={()=>switchMode('register')}>Crear cuenta</button>
        </div>

        <h2>{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
        <p className="auth-subtitle">
          {isRegister ? 'Regístrate para comprar y dar seguimiento a tus pedidos.' : 'Accede a tu cuenta de Farmacia del Centro Chilpancingo'}
        </p>
        <form onSubmit={submit}>
          {isRegister && (
            <div className="field">
              <label>Nombre completo</label>
              <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Tu nombre" />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={isRegister ? 8 : undefined} />
            {isRegister && <span className="field-hint">Mínimo 8 caracteres.</span>}
          </div>
          {error && <div className="alert alert-danger" style={{marginBottom: 16}}>{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? (isRegister ? 'Creando cuenta…' : 'Ingresando…') : (isRegister ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? (
            <>¿Ya tienes cuenta? <button type="button" className="link" onClick={()=>switchMode('login')}>Inicia sesión</button></>
          ) : (
            <>¿Aún no tienes cuenta? <button type="button" className="link" onClick={()=>switchMode('register')}>Regístrate</button></>
          )}
        </p>
      </div>
    </div>
  )
}
