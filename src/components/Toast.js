'use client';

import Icon from '@/components/Icon';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext({
  addToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div style={{ fontSize: '1.25rem' }}>
              {toast.type === 'success' && <Icon name="check" />}
              {toast.type === 'error' && <Icon name="close" />}
              {toast.type === 'warning' && <Icon name="alert" />}
              {toast.type === 'info' && <Icon name="info" />}
            </div>
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn-ghost"
              style={{ border: 'none', padding: '0 4px', fontSize: '1rem', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
