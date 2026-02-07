// site.js
(() => {
  // =========================
  // 0) FORM -> WHATSAPP (seguro)
  // =========================
  const form = document.getElementById('formWhatsApp');

  // Sanitiza texto: quita caracteres raros, colapsa espacios, limita largo
  const cleanText = (v, max = 60) => {
    const s = String(v ?? '')
      .replace(/[\u0000-\u001F\u007F]/g, '')   // fuera control chars
      .replace(/\s+/g, ' ')                    // espacios
      .trim();
    return s.slice(0, max);
  };

  // Telefono: deja + y numeros, limita largo
  const cleanPhone = (v, max = 16) => {
    const s = String(v ?? '')
      .replace(/[^\d+]/g, '')                  // solo numeros y +
      .replace(/^(\+?)(.*)$/, (_, p, rest) => p + rest.replace(/\+/g, '')) // solo 1 "+"
      .trim();
    return s.slice(0, max);
  };

  const isValidName = (v) => v.length >= 2;
  const isValidPhone = (v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 8; // mínimo razonable
  };

  // Anti-spam simple por tiempo (si envían “instantáneo”, lo bloquea)
  let formReadyAt = Date.now();

  if (form) {
    // Resetea el timer cuando el usuario interactúa (mejor UX)
    form.addEventListener('focusin', () => {
      // Solo si el usuario vuelve después, no molesta:
      if (Date.now() - formReadyAt > 5000) formReadyAt = Date.now();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // ✅ Honeypot anti-bot (del HTML: <input id="empresa" ... style="display:none">)
      const empresa = document.getElementById('empresa')?.value?.trim();
      if (empresa) return; // bot: no hacemos nada

      const elapsed = Date.now() - formReadyAt;
      if (elapsed < 1200) {
        alert('Espera un segundo y vuelve a enviar 🙂');
        return;
      }

      const nombre = cleanText(document.getElementById('nombre')?.value, 40);
      const telefono = cleanPhone(document.getElementById('telefono')?.value, 16);
      const desde = cleanText(document.getElementById('desde')?.value, 50);
      const destino = cleanText(document.getElementById('destino')?.value, 50);
      const servicio = cleanText(document.getElementById('servicio')?.value, 40);

      // Validaciones mínimas
      if (!isValidName(nombre)) {
        alert('Escribe tu nombre (mínimo 2 caracteres).');
        return;
      }
      if (!isValidPhone(telefono)) {
        alert('Escribe un teléfono válido (mínimo 8 dígitos).');
        return;
      }
      if (desde.length < 2 || destino.length < 2) {
        alert('Completa origen y destino.');
        return;
      }

      const mensaje =
        `Hola, quiero cotizar un servicio.\n\n` +
        `👤 Nombre: ${nombre}\n` +
        `📞 Teléfono: ${telefono}\n` +
        `📍 Desde: ${desde}\n` +
        `🏁 Destino: ${destino}\n` +
        `🚚 Servicio: ${servicio}`;

      const url = `https://wa.me/56989002073?text=${encodeURIComponent(mensaje)}`;

      // Abrir en nueva pestaña evitando tabnabbing
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) w.opener = null;
    });
  }

  // =========================
  // 1) FLOTA SLIDER (1 imagen que cambia)
  // =========================
  const flotaImg = document.getElementById('flotaImagen'); // slider (una img)
  const galleryImages = document.querySelectorAll('#flota .gallery img'); // por si vuelves a galería

  const flotaSources = [
    "imagenes/cama baja camion rojo.jpg",
    "imagenes/cama baja camion verde.jpg",
    "imagenes/grua blanca grande.jpg",
    "imagenes/grua roja.jpg",
    "imagenes/grua verde.jpg",
    "imagenes/grua wolf.jpg",
    "imagenes/flota4.jpg",
    "imagenes/cama baja verde.jpg"
    
 
  ];

  let sliderIndex = 0;

  if (flotaImg) {
    // precarga
    flotaSources.forEach(src => { const i = new Image(); i.src = src; });

    setInterval(() => {
      flotaImg.style.opacity = 0;

      setTimeout(() => {
        sliderIndex = (sliderIndex + 1) % flotaSources.length;
        flotaImg.src = flotaSources[sliderIndex];
        flotaImg.style.opacity = 1;
      }, 450);

    }, 3500);
  }

  // =========================
  // 2) LIGHTBOX (para slider o galería)
  // =========================
  if (!flotaImg && !galleryImages.length) return;

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCap = document.getElementById('lightboxCaption');
  const stage = document.getElementById('lbStage');

  if (!lb || !lbImg || !stage) return;

  const btnBackdrop = lb.querySelector('.lightbox__backdrop');
  const btnClose = lb.querySelector('.lightbox__close');
  const btnNext = lb.querySelector('.lightbox__next');
  const btnPrev = lb.querySelector('.lightbox__prev');

  let items = [];
  let idx = 0;

  if (galleryImages.length) {
    items = Array.from(galleryImages).map(img => ({
      src: img.src,
      alt: img.alt || 'Flota'
    }));
  } else {
    items = flotaSources.map(src => ({ src, alt: 'Flota' }));
  }

  let scale = 1;
  const minScale = 1;
  const maxScale = 4;
  let tx = 0;
  let ty = 0;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTx = 0;
  let dragStartTy = 0;

  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchMid = { x: 0, y: 0 };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function applyTransform() {
    lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function resetTransform() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function openAt(i) {
    idx = (i + items.length) % items.length;
    const it = items[idx];

    lbImg.src = it.src;
    lbImg.alt = it.alt || 'Flota';
    if (lbCap) lbCap.textContent = it.alt || '';

    resetTransform();

    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.src = '';
    document.body.style.overflow = '';
    pinchActive = false;
    isDragging = false;
  }

  function next() { openAt(idx + 1); }
  function prev() { openAt(idx - 1); }

  // abrir desde galería
  if (galleryImages.length) {
    Array.from(galleryImages).forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openAt(i));
    });
  }

  // abrir desde slider
  if (flotaImg) {
    flotaImg.style.cursor = 'zoom-in';
    flotaImg.addEventListener('click', () => openAt(sliderIndex));
  }

  btnBackdrop?.addEventListener('click', close);
  btnClose?.addEventListener('click', close);
  btnNext?.addEventListener('click', next);
  btnPrev?.addEventListener('click', prev);

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;

    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();

    if (e.key === '+' || e.key === '=') zoomAt(1.15, stage.clientWidth / 2, stage.clientHeight / 2);
    if (e.key === '-') zoomAt(1 / 1.15, stage.clientWidth / 2, stage.clientHeight / 2);
    if (e.key === '0') resetTransform();
  });

  function zoomAt(factor, cx, cy) {
    const newScale = clamp(scale * factor, minScale, maxScale);
    if (newScale === scale) return;

    const dx = cx - stage.clientWidth / 2 - tx;
    const dy = cy - stage.clientHeight / 2 - ty;

    const ratio = newScale / scale;
    tx -= dx * (ratio - 1);
    ty -= dy * (ratio - 1);

    scale = newScale;
    applyTransform();
  }

  stage.addEventListener('wheel', (e) => {
    if (!lb.classList.contains('is-open')) return;
    e.preventDefault();

    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(factor, cx, cy);
  }, { passive: false });

  stage.addEventListener('mousedown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (scale <= 1) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTx = tx;
    dragStartTy = ty;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    tx = dragStartTx + (e.clientX - dragStartX);
    ty = dragStartTy + (e.clientY - dragStartY);
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  stage.addEventListener('dblclick', (e) => {
    if (!lb.classList.contains('is-open')) return;

    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (scale === 1) zoomAt(2.2, cx, cy);
    else resetTransform();
  });

  stage.addEventListener('touchstart', (e) => {
    if (!lb.classList.contains('is-open')) return;

    if (e.touches.length === 1) {
      if (scale <= 1) return;
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartTx = tx;
      dragStartTy = ty;
    }

    if (e.touches.length === 2) {
      pinchActive = true;
      isDragging = false;

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientX);
      pinchStartScale = scale;

      const rect = stage.getBoundingClientRect();
      pinchMid.x = ((t1.clientX + t2.clientX) / 2) - rect.left;
      pinchMid.y = ((t1.clientY + t2.clientY) / 2) - rect.top;
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (!lb.classList.contains('is-open')) return;

    if (pinchActive && e.touches.length === 2) {
      e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / pinchStartDist;

      const targetScale = clamp(pinchStartScale * factor, minScale, maxScale);
      const ratio = targetScale / scale;

      const dx = pinchMid.x - stage.clientWidth / 2 - tx;
      const dy = pinchMid.y - stage.clientHeight / 2 - ty;

      tx -= dx * (ratio - 1);
      ty -= dy * (ratio - 1);

      scale = targetScale;
      applyTransform();
      return;
    }

    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      tx = dragStartTx + (e.touches[0].clientX - dragStartX);
      ty = dragStartTy + (e.touches[0].clientY - dragStartY);
      applyTransform();
    }
  }, { passive: false });

  stage.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      isDragging = false;
      pinchActive = false;
    }
    if (e.touches.length === 1) pinchActive = false;
  });

  let swipeX0 = 0;
  let swipeY0 = 0;

  stage.addEventListener('touchstart', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.touches.length !== 1) return;
    swipeX0 = e.touches[0].clientX;
    swipeY0 = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (scale > 1) return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - swipeX0;
    const dy = t.clientY - swipeY0;

    if (Math.abs(dx) > 60 && Math.abs(dy) < 60) {
      if (dx < 0) next();
      else prev();
    }
  });

})();


// =========================
// MENÚ MÓVIL HEADER
// =========================
(() => {
  const btn = document.getElementById('menuBtn');
  const navMobile = document.getElementById('navMobile');
  if (!btn || !navMobile) return;

  btn.addEventListener('click', () => {
    const open = navMobile.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    navMobile.setAttribute('aria-hidden', open ? 'false' : 'true');
  });

  navMobile.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navMobile.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      navMobile.setAttribute('aria-hidden', 'true');
    });
  });
})();






