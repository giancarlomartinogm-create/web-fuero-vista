// Escena 3D de Fuero de Serie: siete folios que siguen la gramática de movimiento de la marca
// (alinear, destacar, conectar, desplegar, resolver). Cada sección .escenario declara su estado en
// data-escena; al hacer scroll la escena interpola entre el estado de la sección actual y el de la siguiente.
import * as THREE from './three.module.min.js';

const AZUL = new THREE.Color('#142B45');
const COBRE = new THREE.Color('#C78355');
const PAPEL = new THREE.Color('#FFFFFF');
const W = 1.5, H = 2.0, D = 0.03, N = 7, COBRE_I = 4;

const raiz = document.documentElement;
const reducido = () => raiz.classList.contains('quieto');

function soportaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

// Textura de folio: papel mate con trazos grabados (arco, retícula, marco) y, en algunos, una pestaña azul.
function texturaFolio(i) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#FAF8F4'; g.fillRect(0, 0, 384, 512);
  g.strokeStyle = 'rgba(20,43,69,0.16)'; g.lineWidth = 2;
  const tipo = i % 4;
  if (tipo === 0) { g.beginPath(); g.arc(250, 300, 120, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.strokeRect(60, 70, 1, 380); }
  if (tipo === 1) { for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(80 + k * 22, 60); g.lineTo(80 + k * 22, 450); g.stroke(); } g.beginPath(); g.moveTo(80, 300); g.lineTo(320, 300); g.stroke(); }
  if (tipo === 2) { g.strokeRect(70, 90, 240, 330); g.beginPath(); g.arc(190, 255, 70, 0, Math.PI * 2); g.stroke(); }
  if (tipo === 3) { g.beginPath(); g.moveTo(60, 420); g.lineTo(60, 120); g.lineTo(220, 120); g.stroke(); g.beginPath(); g.arc(220, 260, 140, -Math.PI / 2, 0); g.stroke(); }
  if (i === 5 || i === 6) { g.fillStyle = '#142B45'; g.fillRect(352, 150, 32, 110); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---- Estados: posición, rotación, escala (x, y), cuánto azul (c) y visibilidad (v) de cada folio ----
const estados = {
  alinear: i => ({
    p: [-1.3 + i * 0.43, 0, 0], r: [0, -1.12, 0],
    s: [i === COBRE_I ? 0.42 : 1, i === COBRE_I ? 0.9 : 1], c: 0, v: 1,
  }),
  destacar: i => {
    const e = estados.alinear(i);
    if (i === 2) { e.p = [-0.55, 0.55, 1.15]; e.r = [-0.05, -0.32, 0.03]; }
    if (i === COBRE_I) { e.p[1] = 0.12; }
    return e;
  },
  conectar: i => ({
    p: [-2.1 + i * 0.7, i % 2 ? -0.5 : 0.45, i % 2 ? -0.25 : 0.1],
    r: [0.06, 0.28 * (3 - i) / 3, i % 2 ? 0.05 : -0.05],
    s: [0.5, 0.5], c: 0, v: 1,
  }),
  desplegar: i => {
    const a = -0.14 * Math.PI - (i / (N - 1)) * 0.72 * Math.PI;
    const s = i === COBRE_I ? [0.5, 0.92] : [1, 1];
    const ancho = W * s[0];
    return { p: [Math.cos(a) * ancho / 2, 0.05, -0.55 - Math.sin(a) * ancho / 2], r: [0, a, 0], s, c: 0, v: 1 };
  },
  resolver: i => {
    const u = 0.0095, lado = 100 * u;
    const centros = [50, 166, 282];
    if (i < 3) return { p: [(centros[i] - 224) * u, 0.15, 0.6], r: [0, 0, 0], s: [lado / W, lado / H], c: 1, v: 1 };
    if (i === COBRE_I) return { p: [(398 - 224) * u, 0.15 + 35 * u, 0.6], r: [0, 0, 15 * Math.PI / 180], s: [lado / W, lado / H], c: 0, v: 1 };
    return { p: [(i - 4.5) * 1.6, -2.4, -1.5], r: [0, -0.9, 0], s: [0.6, 0.6], c: 0, v: 0 };
  },
};
const base = { alinear: 1, destacar: 1, conectar: 0, desplegar: 0, resolver: 0 };
const ruta = { alinear: 0, destacar: 0, conectar: 1, desplegar: 0, resolver: 0 };

const mezclar = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);

function iniciar() {
  const lienzo = document.getElementById('escena');
  if (!lienzo) return;
  if (!soportaWebGL()) { raiz.classList.add('sin-3d'); return; }

  const movil = () => innerWidth < 900;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  escena.add(new THREE.HemisphereLight('#ffffff', '#c9c2b8', 1.5));
  const sol = new THREE.DirectionalLight('#fff6ec', 2.4);
  sol.position.set(-4, 7, 6); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024); sol.shadow.radius = 6; sol.shadow.bias = -0.0004;
  Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  escena.add(sol);
  const relleno = new THREE.DirectionalLight('#dfe8f5', 0.6); relleno.position.set(5, 2, 4); escena.add(relleno);

  const grupo = new THREE.Group(); escena.add(grupo);

  // Sombra sobre el papel de la página (el lienzo es transparente)
  const sombra = new THREE.ShadowMaterial({ opacity: 0.12 });
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), sombra);
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = -1.2; suelo.receiveShadow = true; grupo.add(suelo);

  const matBase = new THREE.MeshStandardMaterial({ color: AZUL, roughness: 0.85, metalness: 0.05, transparent: true });
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.36, 1.55), matBase);
  zocalo.position.set(0, -1.02, 0); zocalo.castShadow = true; zocalo.receiveShadow = true; grupo.add(zocalo);

  const geo = new THREE.BoxGeometry(W, H, D);
  const folios = [];
  for (let i = 0; i < N; i++) {
    const m = i === COBRE_I
      ? new THREE.MeshStandardMaterial({ color: COBRE, roughness: 0.38, metalness: 0.55 })
      : new THREE.MeshStandardMaterial({ color: PAPEL.clone(), map: texturaFolio(i), roughness: 0.92, metalness: 0 });
    const f = new THREE.Mesh(geo, m); f.castShadow = true; f.receiveShadow = true;
    grupo.add(f); folios.push(f);
  }

  // Ruta de cobre que une los folios en «conectar»
  const puntos = Array.from({ length: N }, (_, i) => new THREE.Vector3(...estados.conectar(i).p));
  puntos.unshift(new THREE.Vector3(-3.0, -0.2, -0.6)); puntos.push(new THREE.Vector3(3.0, 0.5, -0.6));
  const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  const tubo = new THREE.Mesh(
    new THREE.TubeGeometry(curva, 240, 0.014, 8, false),
    new THREE.MeshStandardMaterial({ color: COBRE, emissive: COBRE, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.5 }),
  );
  tubo.position.z = -0.05; grupo.add(tubo);
  const totalIdx = tubo.geometry.index.count;
  tubo.geometry.setDrawRange(0, 0);

  // Estado actual (amortiguado) por folio
  const actual = Array.from({ length: N }, (_, i) => structuredClone(estados.alinear(i)));
  let baseActual = 1, rutaActual = 0;

  function objetivo() {
    const secciones = [...document.querySelectorAll('[data-escena]')];
    if (!secciones.length) return null;
    const medio = innerHeight * 0.5;
    const centros = secciones.map(s => { const r = s.getBoundingClientRect(); return { c: r.top + r.height / 2, e: s.dataset.escena }; });
    let a = centros[0], b = centros[0], t = 0;
    if (medio <= centros[0].c) { a = b = centros[0]; }
    else if (medio >= centros.at(-1).c) { a = b = centros.at(-1); }
    else for (let k = 0; k < centros.length - 1; k++) {
      if (medio >= centros[k].c && medio <= centros[k + 1].c) {
        a = centros[k]; b = centros[k + 1];
        t = (medio - a.c) / (b.c - a.c);
        // la escena se queda en el estado de la sección mientras se lee y cambia entre secciones
        t = suave(Math.min(1, Math.max(0, (t - 0.3) / 0.4)));
        break;
      }
    }
    return { a: a.e, b: b.e, t };
  }

  function ajustar() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h; camara.updateProjectionMatrix();
    renderer.shadowMap.enabled = !movil();
  }
  addEventListener('resize', ajustar); ajustar();

  // Parallax suave con el puntero (no en movimiento reducido)
  const puntero = { x: 0, y: 0 }, mirada = { x: 0, y: 0 };
  addEventListener('pointermove', e => { puntero.x = e.clientX / innerWidth - 0.5; puntero.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  let visible = true, enPantalla = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  const vistos = new Set();
  const io = new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target));
    enPantalla = vistos.size > 0;
  });
  document.querySelectorAll('[data-escena]').forEach(s => io.observe(s));

  const reloj = new THREE.Clock();
  let primero = true;
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible || (!enPantalla && !primero)) return;
    const dt = Math.min(reloj.getDelta(), 0.05), t = reloj.elapsedTime;
    const obj = objetivo(); if (!obj) return;
    const quieto = reducido();
    const k = quieto || primero ? 1 : 1 - Math.pow(0.0025, dt); // amortiguación independiente de los FPS
    primero = false;

    for (let i = 0; i < N; i++) {
      const A = estados[obj.a](i), B = estados[obj.b](i), o = actual[i];
      for (const clave of ['p', 'r', 's']) for (let j = 0; j < o[clave].length; j++)
        o[clave][j] = mezclar(o[clave][j], mezclar(A[clave][j], B[clave][j], obj.t), k);
      o.c = mezclar(o.c, mezclar(A.c, B.c, obj.t), k);
      o.v = mezclar(o.v, mezclar(A.v, B.v, obj.t), k);

      const f = folios[i], flota = quieto ? 0 : Math.sin(t * 0.8 + i * 0.9) * 0.025;
      f.position.set(o.p[0], o.p[1] + flota, o.p[2]);
      f.rotation.set(o.r[0], o.r[1] + (quieto ? 0 : Math.sin(t * 0.5 + i) * 0.012), o.r[2]);
      const v = Math.max(0.0001, o.v);
      f.scale.set(o.s[0] * v, o.s[1] * v, 1);
      f.visible = o.v > 0.02;
      if (i !== COBRE_I) f.material.color.copy(PAPEL).lerp(AZUL, o.c);
    }
    baseActual = mezclar(baseActual, mezclar(base[obj.a], base[obj.b], obj.t), k);
    rutaActual = mezclar(rutaActual, mezclar(ruta[obj.a], ruta[obj.b], obj.t), k);
    zocalo.position.y = -1.02 - (1 - baseActual) * 1.4;
    matBase.opacity = baseActual; zocalo.visible = baseActual > 0.02;
    sombra.opacity = 0.02 + 0.1 * baseActual;
    const cuenta = Math.floor(totalIdx * rutaActual / 3) * 3;
    tubo.geometry.setDrawRange(0, cuenta); tubo.visible = cuenta > 0;

    // Encuadre: en escritorio la escena vive a la derecha del texto; en celular, arriba
    const m = movil();
    // «resolver» forma el símbolo: un poco más chico y más al centro para que el cuadrado de cobre no se corte
    const res = (obj.a === 'resolver' ? 1 - obj.t : 0) + (obj.b === 'resolver' ? obj.t : 0);
    const destinoX = m ? 0 : mezclar(1.7, 1.45, res), destinoY = m ? 1.15 : 0.05, escala = (m ? 0.62 : 0.88) * mezclar(1, 0.8, res);
    grupo.position.x = mezclar(grupo.position.x, destinoX, k);
    grupo.position.y = mezclar(grupo.position.y, destinoY, k);
    grupo.scale.setScalar(mezclar(grupo.scale.x, escala, k));
    if (!quieto) { mirada.x = mezclar(mirada.x, puntero.x, 0.04); mirada.y = mezclar(mirada.y, puntero.y, 0.04); }
    grupo.rotation.y = quieto ? 0 : mirada.x * 0.25 + Math.sin(t * 0.18) * 0.05;
    camara.position.set(-0.6, 1.9 - mirada.y * 0.6, 9.2);
    camara.lookAt(0, m ? 0.55 : -0.05, 0);
    renderer.render(escena, camara);
  }
  cuadro();
  raiz.classList.add('con-3d');
}

iniciar();
