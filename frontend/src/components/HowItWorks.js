import React from 'react';

const STEPS = [
  { n: '01', title: 'Explora el catálogo', desc: 'Busca por categoría o usa el buscador para encontrar lo que necesitas.' },
  { n: '02', title: 'Agrega al carrito', desc: 'Elige tus productos y revisa cantidades y precios antes de pagar.' },
  { n: '03', title: 'Sube tu receta si aplica', desc: 'Para medicamentos que la requieren, un farmacéutico la revisa y aprueba.' },
  { n: '04', title: 'Recoge en tienda', desc: 'Te avisamos cuando esté listo. Paga en línea de forma segura con Stripe y recoge con tu código.' },
];

export default function HowItWorks(){
  return (
    <div className="how-it-works">
      {STEPS.map(s => (
        <div className="how-step" key={s.n}>
          <span className="how-step-number">{s.n}</span>
          <div className="how-step-body">
            <strong>{s.title}</strong>
            <span>{s.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
