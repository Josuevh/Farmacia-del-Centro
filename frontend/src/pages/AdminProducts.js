import React, {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';
import BarcodeScanner from '../components/BarcodeScanner';

const LOW_STOCK_THRESHOLD = 10;

const emptyForm = { name: '', sku: '', barcode: '', description: '', category_id: '', price: '', requires_prescription: false, initial_quantity: 0 };

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminProducts(){
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stockEditId, setStockEditId] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const { showToast } = useToast();

  const categoryName = (id) => categories.find(c => c.id === id)?.name || '—';

  const stats = useMemo(() => {
    const lowStock = products.filter(p => (inventory[p.id]?.available ?? 0) < LOW_STOCK_THRESHOLD).length;
    const prescriptionCount = products.filter(p => p.requires_prescription).length;
    return { total: products.length, lowStock, prescriptionCount };
  }, [products, inventory]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  async function loadAll(){
    setLoading(true);
    try{
      const [pRes, cRes, iRes] = await Promise.all([
        axios.get('/products/'),
        axios.get('/categories/'),
        axios.get('/inventory/', { headers: authHeaders() }),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      const invMap = {};
      iRes.data.forEach(row => { invMap[row.product_id] = row; });
      setInventory(invMap);
    }catch(e){
      showToast('No se pudo cargar el catálogo', 'error');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ loadAll(); },[]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || '',
      barcode: p.barcode || '',
      description: p.description || '',
      category_id: p.category_id || '',
      price: p.price,
      requires_prescription: p.requires_prescription,
      initial_quantity: inventory[p.id]?.quantity ?? 0,
    });
    setShowForm(true);
  }

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      description: form.description || null,
      category_id: form.category_id || null,
      price: Number(form.price),
      requires_prescription: !!form.requires_prescription,
      initial_quantity: Number(form.initial_quantity) || 0,
    };
    try{
      if (editingId) {
        await axios.put(`/products/${editingId}`, payload, { headers: authHeaders() });
        showToast('Producto actualizado', 'success');
      } else {
        await axios.post('/products/', payload, { headers: authHeaders() });
        showToast('Producto creado', 'success');
      }
      closeForm();
      await loadAll();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo guardar el producto', 'error');
    }finally{
      setSaving(false);
    }
  }

  const deleteProduct = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    try{
      await axios.delete(`/products/${p.id}`, { headers: authHeaders() });
      showToast('Producto eliminado', 'success');
      await loadAll();
    }catch(e){
      showToast('No se pudo eliminar el producto', 'error');
    }
  }

  const openStockEdit = (p) => {
    setStockEditId(p.id);
    setStockValue(String(inventory[p.id]?.quantity ?? 0));
  }

  const saveStock = async (productId) => {
    try{
      await axios.patch(`/inventory/${productId}`, { quantity: Number(stockValue) }, { headers: authHeaders() });
      showToast('Stock actualizado', 'success');
      setStockEditId(null);
      await loadAll();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo actualizar el stock', 'error');
    }
  }

  const createCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try{
      await axios.post('/categories/', { name: newCategoryName.trim() }, { headers: authHeaders() });
      showToast('Categoría creada', 'success');
      setNewCategoryName('');
      await loadAll();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo crear la categoría', 'error');
    }finally{
      setSavingCategory(false);
    }
  }

  const deleteCategory = async (c) => {
    const inUse = products.some(p => p.category_id === c.id);
    const msg = inUse
      ? `"${c.name}" tiene productos asignados. Si la eliminas, esos productos quedarán sin categoría. ¿Continuar?`
      : `¿Eliminar la categoría "${c.name}"?`;
    if (!window.confirm(msg)) return;
    try{
      await axios.delete(`/categories/${c.id}`, { headers: authHeaders() });
      showToast('Categoría eliminada', 'success');
      await loadAll();
    }catch(e){
      showToast('No se pudo eliminar la categoría', 'error');
    }
  }

  const downloadImportTemplate = async () => {
    try{
      const resp = await axios.get('/products/import/template', { headers: authHeaders(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_catalogo.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }catch(e){
      showToast('No se pudo descargar la plantilla', 'error');
    }
  }

  const openImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setShowImport(true);
  }

  const closeImport = () => {
    setShowImport(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  }

  const previewImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportResult(null);
    try{
      const formData = new FormData();
      formData.append('file', importFile);
      const resp = await axios.post('/products/import?dry_run=true', formData, { headers: authHeaders() });
      setImportPreview(resp.data);
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo leer el archivo', 'error');
      setImportPreview(null);
    }finally{
      setImportBusy(false);
    }
  }

  const confirmImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    try{
      const formData = new FormData();
      formData.append('file', importFile);
      const resp = await axios.post('/products/import?dry_run=false', formData, { headers: authHeaders() });
      setImportResult(resp.data);
      setImportPreview(null);
      showToast('Catálogo importado', 'success');
      await loadAll();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo aplicar la importación', 'error');
    }finally{
      setImportBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Productos</h2>
          <p>Gestión de productos e inventario</p>
        </div>
        <div className="row-actions">
          <button className="btn btn-outline btn-sm" onClick={()=>setShowCategories(s=>!s)}>
            {showCategories ? 'Ocultar categorías' : 'Gestionar categorías'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={openImport}>Importar catálogo</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Agregar producto</button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="card stat-card">
          <span className="stat-card-icon stat-card-icon-neutral">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <div>
            <strong>{stats.total}</strong>
            <span>Productos en catálogo</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-card-icon stat-card-icon-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L14.7 3.86a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <div>
            <strong>{stats.lowStock}</strong>
            <span>Con stock bajo (&lt;{LOW_STOCK_THRESHOLD})</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-card-icon stat-card-icon-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </span>
          <div>
            <strong>{stats.prescriptionCount}</strong>
            <span>Requieren receta</span>
          </div>
        </div>
      </div>

      {showCategories && (
        <div className="card category-manager-card">
          <h3>Categorías</h3>
          <div className="category-chip-list">
            {categories.length === 0 && <span className="field-hint">Aún no hay categorías.</span>}
            {categories.map(c => (
              <span className="category-chip" key={c.id}>
                {c.name}
                <button type="button" aria-label={`Eliminar ${c.name}`} onClick={()=>deleteCategory(c)}>×</button>
              </span>
            ))}
          </div>
          <form className="category-add-form" onSubmit={createCategory}>
            <input
              className="input"
              placeholder="Nombre de la nueva categoría"
              value={newCategoryName}
              onChange={e=>setNewCategoryName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingCategory}>
              {savingCategory ? 'Agregando…' : 'Agregar'}
            </button>
          </form>
        </div>
      )}

      {showImport && (
        <div className="scanner-overlay" onClick={closeImport}>
          <div className="import-modal" onClick={e=>e.stopPropagation()}>
            <div className="scanner-header">
              <strong>Importar catálogo desde Excel/CSV</strong>
              <button type="button" className="scanner-close" onClick={closeImport} aria-label="Cerrar">✕</button>
            </div>

            <p className="field-hint">
              Sube un archivo .xlsx o .csv con tu catálogo (usa los encabezados de la plantilla:
              nombre, sku, codigo_barras, precio, categoria, requiere_receta, stock, descripcion).
              Los productos que coincidan por SKU, código de barras o nombre se actualizan;
              el resto se crea como producto nuevo.
            </p>
            <button type="button" className="btn btn-outline btn-sm" onClick={downloadImportTemplate}>
              Descargar plantilla
            </button>

            <div className="import-file-row">
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={e => { setImportFile(e.target.files[0] || null); setImportPreview(null); setImportResult(null); }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!importFile || importBusy}
                onClick={previewImport}
              >
                {importBusy ? 'Leyendo…' : 'Vista previa'}
              </button>
            </div>

            {importPreview && (
              <>
                <div className="import-summary">
                  <span className="badge badge-success">{importPreview.rows.filter(r=>r.action==='create').length} nuevos</span>
                  <span className="badge badge-info">{importPreview.rows.filter(r=>r.action==='update').length} a actualizar</span>
                  <span className="badge badge-neutral">{importPreview.rows.filter(r=>r.action==='sin_cambios').length} sin cambios</span>
                  {importPreview.rows.some(r=>r.action==='error') && (
                    <span className="badge badge-danger">{importPreview.rows.filter(r=>r.action==='error').length} con error</span>
                  )}
                </div>
                <div className="table-wrap import-preview-table">
                  <table>
                    <thead><tr><th>Fila</th><th>Producto</th><th>Acción</th><th>Detalle</th></tr></thead>
                    <tbody>
                      {importPreview.rows.map(r => (
                        <tr key={r.row}>
                          <td className="mono">{r.row}</td>
                          <td>{r.name || '—'}</td>
                          <td>
                            {r.action === 'create' && <span className="badge badge-success">Nuevo</span>}
                            {r.action === 'update' && <span className="badge badge-info">Actualizar</span>}
                            {r.action === 'sin_cambios' && <span className="badge badge-neutral">Sin cambios</span>}
                            {r.action === 'error' && <span className="badge badge-danger">Error</span>}
                          </td>
                          <td>
                            {r.action === 'error' && r.error}
                            {r.action === 'update' && Object.entries(r.changes || {}).map(([k,v]) => <div key={k}>{k}: {v}</div>)}
                            {r.action === 'create' && r.category_note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={closeImport}>Cancelar</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={importBusy || importPreview.rows.every(r => r.action === 'error' || r.action === 'sin_cambios')}
                    onClick={confirmImport}
                  >
                    {importBusy ? 'Aplicando…' : 'Confirmar importación'}
                  </button>
                </div>
              </>
            )}

            {importResult && (
              <div className="alert alert-success" style={{marginTop: 16}}>
                Importación aplicada: {importResult.rows.filter(r=>r.action==='create').length} productos nuevos,{' '}
                {importResult.rows.filter(r=>r.action==='update').length} actualizados
                {importResult.categories_created.length > 0 && <> · categorías nuevas: {importResult.categories_created.join(', ')}</>}.
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card product-form-card">
          <h3>{editingId ? 'Editar producto' : 'Nuevo producto'}</h3>
          <form onSubmit={submitForm}>
            <div className="form-grid">
              <div className="field">
                <label>Nombre</label>
                <input className="input" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
              </div>
              <div className="field">
                <label>SKU</label>
                <input className="input" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} />
              </div>
              <div className="field">
                <label>Código de barras</label>
                <div className="barcode-field-row">
                  <input className="input" value={form.barcode} onChange={e=>setForm({...form, barcode: e.target.value})} placeholder="Ej. 7501234567890" />
                  <button type="button" className="btn btn-outline btn-sm" onClick={()=>setScannerOpen(true)}>Escanear</button>
                </div>
              </div>
              <div className="field">
                <label>Categoría</label>
                <select className="input" value={form.category_id} onChange={e=>setForm({...form, category_id: e.target.value})}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Precio</label>
                <input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={e=>setForm({...form, price: e.target.value})} />
              </div>
              <div className="field">
                <label>{editingId ? 'Stock actual' : 'Stock inicial'}</label>
                <input className="input" type="number" min="0" disabled={!!editingId} value={form.initial_quantity} onChange={e=>setForm({...form, initial_quantity: e.target.value})} />
                {editingId && <span className="field-hint">Ajusta el stock desde la tabla</span>}
              </div>
              <div className="field field-checkbox">
                <label>
                  <input type="checkbox" checked={form.requires_prescription} onChange={e=>setForm({...form, requires_prescription: e.target.checked})} />
                  {' '}Requiere receta médica
                </label>
              </div>
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea className="input" rows={2} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={closeForm}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onDetected={(code) => { setForm(f => ({...f, barcode: code})); setScannerOpen(false); showToast('Código escaneado', 'success'); }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state card"><h3>Sin productos</h3><p>Agrega tu primer producto para comenzar.</p></div>
      ) : (
        <>
          <div className="search-box admin-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input
              className="search-input"
              placeholder="Buscar por nombre o SKU"
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state card"><h3>Sin resultados</h3><p>Ningún producto coincide con "{search}".</p></div>
          ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Receta</th><th></th></tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="table-row-name">
                      <span className="table-row-thumb">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.5 20.5L4 14a4.95 4.95 0 117-7l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13.5 3.5L20 10a4.95 4.95 0 11-7 7l-1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 12l6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </span>
                      <div>
                        <strong>{p.name}</strong>
                        {p.sku && <div className="mono">{p.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{categoryName(p.category_id)}</td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>
                    {stockEditId === p.id ? (
                      <span className="stock-edit">
                        <input className="input stock-input" type="number" min="0" value={stockValue} onChange={e=>setStockValue(e.target.value)} />
                        <button className="btn btn-primary btn-sm" onClick={()=>saveStock(p.id)}>Guardar</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>setStockEditId(null)}>Cancelar</button>
                      </span>
                    ) : (
                      <button className="link stock-value" onClick={()=>openStockEdit(p)}>
                        {inventory[p.id]?.available ?? '—'} disponibles
                      </button>
                    )}
                  </td>
                  <td>{p.requires_prescription ? <span className="badge badge-warning">Requiere receta</span> : <span className="badge badge-neutral">No</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={()=>openEdit(p)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>deleteProduct(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  )
}
