import React from 'react';

const BANNERS = [
  {
    title: 'Alivio del dolor',
    text: 'Analgésicos y antiinflamatorios para el día a día.',
    term: 'dolor',
    bg: 'var(--color-accent-light)',
    fg: '#7a2e0f',
    icon: <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="#7a2e0f" strokeWidth="1.8" strokeLinecap="round"/>
  },
  {
    title: 'Vitaminas y bienestar',
    text: 'Suplementos para fortalecer tus defensas.',
    term: 'vitamina',
    bg: 'var(--color-mint-deep)',
    fg: 'var(--color-primary-dark)',
    icon: <path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z" stroke="var(--color-primary-dark)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    title: 'Cuidado digestivo',
    text: 'Soluciones para acidez e hidratación.',
    term: 'estomacal',
    bg: 'var(--color-sky)',
    fg: '#0b3a63',
    icon: <path d="M8 3c0 3-3 4-3 8a7 7 0 0014 0c0-4-3-5-3-8-1 2-2 2-2 0-1 2-2 2-2 0-1 2-2 2-2 0-1 2-2 2-2 0z" stroke="#0b3a63" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
];

export default function FeaturedBanners({ onSelect }){
  return (
    <div className="banner-strip">
      {BANNERS.map((b, i) => (
        <button key={b.title} className="banner-card anim-in" style={{ background: b.bg, color: b.fg, animationDelay: `${i * 70}ms` }} onClick={() => onSelect(b.term, b.title)}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">{b.icon}</svg>
          <div className="banner-card-body">
            <strong>{b.title}</strong>
            <span>{b.text}</span>
          </div>
          <span className="banner-card-cta">
            Ver productos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </button>
      ))}
    </div>
  )
}
