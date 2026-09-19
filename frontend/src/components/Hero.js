import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BADGES = [
  {
    label: 'Listo el mismo día',
    icon: <path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  },
  {
    label: 'Pago 100% seguro',
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    label: 'Productos originales',
    icon: <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  },
];

export default function Hero({ onShopClick, onExploreClick }){
  const navigate = useNavigate();

  const SLIDES = [
    {
      title: <>Tu farmacia online de <em>confianza</em></>,
      subtitle: 'Pide tus medicinas, encuentra productos de bienestar y recógelos en tienda cuando gustes, sin filas ni esperas.',
      primary: { label: 'Ver productos', onClick: onShopClick },
      secondary: { label: 'Explorar categorías', onClick: onExploreClick },
    },
    {
      title: <>Sube tu receta, <em>nosotros la revisamos</em></>,
      subtitle: 'Un farmacéutico certificado aprueba tu receta antes de completar tu compra de medicamentos controlados.',
      primary: { label: 'Subir mi receta', onClick: () => navigate('/prescriptions') },
      secondary: { label: 'Ver productos', onClick: onShopClick },
    },
    {
      title: <>¿Tienes dudas? <em>Chatea con nosotros</em></>,
      subtitle: 'Resuelve tus preguntas al instante con nuestro equipo, sin salir de la página.',
      primary: { label: 'Ver productos', onClick: onShopClick },
      secondary: { label: 'Explorar categorías', onClick: onExploreClick },
    },
  ];

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(timerRef.current);
  }, [paused, SLIDES.length]);

  const goTo = (i) => setSlide((i + SLIDES.length) % SLIDES.length);
  const current = SLIDES[slide];

  return (
    <section
      className="hero-banner anim-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button className="hero-arrow hero-arrow-prev" aria-label="Anterior" onClick={() => goTo(slide - 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button className="hero-arrow hero-arrow-next" aria-label="Siguiente" onClick={() => goTo(slide + 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div className="hero-banner-content">
        <h1 className="hero-banner-title" key={`title-${slide}`}>{current.title}</h1>
        <p className="hero-banner-subtitle" key={`sub-${slide}`}>{current.subtitle}</p>

        <div className="hero-banner-badges">
          {BADGES.map(b => (
            <span className="hero-banner-badge" key={b.label}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">{b.icon}</svg>
              {b.label}
            </span>
          ))}
        </div>

        <div className="hero-banner-actions">
          <button className="btn btn-lime" onClick={current.primary.onClick}>{current.primary.label}</button>
          <button className="btn btn-hero-outline-v2" onClick={current.secondary.onClick}>{current.secondary.label}</button>
        </div>
      </div>

      <div className="hero-banner-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={"hero-v2-dot" + (i === slide ? ' active' : '')}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  )
}
