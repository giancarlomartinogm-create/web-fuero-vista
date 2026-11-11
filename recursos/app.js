// Fuero de Serie · interfaz: menú, cabecera, apariciones, titulares por palabra, clips, movimiento y formulario.
const raiz = document.documentElement;
raiz.classList.add('js');

// Movimiento: respeta prefers-reduced-motion y la preferencia guardada del botón «Pausar movimiento»
const KEY = 'fuero-movimiento';
const prefiereQuieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
let guardado = null;
try { guardado = localStorage.getItem(KEY); } catch {}
const aplicarMovimiento = quieto => {
  raiz.classList.toggle('quieto', quieto);
  document.querySelectorAll('.boton-movimiento').forEach(b => {
    b.textContent = quieto ? 'Activar movimiento' : 'Pausar movimiento';
    b.setAttribute('aria-pressed', String(quieto));
  });
};
aplicarMovimiento(guardado ? guardado === 'quieto' : prefiereQuieto);
document.querySelectorAll('.boton-movimiento').forEach(b => b.addEventListener('click', () => {
  const quieto = !raiz.classList.contains('quieto');
  aplicarMovimiento(quieto);
  try { localStorage.setItem(KEY, quieto ? 'quieto' : 'movimiento'); } catch {}
  if (quieto) document.querySelectorAll('.clip video').forEach(v => v.pause());
}));

// Menú
const cabecera = document.querySelector('.cabecera');
const boton = document.querySelector('.menu-boton');
boton?.addEventListener('click', () => {
  const abierto = document.body.classList.toggle('menu-abierto');
  boton.setAttribute('aria-expanded', String(abierto));
  boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) { boton.click(); boton.focus(); }
});
const fondo = () => cabecera?.classList.toggle('con-fondo', scrollY > 20 || document.body.classList.contains('menu-abierto'));
addEventListener('scroll', fondo, { passive: true }); fondo();
boton?.addEventListener('click', fondo);

// Titular principal: entra palabra por palabra (el texto completo queda para lectores de pantalla)
document.querySelectorAll('[data-palabras]').forEach(h => {
  const texto = h.textContent.trim();
  h.setAttribute('aria-label', texto);
  h.innerHTML = texto.split(/\s+/).map((p, i) => `<span class="palabra" aria-hidden="true"><span style="--i:${i}">${p}</span></span>`).join(' ');
});
requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('listo')));

// Apariciones
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.aparece').forEach(el => io.observe(el));

// Clips: se reproducen una vez al entrar (≥60 %), quedan en el último cuadro y ofrecen «Repetir». Uno a la vez.
const clips = [...document.querySelectorAll('.clip')];
const vio = new IntersectionObserver(es => es.forEach(e => {
  const clip = e.target, v = clip.querySelector('video');
  if (e.intersectionRatio >= 0.6 && !clip.dataset.visto && !raiz.classList.contains('quieto')) {
    clip.dataset.visto = '1';
    clips.forEach(o => o !== clip && o.querySelector('video').pause());
    v.play().catch(() => clip.classList.add('detenido'));
  }
}), { threshold: [0, 0.6] });
clips.forEach(clip => {
  const v = clip.querySelector('video'), r = clip.querySelector('.repetir');
  v.addEventListener('ended', () => clip.classList.add('terminado'));
  r.addEventListener('click', () => {
    clips.forEach(o => o !== clip && o.querySelector('video').pause());
    clip.classList.remove('terminado', 'detenido'); v.currentTime = 0; v.play();
  });
  if (raiz.classList.contains('quieto')) clip.classList.add('detenido');
  vio.observe(clip);
});

// Formulario de contacto: valida en el navegador. El envío no está conectado todavía (falta el canal real),
// así que nunca muestra una confirmación falsa.
const form = document.querySelector('#form-contacto');
if (form) {
  const param = new URLSearchParams(location.search).get('servicio');
  if (param) { const s = form.querySelector('#servicio'); const o = [...s.options].find(o => o.dataset.clave === param); if (o) s.value = o.value; }
  const mensajes = { requerido: 'Completa este campo para continuar.', correo: 'Revisa que el correo esté escrito correctamente.' };
  const validar = c => {
    let m = '';
    if (c.required && !c.value.trim()) m = mensajes.requerido;
    else if (c.type === 'email' && c.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.value)) m = mensajes.correo;
    c.setAttribute('aria-invalid', m ? 'true' : 'false');
    const e = document.getElementById(c.id + '-error'); if (e) e.textContent = m;
    return !m;
  };
  form.querySelectorAll('input, select, textarea').forEach(c => c.addEventListener('blur', () => c.value && validar(c)));
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const campos = [...form.querySelectorAll('input, select, textarea')];
    const malos = campos.filter(c => !validar(c));
    if (malos.length) { malos[0].focus(); return; }
    const aviso = form.querySelector('.aviso');
    aviso.hidden = false; aviso.focus();
  });
}
