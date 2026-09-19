import React, {useContext, useEffect, useState, useMemo, useRef} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Hero from '../components/Hero';
import CategoryStrip from '../components/CategoryStrip';
import FeaturedBanners from '../components/FeaturedBanners';
import BenefitsStrip from '../components/BenefitsStrip';
import HowItWorks from '../components/HowItWorks';
import LocationMap from '../components/LocationMap';
import { useToast } from '../components/Toast';
import { CartContext } from '../context/CartContext';

export default function Products(){
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [activeLabel, setActiveLabel] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [prescriptionFilter, setPrescriptionFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const catalogRef = useRef(null);
  const categoryRef = useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { refreshCart } = useContext(CartContext);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q');
    const barcode = searchParams.get('barcode');
    if (barcode) {
      setActiveCategoryId('');
      setActiveTerm('');
      setActiveLabel('');
      setSearch('');
      setBarcodeQuery(barcode);
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (q) {
      setActiveCategoryId('');
      setActiveTerm('');
      setActiveLabel('');
      setBarcodeQuery('');
      setSearch(q);
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  useEffect(()=>{
    axios.get('/products/')
      .then(r=>setItems(r.data))
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false))
    axios.get('/categories/')
      .then(r=>setCategories(r.data))
      .catch(()=>setCategories([]))
  },[])

  const addToCart = async (id) => {
    const token = localStorage.getItem('access_token');
    if(!token){
      showToast('Inicia sesión para agregar productos al carrito', 'error');
      navigate('/login');
      return;
    }
    setAddingId(id);
    try{
      await axios.post('/cart/add', { product_id: id, quantity: 1 }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setAddedId(id);
      refreshCart();
      setTimeout(()=>setAddedId(null), 1600);
    }catch(e){ showToast('No se pudo añadir al carrito', 'error') }
    finally{ setAddingId(null) }
  }

  const query = search.trim().toLowerCase();

  // Matches by free-text search or "destacados" term, ignoring category — used both
  // as the base for the category facet counts and as input to the category filter itself.
  const textFiltered = useMemo(() => {
    const t = query || activeTerm.toLowerCase();
    if (!t) return items;
    return items.filter(p =>
      p.name.toLowerCase().includes(t) ||
      (p.description || '').toLowerCase().includes(t) ||
      (p.barcode || '').includes(t)
    );
  }, [items, query, activeTerm]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const p of textFiltered) {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    }
    return counts;
  }, [textFiltered]);

  const filteredItems = useMemo(() => {
    if (barcodeQuery) {
      const code = barcodeQuery.trim();
      return items.filter(p => p.barcode && p.barcode === code);
    }

    let result = query ? textFiltered : (activeCategoryId ? items.filter(p => p.category_id === activeCategoryId) : textFiltered);

    if (prescriptionFilter === 'yes') result = result.filter(p => p.requires_prescription);
    if (prescriptionFilter === 'no') result = result.filter(p => !p.requires_prescription);

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min)) result = result.filter(p => Number(p.price) >= min);
    if (!isNaN(max)) result = result.filter(p => Number(p.price) <= max);

    result = [...result];
    if (sortBy === 'price-asc') result.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price-desc') result.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [items, textFiltered, query, activeCategoryId, barcodeQuery, prescriptionFilter, minPrice, maxPrice, sortBy]);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const scrollToCategories = () => {
    categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const clearFilters = () => {
    setActiveCategoryId('');
    setActiveTerm('');
    setActiveLabel('');
    setSearch('');
    setBarcodeQuery('');
    setPrescriptionFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('relevance');
  }

  const selectCategoryId = (id, name) => {
    clearFilters();
    if (id) {
      setActiveCategoryId(id);
      setActiveLabel(name);
    }
    scrollToCatalog();
  }

  const selectTerm = (term, label = term) => {
    clearFilters();
    if (term) {
      setActiveTerm(term);
      setActiveLabel(label);
    }
    scrollToCatalog();
  }

  return (
    <div>
      <Hero onShopClick={scrollToCatalog} onExploreClick={scrollToCategories} />

      <BenefitsStrip />

      <div className="section-header" ref={categoryRef}>
        <h2>Comprar por categoría</h2>
      </div>
      <CategoryStrip categories={categories} active={activeCategoryId} onSelect={selectCategoryId} />

      <div className="section-header">
        <h2>Destacados para ti</h2>
      </div>
      <FeaturedBanners onSelect={selectTerm} />

      <div className="section-header">
        <h2>Cómo funciona</h2>
      </div>
      <HowItWorks />

      <div className="section-header">
        <h2>Visítanos</h2>
      </div>
      <LocationMap />

      <div className="catalog-header" ref={catalogRef}>
        <div>
          <span className="results-breadcrumb">Inicio {(activeLabel || query || barcodeQuery) && <>/ {activeLabel || query || `código ${barcodeQuery}`}</>}</span>
          <h2>{barcodeQuery ? `Resultado para el código ${barcodeQuery}` : activeLabel || (query ? `Resultados para "${query}"` : 'Nuestros productos')}</h2>
        </div>
        {(search || activeLabel || barcodeQuery || prescriptionFilter !== 'all' || minPrice || maxPrice || sortBy !== 'relevance') && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>Limpiar filtros</button>
        )}
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <h3>No hay productos disponibles</h3>
          <p>Vuelve a intentarlo más tarde.</p>
        </div>
      ) : (
        <div className="results-layout">
          <aside className="results-sidebar">
            <div className="results-filter-group">
              <h4>Categoría</h4>
              {categories.map(cat => (
                <label className="results-filter-checkbox" key={cat.id}>
                  <input
                    type="checkbox"
                    checked={activeCategoryId === cat.id}
                    onChange={() => selectCategoryId(activeCategoryId === cat.id ? '' : cat.id, cat.name)}
                  />
                  <span>{cat.name}</span>
                  <span className="results-filter-count">{categoryCounts[cat.id] || 0}</span>
                </label>
              ))}
            </div>

            <div className="results-filter-group">
              <h4>Receta</h4>
              <label className="results-filter-checkbox">
                <input type="radio" name="presc" checked={prescriptionFilter === 'all'} onChange={() => setPrescriptionFilter('all')} />
                <span>Todos</span>
              </label>
              <label className="results-filter-checkbox">
                <input type="radio" name="presc" checked={prescriptionFilter === 'no'} onChange={() => setPrescriptionFilter('no')} />
                <span>Sin receta</span>
              </label>
              <label className="results-filter-checkbox">
                <input type="radio" name="presc" checked={prescriptionFilter === 'yes'} onChange={() => setPrescriptionFilter('yes')} />
                <span>Requiere receta</span>
              </label>
            </div>

            <div className="results-filter-group">
              <h4>Precio</h4>
              <div className="results-price-inputs">
                <input
                  type="number" min="0" placeholder="Mín" className="input"
                  value={minPrice} onChange={e => setMinPrice(e.target.value)}
                />
                <span>—</span>
                <input
                  type="number" min="0" placeholder="Máx" className="input"
                  value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </aside>

          <div className="results-main">
            <div className="results-toolbar">
              <span>{filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}</span>
              <label className="results-sort">
                Ordenar por:
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="relevance">Más relevante</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name-asc">Nombre A-Z</option>
                </select>
              </label>
            </div>

            {filteredItems.length === 0 ? (
              <div className="empty-state card">
                <h3>Sin resultados</h3>
                <p>{barcodeQuery
                  ? `No encontramos ningún producto con el código ${barcodeQuery} en nuestro catálogo.`
                  : 'No encontramos productos con estos filtros. Prueba ajustando la búsqueda o los filtros.'}</p>
              </div>
            ) : (
              <div className="product-grid">
                {filteredItems.map((p, i)=> (
                  <div key={p.id} className="card product-card anim-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
                    <div className="product-thumb">
                      {p.requires_prescription && <span className="product-thumb-badge">Requiere receta</span>}
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 20.5L4 14a4.95 4.95 0 117-7l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M13.5 3.5L20 10a4.95 4.95 0 11-7 7l-1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 12l6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="product-body">
                      <h3 className="product-name">{p.name}</h3>
                      {p.description && <p className="product-desc">{p.description}</p>}
                    </div>
                    <div className="product-footer">
                      <span className="product-price">${Number(p.price).toFixed(2)}</span>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={addingId === p.id}
                        onClick={()=>addToCart(p.id)}
                      >
                        {addedId === p.id ? 'Añadido ✓' : addingId === p.id ? 'Agregando…' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
