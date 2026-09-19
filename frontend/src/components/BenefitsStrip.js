import React from 'react';

const ITEMS = [
  {
    title: 'Recoge en tienda',
    text: 'Compra en línea, recógelo cuando gustes.',
    bg: 'var(--color-mint)',
    fg: 'var(--color-primary-dark)',
    icon: <path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M8 13a2 2 0 004 0M12 13a2 2 0 004 0" stroke="var(--color-primary-dark)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    title: 'Pago 100% seguro',
    text: 'Procesado de forma segura con Stripe.',
    bg: 'var(--color-sky)',
    fg: '#0b3a63',
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#0b3a63" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    title: 'Recetas verificadas',
    text: 'Revisadas y aprobadas por un farmacéutico.',
    bg: 'var(--color-lavender)',
    fg: '#4c3b96',
    icon: <><rect x="6" y="4" width="12" height="16" rx="2" stroke="#4c3b96" strokeWidth="1.6" fill="none"/><path d="M9 10l2 2 4-4" stroke="#4c3b96" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>
  },
  {
    title: 'Atención en vivo',
    text: 'Resolvemos tus dudas al instante por chat.',
    bg: 'var(--color-accent-light)',
    fg: '#7a2e0f',
    icon: <path d="M4 4h16v11H8l-4 4V4z" stroke="#7a2e0f" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
];

export default function BenefitsStrip(){
  return (
    <div className="benefits-strip">
      {ITEMS.map((b, i) => (
        <div className="benefit-card anim-in" key={b.title} style={{ animationDelay: `${i * 60}ms` }}>
          <span className="benefit-card-icon" style={{ background: b.bg }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">{b.icon}</svg>
          </span>
          <div className="benefit-card-body">
            <strong>{b.title}</strong>
            <span>{b.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
