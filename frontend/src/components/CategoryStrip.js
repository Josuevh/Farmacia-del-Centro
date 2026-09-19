import React from 'react';

const ICON_BY_NAME = {
  'Analgésicos y antiinflamatorios': {
    bg: '#cdf3dd',
    icon: <path d="M9.5 14.5l5-5m-6-1.5a3 3 0 014.24 0l3.26 3.26a3 3 0 01-4.24 4.24L8.5 12.24a3 3 0 010-4.24z" stroke="#0f2f66" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  'Antibióticos': {
    bg: '#ffe6b0',
    icon: <><rect x="9" y="3" width="6" height="18" rx="3" stroke="#0f2f66" strokeWidth="1.7" fill="none"/><path d="M9 12h6" stroke="#0f2f66" strokeWidth="1.7"/></>
  },
  'Vitaminas y suplementos': {
    bg: '#ffd7c2',
    icon: <path d="M12 3c3 3.5 6 7.7 6 11a6 6 0 11-12 0c0-3.3 3-7.5 6-11z" stroke="#0f2f66" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  'Alergias': {
    bg: '#ffd3e0',
    icon: <><circle cx="12" cy="12" r="3" stroke="#0f2f66" strokeWidth="1.6" fill="none"/><path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" stroke="#0f2f66" strokeWidth="1.6" strokeLinecap="round"/></>
  },
  'Primeros auxilios': {
    bg: '#cfe6ff',
    icon: <><rect x="3" y="5" width="18" height="14" rx="3" stroke="#0f2f66" strokeWidth="1.6" fill="none"/><path d="M12 9v6M9 12h6" stroke="#0f2f66" strokeWidth="1.8" strokeLinecap="round"/></>
  },
  'Cuidado digestivo': {
    bg: '#e3ddff',
    icon: <path d="M8 3c0 3-3 4-3 8a7 7 0 0014 0c0-4-3-5-3-8-1 2-2 2-2 0-1 2-2 2-2 0-1 2-2 2-2 0z" stroke="#0f2f66" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
};

const DEFAULT_ICON = {
  bg: '#e2e8f0',
  icon: <path d="M10.5 20.5L4 14a4.95 4.95 0 117-7l1 1M13.5 3.5L20 10a4.95 4.95 0 11-7 7l-1-1M9 12l6 0" stroke="#0f2f66" strokeWidth="1.7" strokeLinecap="round"/>
};

export default function CategoryStrip({ categories, active, onSelect }){
  if (!categories || categories.length === 0) return null;

  return (
    <div className="category-grid">
      {categories.map((cat, i) => {
        const visual = ICON_BY_NAME[cat.name] || DEFAULT_ICON;
        return (
          <button
            key={cat.id}
            className={"category-card anim-in" + (active === cat.id ? ' active' : '')}
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => onSelect(active === cat.id ? '' : cat.id, cat.name)}
          >
            <span className="category-card-icon" style={{ background: visual.bg }}>
              <svg width="30" height="30" viewBox="0 0 24 24">{visual.icon}</svg>
            </span>
            <span className="category-card-label">{cat.name}</span>
          </button>
        );
      })}
    </div>
  )
}
