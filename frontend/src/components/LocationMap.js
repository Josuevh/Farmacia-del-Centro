import React from 'react';

const ADDRESS = 'Paseo Alejandro Cervantes Delgado, Universal, 39080 Chilpancingo de los Bravo, Gro.';
const ENCODED_ADDRESS = encodeURIComponent(ADDRESS);

export default function LocationMap(){
  return (
    <div className="location-section">
      <div className="location-info">
        <span className="location-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3c3 3.5 6 7.7 6 11a6 6 0 11-12 0c0-3.3 3-7.5 6-11z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="12" cy="13" r="2.3" stroke="currentColor" strokeWidth="1.7" fill="none"/></svg>
        </span>
        <strong>{ADDRESS}</strong>
        <span className="location-note">Recoge tu pedido en este punto una vez que esté listo.</span>
        <span className="location-detail">Horario: 10:00 a.m. – 9:00 p.m.</span>
        <a href="tel:+527476889254" className="location-detail location-phone">747 688 9254</a>
        <a
          className="btn btn-outline btn-sm location-directions-btn"
          href={`https://www.google.com/maps/dir/?api=1&destination=${ENCODED_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Cómo llegar
        </a>
      </div>
      <div className="location-map">
        <iframe
          title="Ubicación de Farmacia del Centro Chilpancingo"
          src={`https://www.google.com/maps?q=${ENCODED_ADDRESS}&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}
