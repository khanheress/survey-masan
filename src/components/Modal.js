'use client';

import Icon from '@/components/Icon';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: '480px',
    md: '640px',
    lg: '800px',
  };

  const modalContent = (
    <div className="modal-overlay" aria-label="Đóng" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ width: sizeClasses[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
          <button className="btn-icon btn-ghost" aria-label="Đóng" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
