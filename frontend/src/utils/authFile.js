import axios from 'axios';

// Los archivos de recetas ya no son públicos (requieren sesión), así que un <a href>
// normal no sirve: el navegador no manda el header de autorización en una navegación
// directa. En su lugar, se piden como blob (con el token) y se abren desde ahí.
//
// La pestaña se abre en blanco de forma SÍNCRONA (dentro del propio click) y luego se
// le asigna la URL del blob cuando llega — si se espera a tener el blob antes de llamar
// a window.open, los navegadores lo tratan como un pop-up no solicitado y lo bloquean,
// porque ya no está "atado" al gesto del usuario.
export async function openAuthenticatedFile(url) {
  const tab = window.open('', '_blank');
  try {
    const token = localStorage.getItem('access_token');
    const res = await axios.get(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
    });
    const blobUrl = URL.createObjectURL(res.data);
    if (tab) {
      tab.location.href = blobUrl;
    } else {
      // El navegador bloqueó incluso la pestaña en blanco (bloqueador de pop-ups activo).
      window.location.href = blobUrl;
    }
  } catch (e) {
    if (tab) tab.close();
    throw e;
  }
}
