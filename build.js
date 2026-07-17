/**
 * build.js — Generador de catálogo Merci Mar
 *
 * Estructura esperada en content/:
 *   config.json                     ← datos de la marca
 *   colecciones/
 *     [nombre-coleccion]/
 *       items/
 *         [nombre-producto]/
 *           info.md                 ← nombre (H1), precio, tallas, descripción
 *           1.jpg, 2.jpg ...        ← fotos del producto
 *
 * Genera: index.html  (catálogo completo, mobile-first)
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT         = __dirname;
const CONTENT_DIR  = path.join(ROOT, 'content');
const OUTPUT_FILE  = path.join(ROOT, 'index.html');
const IMAGE_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

// ── Leer configuración de marca ────────────────────────────────
function readConfig() {
  const cfgPath = path.join(CONTENT_DIR, 'config.json');
  if (!fs.existsSync(cfgPath)) {
    return {
      marca: 'Merci Mar',
      tagline: 'Moda que te hace sentir tú',
      descripcion: '',
      whatsapp: '573001234567',
      instagram: '@merci.mar',
      instagram_url: 'https://www.instagram.com/merci.mar',
      mensaje_whatsapp: 'Hola! Me interesa información sobre'
    };
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
}

// ── Parsear info.md básico (sin dependencias externas) ─────────
function parseInfoMd(mdText) {
  const lines = mdText.split('\n');
  let nombre  = '';
  let precio  = '';
  let tallas  = '';
  let material= '';
  const descLines = [];
  let pastHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!nombre && trimmed.startsWith('# ')) {
      nombre = trimmed.slice(2).trim();
      pastHeader = true;
      continue;
    }
    if (trimmed.startsWith('**Precio:**')) {
      precio = trimmed.replace('**Precio:**', '').trim();
      continue;
    }
    if (trimmed.startsWith('**Tallas:**')) {
      tallas = trimmed.replace('**Tallas:**', '').trim();
      continue;
    }
    if (trimmed.startsWith('**Material:**')) {
      material = trimmed.replace('**Material:**', '').trim();
      continue;
    }
    if (pastHeader && trimmed && !trimmed.startsWith('**')) {
      descLines.push(trimmed);
    }
  }

  return { nombre, precio, tallas, material, descripcion: descLines.join(' ').trim() };
}

// ── Leer colecciones ───────────────────────────────────────────
function readColecciones() {
  const colDir = path.join(CONTENT_DIR, 'colecciones');
  if (!fs.existsSync(colDir)) return [];

  const colecciones = [];
  const entries = fs.readdirSync(colDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));

  for (const entry of entries) {
    const colPath   = path.join(colDir, entry.name);
    const itemsPath = path.join(colPath, 'items');
    const items     = [];

    if (fs.existsSync(itemsPath)) {
      const itemEntries = fs.readdirSync(itemsPath, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));

      for (const itemEntry of itemEntries) {
        const itemPath  = path.join(itemsPath, itemEntry.name);
        const fileList  = fs.readdirSync(itemPath, { withFileTypes: true }).filter(e => e.isFile());
        const infoFile  = fileList.find(f => f.name.toLowerCase() === 'info.md');
        const imageFiles = fileList
          .filter(f => IMAGE_EXTS.has(path.extname(f.name).toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));

        let info = { nombre: itemEntry.name.replace(/-/g, ' '), precio: '', tallas: '', material: '', descripcion: '' };
        if (infoFile) {
          const mdText = fs.readFileSync(path.join(itemPath, infoFile.name), 'utf-8');
          info = parseInfoMd(mdText);
          if (!info.nombre) info.nombre = itemEntry.name.replace(/-/g, ' ');
        }

        const imagenes = imageFiles.map(f =>
          path.relative(ROOT, path.join(itemPath, f.name)).replace(/\\/g, '/')
        );

        items.push({ slug: itemEntry.name, ...info, imagenes });
      }
    }

    const nombreCol = entry.name.replace(/^\d+[\-\.]\s*/, '').trim();
    colecciones.push({ slug: entry.name, nombre: nombreCol, items });
  }

  return colecciones;
}

// ── Construcción del HTML ──────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function whatsappLink(numero, mensaje, producto) {
  const texto = encodeURIComponent(mensaje + ' ' + producto);
  return 'https://wa.me/' + numero + '?text=' + texto;
}

function buildProductCard(item, cfg, colSlug) {
  const imgSrc   = item.imagenes.length ? item.imagenes[0] : 'assets/images/placeholder.png';
  const allImgs  = item.imagenes.map((src, i) =>
    '<img src="' + src + '" alt="' + item.nombre + ' - foto ' + (i+1) + '" loading="lazy" class="modal-img' + (i === 0 ? ' active' : '') + '">'
  ).join('');
  const dots = item.imagenes.length > 1
    ? '<div class="modal-dots">' + item.imagenes.map((_, i) =>
        '<button class="dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="Foto ' + (i+1) + '"></button>'
      ).join('') + '</div>'
    : '';

  const waLink = whatsappLink(cfg.whatsapp, cfg.mensaje_whatsapp, item.nombre);
  const precioHtml = item.precio ? '<span class="card-precio">' + item.precio + '</span>' : '';
  const tallasHtml = item.tallas ? '<p class="modal-tallas"><strong>Tallas:</strong> ' + item.tallas + '</p>' : '';
  const materialHtml = item.material ? '<p class="modal-material"><strong>Material:</strong> ' + item.material + '</p>' : '';
  const descHtml = item.descripcion ? '<p class="modal-desc">' + item.descripcion + '</p>' : '';

  return [
    '<article class="product-card" data-id="' + item.slug + '" data-col="' + colSlug + '" role="button" tabindex="0" aria-label="Ver ' + item.nombre + '">',
    '  <div class="card-img-wrap">',
    '    <img src="' + imgSrc + '" alt="' + item.nombre + '" loading="lazy" class="card-img">',
    '    <div class="card-overlay"><span>Ver detalle</span></div>',
    '  </div>',
    '  <div class="card-body">',
    '    <h3 class="card-nombre">' + item.nombre + '</h3>',
    '    ' + precioHtml,
    '  </div>',
    '</article>',
    '',
    '<!-- Modal: ' + item.slug + ' -->',
    '<div id="modal-' + item.slug + '" class="product-modal" role="dialog" aria-modal="true" aria-label="' + item.nombre + '">',
    '  <div class="modal-backdrop"></div>',
    '  <div class="modal-panel">',
    '    <button class="modal-close" aria-label="Cerrar">✕</button>',
    '    <div class="modal-gallery">',
    '      <div class="modal-images">' + allImgs + '</div>',
    '      ' + dots,
    '    </div>',
    '    <div class="modal-info">',
    '      <h2 class="modal-nombre">' + item.nombre + '</h2>',
    '      ' + (item.precio ? '<p class="modal-precio">' + item.precio + '</p>' : ''),
    '      ' + tallasHtml,
    '      ' + materialHtml,
    '      ' + descHtml,
    '      <div class="modal-ctas">',
    '        <a href="' + waLink + '" target="_blank" rel="noopener" class="btn btn-whatsapp">',
    '          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.17a.75.75 0 00.916.916l5.347-1.453A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.908 0-3.7-.497-5.254-1.367l-.376-.22-3.903 1.06 1.06-3.903-.22-.376A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>',
    '          Pedir por WhatsApp',
    '        </a>',
    '        <a href="' + cfg.instagram_url + '" target="_blank" rel="noopener" class="btn btn-instagram">',
    '          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    '          Ver en Instagram',
    '        </a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function buildColeccionSection(col, cfg) {
  const cards = col.items.map(item => buildProductCard(item, cfg, col.slug)).join('\n');
  return [
    '<section id="col-' + col.slug + '" class="col-section">',
    '  <div class="col-grid">',
    '    ' + (cards || '<p class="col-empty">Esta colección no tiene productos aún.</p>'),
    '  </div>',
    '</section>',
  ].join('\n');
}

function buildFilterBar(colecciones) {
  const buttons = colecciones.map(col =>
    '<button class="filter-btn" data-filter="' + col.slug + '">' + capitalize(col.nombre) + '</button>'
  ).join('');
  return [
    '<div class="filter-bar" id="filter-bar">',
    '  <button class="filter-btn active" data-filter="all">Todos</button>',
    '  ' + buttons,
    '</div>',
  ].join('\n');
}

// ── JavaScript del cliente ─────────────────────────────────────
function clientJS() {
  return [
    '(function() {',
    '',
    '// ── Filtro de colecciones ──────────────────────────',
    'var filterBtns = document.querySelectorAll(".filter-btn");',
    'var cards = document.querySelectorAll(".product-card");',
    '',
    'filterBtns.forEach(function(btn) {',
    '  btn.addEventListener("click", function() {',
    '    filterBtns.forEach(function(b) { b.classList.remove("active"); });',
    '    btn.classList.add("active");',
    '    var filter = btn.dataset.filter;',
    '    cards.forEach(function(card) {',
    '      if (filter === "all" || card.dataset.col === filter) {',
    '        card.style.display = "";',
    '      } else {',
    '        card.style.display = "none";',
    '      }',
    '    });',
    '  });',
    '});',
    '',
    '// ── Abrir/cerrar modal ─────────────────────────────',
    'function openModal(id) {',
    '  var modal = document.getElementById("modal-" + id);',
    '  if (!modal) return;',
    '  modal.classList.add("open");',
    '  document.body.style.overflow = "hidden";',
    '}',
    '',
    'function closeModal(modal) {',
    '  modal.classList.remove("open");',
    '  document.body.style.overflow = "";',
    '}',
    '',
    'cards.forEach(function(card) {',
    '  card.addEventListener("click", function() { openModal(card.dataset.id); });',
    '  card.addEventListener("keydown", function(e) {',
    '    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card.dataset.id); }',
    '  });',
    '});',
    '',
    'document.querySelectorAll(".modal-close, .modal-backdrop").forEach(function(el) {',
    '  el.addEventListener("click", function() {',
    '    var modal = el.closest(".product-modal");',
    '    if (modal) closeModal(modal);',
    '  });',
    '});',
    '',
    'document.addEventListener("keydown", function(e) {',
    '  if (e.key === "Escape") {',
    '    document.querySelectorAll(".product-modal.open").forEach(function(m) { closeModal(m); });',
    '  }',
    '});',
    '',
    '// ── Galería de imágenes en modal (swipe + dots) ────',
    'document.querySelectorAll(".product-modal").forEach(function(modal) {',
    '  var imgs   = modal.querySelectorAll(".modal-img");',
    '  var dots   = modal.querySelectorAll(".dot");',
    '  var current = 0;',
    '',
    '  function goTo(index) {',
    '    imgs.forEach(function(img) { img.classList.remove("active"); });',
    '    dots.forEach(function(d) { d.classList.remove("active"); });',
    '    current = (index + imgs.length) % imgs.length;',
    '    if (imgs[current]) imgs[current].classList.add("active");',
    '    if (dots[current]) dots[current].classList.add("active");',
    '  }',
    '',
    '  dots.forEach(function(dot) {',
    '    dot.addEventListener("click", function() { goTo(parseInt(dot.dataset.index)); });',
    '  });',
    '',
    '  // Swipe touch para móvil',
    '  var touchStartX = 0;',
    '  var gallery = modal.querySelector(".modal-images");',
    '  if (gallery) {',
    '    gallery.addEventListener("touchstart", function(e) {',
    '      touchStartX = e.touches[0].clientX;',
    '    }, { passive: true });',
    '    gallery.addEventListener("touchend", function(e) {',
    '      var dx = e.changedTouches[0].clientX - touchStartX;',
    '      if (Math.abs(dx) > 40) {',
    '        goTo(dx < 0 ? current + 1 : current - 1);',
    '      }',
    '    }, { passive: true });',
    '  }',
    '});',
    '',
    '// ── Smooth scroll al catálogo ───────────────────────',
    'var heroBtn = document.getElementById("btn-catalogo");',
    'if (heroBtn) {',
    '  heroBtn.addEventListener("click", function() {',
    '    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });',
    '  });',
    '}',
    '',
    '// ── Navbar scroll behavior ──────────────────────────',
    'var navbar = document.getElementById("navbar");',
    'window.addEventListener("scroll", function() {',
    '  if (window.scrollY > 60) {',
    '    navbar.classList.add("scrolled");',
    '  } else {',
    '    navbar.classList.remove("scrolled");',
    '  }',
    '}, { passive: true });',
    '',
    '})();',
  ].join('\n');
}

// ── Plantilla HTML principal ───────────────────────────────────
function buildHtml(cfg, colecciones) {
  const filterBar = buildFilterBar(colecciones);
  const sections  = colecciones.map(col => buildColeccionSection(col, cfg)).join('\n');
  const heroImg   = fs.existsSync(path.join(ROOT, 'assets/images/hero.png'))
    ? 'assets/images/hero.png'
    : (fs.existsSync(path.join(ROOT, 'assets/images/hero.jpg')) ? 'assets/images/hero.jpg' : '');

  const heroStyle = heroImg ? ' style="background-image:url(\'' + heroImg + '\')"' : '';

  const navLinks = colecciones.map(col =>
    '<a href="#col-' + col.slug + '" class="nav-link">' + capitalize(col.nombre) + '</a>'
  ).join('');

  return '<!DOCTYPE html>\n' +
'<html lang="es">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <meta name="description" content="' + cfg.marca + ' — ' + cfg.descripcion + '">\n' +
'  <meta property="og:title" content="' + cfg.marca + '">\n' +
'  <meta property="og:description" content="' + cfg.descripcion + '">\n' +
'  <meta name="theme-color" content="#FFFFFF">\n' +
'  <title>' + cfg.marca + '</title>\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">\n' +
'  <link rel="stylesheet" href="assets/style.css">\n' +
'</head>\n' +
'<body>\n' +
'\n' +
'<!-- ── Navbar ── -->\n' +
'<header id="navbar" class="navbar">\n' +
'  <div class="navbar-inner">\n' +
'    <a href="#" class="navbar-logo">' + cfg.marca + '</a>\n' +
'    <nav class="navbar-links">' + navLinks + '</nav>\n' +
'    <a href="https://wa.me/' + cfg.whatsapp + '" target="_blank" rel="noopener" class="navbar-wa" aria-label="WhatsApp">\n' +
'      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.17a.75.75 0 00.916.916l5.347-1.453A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.908 0-3.7-.497-5.254-1.367l-.376-.22-3.903 1.06 1.06-3.903-.22-.376A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>\n' +
'    </a>\n' +
'  </div>\n' +
'</header>\n' +
'\n' +
'<!-- ── Hero ── -->\n' +
'<section class="hero"' + heroStyle + '>\n' +
'  <div class="hero-overlay"></div>\n' +
'  <div class="hero-content">\n' +
'    <p class="hero-eyebrow">Nueva Colección</p>\n' +
'    <h1 class="hero-title">' + cfg.marca + '</h1>\n' +
'    <p class="hero-tagline">' + cfg.tagline + '</p>\n' +
'    <button id="btn-catalogo" class="btn-hero">Ver Catálogo</button>\n' +
'  </div>\n' +
'</section>\n' +
'\n' +
'<!-- ── Catálogo ── -->\n' +
'<main id="catalogo" class="catalogo">\n' +
'  <div class="container">\n' +
'    <div class="section-header">\n' +
'      <h2 class="section-title">Colección</h2>\n' +
'      <p class="section-sub">' + cfg.descripcion + '</p>\n' +
'    </div>\n' +
'    ' + filterBar + '\n' +
'    ' + sections + '\n' +
'  </div>\n' +
'</main>\n' +
'\n' +
'<!-- ── Sobre nosotras ── -->\n' +
'<section class="about">\n' +
'  <div class="container about-inner">\n' +
'    <div class="about-text">\n' +
'      <h2>Sobre <em>' + cfg.marca + '</em></h2>\n' +
'      <p>' + cfg.descripcion + '</p>\n' +
'      <p>Cada pieza está pensada para acompañarte en tu día a día — desde el café de la mañana hasta la salida de noche. Compramos con intención y vestimos con identidad.</p>\n' +
'    </div>\n' +
'    <div class="about-contact">\n' +
'      <h3>¿Lista para tu próximo look?</h3>\n' +
'      <p>Escríbenos y con gusto te asesoramos.</p>\n' +
'      <a href="https://wa.me/' + cfg.whatsapp + '" target="_blank" rel="noopener" class="btn btn-whatsapp btn-large">\n' +
'        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.17a.75.75 0 00.916.916l5.347-1.453A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.908 0-3.7-.497-5.254-1.367l-.376-.22-3.903 1.06 1.06-3.903-.22-.376A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>\n' +
'        Contactar por WhatsApp\n' +
'      </a>\n' +
'      <a href="' + cfg.instagram_url + '" target="_blank" rel="noopener" class="btn btn-instagram btn-large">\n' +
'        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>\n' +
'        Ver en Instagram\n' +
'      </a>\n' +
'    </div>\n' +
'  </div>\n' +
'</section>\n' +
'\n' +
'<!-- ── Footer ── -->\n' +
'<footer class="footer">\n' +
'  <div class="container">\n' +
'    <span class="footer-brand">' + cfg.marca + '</span>\n' +
'    <div class="footer-links">\n' +
'      <a href="https://wa.me/' + cfg.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>\n' +
'      <a href="' + cfg.instagram_url + '" target="_blank" rel="noopener">Instagram</a>\n' +
'    </div>\n' +
'    <p class="footer-copy">&copy; ' + new Date().getFullYear() + ' ' + cfg.marca + '. Hecho con amor.</p>\n' +
'  </div>\n' +
'</footer>\n' +
'\n' +
'<!-- ── WhatsApp flotante ── -->\n' +
'<a href="https://wa.me/' + cfg.whatsapp + '" target="_blank" rel="noopener" class="wa-fab" aria-label="Contactar por WhatsApp">\n' +
'  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.17a.75.75 0 00.916.916l5.347-1.453A11.956 11.956 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.908 0-3.7-.497-5.254-1.367l-.376-.22-3.903 1.06 1.06-3.903-.22-.376A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>\n' +
'</a>\n' +
'\n' +
'<script>\n' + clientJS() + '\n</script>\n' +
'</body>\n' +
'</html>';
}

// ── Main ───────────────────────────────────────────────────────
function build() {
  console.log('Construyendo catalogo Merci Mar...');
  const cfg        = readConfig();
  const colecciones = readColecciones();

  const totalItems = colecciones.reduce(function(acc, col) { return acc + col.items.length; }, 0);
  const html       = buildHtml(cfg, colecciones);

  fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');
  console.log('OK: index.html generado.');
  console.log('Colecciones: ' + colecciones.map(function(c) { return c.nombre + ' (' + c.items.length + ')'; }).join(', '));
  console.log('Total productos: ' + totalItems);
}

build();
