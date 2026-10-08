/* =====================================================================
   AImátika · Interacciones (versión 2 · varias páginas)
   ---------------------------------------------------------------------
   JavaScript sin librerías. Cada bloque revisa si su sección existe en
   la página, así el mismo archivo sirve para todas las páginas.

   En WordPress + Elementor: Elementor > Código personalizado,
   ubicación "Final del body", en todas las páginas.

   ÍNDICE
   1. Utilidades
   2. Menú (estado al bajar, menú del celular)
   3. Aparición al bajar
   4. Banner del inicio (luz que sigue el cursor, pausa fuera de pantalla)
   5. Proceso (línea que se llena)
   6. Servicios (imagen fija que cambia)
   7. Copiar correo y teléfono
   8. Formulario de contacto (validación + protección)
   9. Susana (chat)
  10. Detalles (año, tecla Escape)
  11. Blog (filtros por categoría)
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- 1. Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hayIO = 'IntersectionObserver' in window;

  // Mensajes para lectores de pantalla
  const anuncio = $('#anuncio');
  const anunciar = (txt) => {
    if (!anuncio) return;
    anuncio.textContent = '';
    setTimeout(() => { anuncio.textContent = txt; }, 40);
  };

  // Guardado local seguro (puede fallar en modo incógnito)
  const leerLocal = (k, porDefecto) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : porDefecto; } catch { return porDefecto; }
  };
  const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };


  /* ---------- 2. Menú ---------- */
  const nav = $('[data-nav]');
  const toggle = $('.nav__toggle');
  const menu = $('#menu-movil');
  const zonasInertes = $$('main, .pie');

  // Fondo del menú al bajar: se detecta con un "centinela" en la parte de arriba (sin escuchar el scroll)
  if (nav && hayIO) {
    const centinela = document.createElement('div');
    centinela.setAttribute('aria-hidden', 'true');
    centinela.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
    document.body.prepend(centinela);
    new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting)).observe(centinela);
  }

  const setMenu = (abierto) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(abierto));
    toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', abierto);
    nav.classList.toggle('menu-abierto', abierto);
    document.body.classList.toggle('sin-scroll', abierto);
    document.body.classList.toggle('con-menu', abierto);   // esconde a Susana mientras el menú está abierto
    zonasInertes.forEach((z) => { z.inert = abierto; });
    if (abierto) setTimeout(() => { const a = $('a', menu); if (a) a.focus(); }, 80);
  };
  if (toggle && menu) {
    $$('nav a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.matchMedia('(min-width: 1041px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }


  /* ---------- 3. Aparición al bajar ---------- */
  // Escalonado: los hijos de [data-grupo] y las líneas de un título entran uno tras otro
  $$('[data-grupo]').forEach((g) => $$('[data-aparecer]', g).forEach((el, i) => el.style.setProperty('--i', i)));
  $$('h1, h2, .manifiesto, .llamado__titulo').forEach((t) => $$('[data-linea]', t).forEach((l, i) => l.style.setProperty('--i', i)));

  const animables = $$('[data-aparecer], [data-linea]:not(.hero [data-linea]):not(.cabecera-pagina [data-linea]), .resaltar[data-dibujar]');
  if (hayIO && !menosMovimiento.matches) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    animables.forEach((el) => io.observe(el));
  } else {
    animables.forEach((el) => el.classList.add('is-visible'));
  }


  /* ---------- 4. Banner del inicio ---------- */
  const hero = $('.hero');
  if (hero) {
    // Pausa las animaciones cuando el banner no se ve (ahorra batería)
    if (hayIO) {
      new IntersectionObserver(([e]) => hero.classList.toggle('is-pausado', !e.isIntersecting)).observe(hero);
    }

    // Luz que sigue el cursor + leve profundidad en el destello (solo computador)
    const luz = $('.hero__cursor span', hero);
    const destello = $('.hero__destello', hero);
    const fondo = $('.hero__fondo picture', hero);
    if (luz && punteroFino.matches && !menosMovimiento.matches) {
      let objX = 0, objY = 0, x = 0, y = 0, raf = 0, ancho = 1, alto = 1;
      const medir = () => { const r = hero.getBoundingClientRect(); ancho = r.width; alto = r.height; };
      const paso = () => {
        // Interpolación suave: la luz "persigue" al cursor con inercia
        x += (objX - x) * 0.09;
        y += (objY - y) * 0.09;
        luz.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const nx = x / ancho - 0.5, ny = y / alto - 0.5;
        if (destello) destello.style.transform = `translate3d(${(nx * -28).toFixed(1)}px, ${(ny * -22).toFixed(1)}px, 0)`;
        if (fondo) fondo.style.transform = `translate3d(${(nx * 14).toFixed(1)}px, ${(ny * 10).toFixed(1)}px, 0) scale(1.03)`;
        raf = (Math.abs(objX - x) > 0.4 || Math.abs(objY - y) > 0.4) ? requestAnimationFrame(paso) : 0;
      };
      medir();
      x = objX = ancho * 0.3; y = objY = alto * 0.4;
      window.addEventListener('resize', medir, { passive: true });
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        objX = e.clientX - r.left;
        objY = e.clientY - r.top;
        hero.classList.add('con-cursor');
        if (!raf) raf = requestAnimationFrame(paso);
      }, { passive: true });
      hero.addEventListener('pointerleave', () => hero.classList.remove('con-cursor'));
    }
  }


  /* ---------- 5. Proceso: la línea se llena según los pasos vistos ---------- */
  $$('[data-proceso]').forEach((lista) => {
    const pasos = $$('.paso', lista);
    if (!pasos.length) return;
    let posiciones = [];
    const medir = () => {
      const vertical = window.matchMedia('(max-width: 960px)').matches;
      posiciones = pasos.map((p) => vertical ? p.offsetTop / lista.offsetHeight : p.offsetLeft / lista.offsetWidth);
    };
    const pintar = () => {
      const encendidos = pasos.filter((p) => p.classList.contains('is-on'));
      const k = encendidos.length;
      let p = 0;
      if (k === pasos.length) p = 1;
      else if (k > 0) p = (posiciones[k - 1] || 0) + 0.02;
      lista.style.setProperty('--p', p.toFixed(3));
    };
    medir();
    window.addEventListener('resize', () => { medir(); pintar(); }, { passive: true });

    if (!hayIO || menosMovimiento.matches) {
      pasos.forEach((p) => p.classList.add('is-on'));
      pintar();
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        // Se enciende al pasar el 60 % de la pantalla; se apaga si vuelve a quedar debajo
        const debajo = e.boundingClientRect.top > (e.rootBounds ? e.rootBounds.bottom : window.innerHeight);
        if (e.isIntersecting) e.target.classList.add('is-on');
        else if (debajo) e.target.classList.remove('is-on');
      });
      pintar();
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
    pasos.forEach((p) => io.observe(p));
  });


  /* ---------- 6. Servicios: la imagen de la izquierda cambia con el servicio en pantalla ---------- */
  const visor = $('[data-visor]');
  if (visor && hayIO) {
    const imagenes = $$('img', visor);
    const activar = (id) => imagenes.forEach((img) => img.classList.toggle('is-activa', img.dataset.servicio === id));
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) activar(e.target.id); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('[data-servicio-bloque]').forEach((b) => io.observe(b));
  }


  /* ---------- 7. Copiar correo y teléfono ---------- */
  $$('[data-copiar]').forEach((b) => {
    b.addEventListener('click', async () => {
      const txt = b.dataset.copiar;
      let ok = false;
      try {
        await navigator.clipboard.writeText(txt);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
      }
      b.dataset.msg = ok ? 'Copiado' : 'No se pudo copiar';
      b.dataset.estado = ok ? 'ok' : 'error';
      anunciar(ok ? `${txt} copiado` : 'No se pudo copiar');
      clearTimeout(b._t);
      b._t = setTimeout(() => { delete b.dataset.estado; }, 1600);
    });
  });


  /* ---------- 8. Formulario de contacto ----------
     Protección incluida (versión HTML):
     a) Campo trampa invisible: si un robot lo llena, el envío se descarta en silencio.
     b) Tiempo mínimo: un envío en menos de 3 segundos se considera automático.
     c) Límite: máximo 1 envío por minuto y 3 por hora desde el mismo navegador.
     d) Largo máximo por campo (también en el HTML con maxlength).
     e) Limpieza: se quitan caracteres invisibles y los signos < >.
     f) Bloqueo de código: se rechazan etiquetas, "javascript:", eventos "on...=" y similares.
     g) Más de 2 enlaces en el mensaje = spam.
     h) Nunca se inserta lo que escribe la persona como HTML (solo textContent).
     IMPORTANTE: esto protege la versión HTML. En WordPress la validación
     real ocurre en el servidor (Elementor Pro + reCAPTCHA + Akismet). Ver la guía. */
  const form = $('[data-form]');
  if (form) {
    const estado = $('.formulario__estado', form);
    const boton = $('button[type="submit"]', form);
    const abiertoEn = Date.now();
    const CORREO_DESTINO = 'contacto@aimatika.com';

    const LIMITES = { nombre: 80, empresa: 100, correo: 120, telefono: 25, mensaje: 1500 };
    const PATRON_CODIGO = /<\s*\/?\s*[a-z!?]|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=|\{\{|\$\{|<\?php|\b(select|union|insert|drop|delete)\b\s+.*\b(from|into|table)\b/i;
    const PATRON_ENLACE = /(https?:\/\/|www\.)/gi;

    // Opciones permitidas del selector (lista blanca)
    const SERVICIOS = {
      'identidad-de-marca': 'Identidad de marca',
      'pauta-y-automatizacion': 'Pauta y Automatización',
      'marketing-y-contenidos': 'Marketing y Contenidos',
      'estrategia-digital': 'Estrategia Digital',
      'paginas-web': 'Páginas web',
      'diagnostico': 'Aún no sé, quiero un diagnóstico',
    };

    // Si llega desde un botón de servicio (?servicio=...), se preselecciona
    const elegido = new URLSearchParams(location.search).get('servicio');
    if (elegido && Object.prototype.hasOwnProperty.call(SERVICIOS, elegido)) {
      form.elements.necesidad.value = SERVICIOS[elegido];
    }

    // Caracteres de control e invisibles (se arma con códigos para que el archivo sea solo ASCII)
    const INVISIBLES = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]', 'g');
    const limpiar = (v, multilinea = false) => {
      let t = String(v || '').normalize('NFKC');
      t = t.replace(INVISIBLES, '');
      t = t.replace(/[<>]/g, '');
      t = multilinea ? t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
      return t.trim();
    };

    const reglas = {
      nombre: (v) => {
        if (v.length < 2) return 'Escribe tu nombre.';
        if (!/^[\p{L}\p{M}' .-]+$/u.test(v)) return 'Usa solo letras en el nombre.';
        return true;
      },
      empresa: (v) => !v || v.length <= LIMITES.empresa || 'El nombre de la empresa es muy largo.',
      correo: (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v) || 'Revisa tu correo, parece que le falta algo.',
      telefono: (v) => !v || /^\+?[\d\s()-]{7,20}$/.test(v) || 'Escribe solo números, espacios o el signo +.',
      necesidad: (v) => Object.values(SERVICIOS).includes(v) || 'Elige una opción para saber por dónde empezar.',
      mensaje: (v) => {
        if (PATRON_CODIGO.test(v)) return 'Escribe tu mensaje como texto normal, sin código ni etiquetas.';
        if ((v.match(PATRON_ENLACE) || []).length > 2) return 'Incluye máximo 2 enlaces en tu mensaje.';
        return true;
      },
      acepto: (_, el) => el.checked || 'Necesitamos tu autorización para responderte.',
    };

    const valor = (el) => (el.type === 'checkbox' ? el.checked : limpiar(el.value, el.tagName === 'TEXTAREA'));

    const validar = (el) => {
      const regla = reglas[el.name];
      if (!regla) return true;
      const v = valor(el);
      // f) El código se busca en el texto ORIGINAL, antes de limpiarlo, para rechazarlo (no solo desarmarlo)
      const crudo = el.type === 'checkbox' ? '' : String(el.value || '');
      let r;
      if (crudo && PATRON_CODIGO.test(crudo)) {
        r = el.name === 'mensaje' ? 'Escribe tu mensaje como texto normal, sin código ni etiquetas.' : 'Este campo tiene caracteres que no podemos aceptar.';
      } else {
        r = regla(v, el);
      }
      const ok = r === true;
      const caja = el.closest('.campo');
      caja.classList.toggle('is-error', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      const err = $('.campo__error', caja);
      if (err) err.textContent = ok ? '' : r;
      return ok;
    };

    form.addEventListener('focusout', (e) => { if (e.target.name in reglas && e.target.value) validar(e.target); });
    form.addEventListener('input', (e) => { if (e.target.closest('.campo.is-error')) validar(e.target); });
    form.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') validar(e.target); });

    // Contador de caracteres del mensaje
    const mensaje = form.elements.mensaje;
    const contador = $('[data-contador]', form);
    if (mensaje && contador) {
      const contar = () => { contador.textContent = `${mensaje.value.length} / ${LIMITES.mensaje}`; };
      mensaje.addEventListener('input', contar);
      contar();
    }

    const avisar = (tipo, txt) => {
      estado.dataset.tipo = tipo;
      estado.textContent = txt;   // textContent: nunca se interpreta como HTML
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // a) Campo trampa: si tiene algo, es un robot. Se finge éxito y no se envía nada.
      if (form.elements.sitio_web && form.elements.sitio_web.value) {
        avisar('ok', 'Gracias. Recibimos tu mensaje.');
        form.reset();
        return;
      }

      // b) Demasiado rápido para ser una persona
      if (Date.now() - abiertoEn < 3000) {
        avisar('error', 'Revisa tus datos y vuelve a darle a enviar.');
        return;
      }

      // Validación de todos los campos
      const campos = [...form.elements].filter((el) => el.name in reglas);
      const malos = campos.filter((c) => !validar(c));
      if (malos.length) {
        malos[0].focus();
        avisar('error', malos.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${malos.length} campos marcados.`);
        return;
      }

      // c) Límite de envíos desde este navegador
      const ahora = Date.now();
      const envios = leerLocal('aim_envios', []).filter((t) => typeof t === 'number' && ahora - t < 3600000);
      if (envios.some((t) => ahora - t < 60000)) {
        avisar('error', 'Ya recibimos un mensaje tuyo hace un momento. Espera un minuto antes de enviar otro.');
        return;
      }
      if (envios.length >= 3) {
        avisar('error', 'Enviaste varios mensajes en la última hora. Escríbenos por WhatsApp al +57 317 040 2062.');
        return;
      }

      // Datos limpios y recortados a su largo máximo
      const d = {};
      Object.keys(LIMITES).forEach((k) => {
        const el = form.elements[k];
        d[k] = el ? limpiar(el.value, k === 'mensaje').slice(0, LIMITES[k]) : '';
      });
      d.necesidad = limpiar(form.elements.necesidad.value);

      boton.classList.add('is-enviando');
      boton.setAttribute('aria-disabled', 'true');

      /* ENVÍO · Versión HTML: abre el correo de la persona con el mensaje armado.
         En WordPress este bloque NO se usa: el formulario de Elementor Pro envía
         directo desde el servidor. */
      const cuerpo = [
        `Nombre: ${d.nombre}`,
        `Empresa o marca: ${d.empresa || '-'}`,
        `Correo: ${d.correo}`,
        `WhatsApp: ${d.telefono || '-'}`,
        `Necesito: ${d.necesidad}`,
        '',
        d.mensaje || '',
      ].join('\n');
      const asunto = `Solicitud de diagnóstico · ${d.nombre}`;
      envios.push(ahora);
      guardarLocal('aim_envios', envios);

      window.location.href = `mailto:${CORREO_DESTINO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      avisar('ok', 'Listo. Se abrió tu correo con el mensaje armado: solo dale enviar. ¿Prefieres WhatsApp? Escríbenos al +57 317 040 2062.');
      setTimeout(() => { boton.classList.remove('is-enviando'); boton.removeAttribute('aria-disabled'); }, 2500);
    });
  }


  /* ---------- 9. Susana (chat) ---------- */
  const susana = $('[data-susana]');
  let cerrarSusana = () => {};
  if (susana) {
    const boton = $('.susana__boton', susana);
    const iframe = $('iframe', susana);
    const btnCerrar = $('[data-cerrar]', susana);
    const movil = window.matchMedia('(max-width: 640px)');

    setTimeout(() => susana.classList.add('is-lista'), menosMovimiento.matches ? 0 : 1600);

    const abrir = () => {
      // Abierta como archivo local, el chat no se deja incrustar: se abre en otra pestaña
      if (location.protocol === 'file:') { window.open(iframe.dataset.src, '_blank', 'noopener'); return; }
      if (!iframe.getAttribute('src')) {
        iframe.addEventListener('load', () => susana.classList.add('is-cargada'), { once: true });
        iframe.setAttribute('src', iframe.dataset.src);
      }
      susana.classList.add('is-open');
      boton.setAttribute('aria-expanded', 'true');
      if (movil.matches) document.body.classList.add('sin-scroll');
      setTimeout(() => btnCerrar.focus(), 60);
    };
    cerrarSusana = () => {
      if (!susana.classList.contains('is-open')) return;
      susana.classList.remove('is-open');
      boton.setAttribute('aria-expanded', 'false');
      if (!menu || !menu.classList.contains('is-open')) document.body.classList.remove('sin-scroll');
      boton.focus();
    };
    boton.addEventListener('click', abrir);
    btnCerrar.addEventListener('click', cerrarSusana);
  }


  /* ---------- 10. Detalles ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menu && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    cerrarSusana();
  });

  $$('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });


  /* ---------- 11. Blog: filtros por categoría ----------
     Sin JavaScript se ven todos los artículos y los filtros quedan ocultos.
     En WordPress: widget Loop Grid con filtro por categoría. */
  const filtros = $('[data-filtros]');
  if (filtros) {
    const tarjetas = $$('[data-categoria]');
    const botones = $$('button[data-filtro]', filtros);
    const aplicar = (cat, avisar = true) => {
      let n = 0;
      tarjetas.forEach((t) => {
        const ver = cat === 'todas' || t.dataset.categoria === cat;
        t.hidden = !ver;
        if (ver) { n++; t.querySelectorAll('[data-aparecer]').forEach((el) => el.classList.add('is-visible')); }
      });
      botones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === cat)));
      if (avisar) anunciar(n === 1 ? '1 artículo' : n + ' artículos');
    };
    filtros.hidden = false;
    filtros.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filtro]');
      if (!b) return;
      aplicar(b.dataset.filtro);
      try { history.replaceState(null, '', b.dataset.filtro === 'todas' ? location.pathname : '?categoria=' + b.dataset.filtro); } catch (_) { /* sin historial */ }
    });
    const inicial = new URLSearchParams(location.search).get('categoria');
    if (inicial && botones.some((b) => b.dataset.filtro === inicial)) aplicar(inicial, false);
  }
})();
