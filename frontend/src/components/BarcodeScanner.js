import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onDetected, onClose }){
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let stopped = false;

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current,
      (result, err) => {
        if (stopped) return;
        if (result) {
          stopped = true;
          onDetected(result.getText());
        }
      }
    ).catch(() => {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    });

    return () => {
      stopped = true;
      try { reader.reset(); } catch (e) {}
    };
  }, [onDetected]);

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={e => e.stopPropagation()}>
        <div className="scanner-header">
          <strong>Escanear código de barras</strong>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {error ? (
          <div className="scanner-error">{error}</div>
        ) : (
          <>
            <video ref={videoRef} className="scanner-video" muted playsInline />
            <p className="scanner-hint">Apunta la cámara al código de barras del producto.</p>
          </>
        )}
      </div>
    </div>
  )
}
