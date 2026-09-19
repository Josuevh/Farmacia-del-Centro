import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext({ showToast: () => {} });

export function useToast(){
  return useContext(ToastContext);
}

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, message, type }]);
    const duration = Math.min(3200 + message.length * 40, 9000);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            {t.type === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
            {t.type === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
