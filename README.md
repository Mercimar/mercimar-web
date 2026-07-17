# Merci Mar — Catálogo Web

Sitio web tipo catálogo de moda generado automáticamente desde carpetas de contenido. Cada push a GitHub actualiza el sitio en GitHub Pages.

---

## 🛍️ Agregar productos

### 1. Crear la carpeta del producto

```
content/colecciones/[nombre-coleccion]/items/[nombre-producto]/
```

Ejemplo:
```
content/colecciones/ropa/items/blazer-camel/
```

### 2. Agregar las fotos

Simplemente copia tus fotos dentro de esa carpeta:
```
content/colecciones/ropa/items/blazer-camel/
  ├── 1.jpg    ← foto principal (la que aparece en el grid)
  ├── 2.jpg    ← fotos adicionales (aparecen en el modal)
  └── 3.jpg
```
> Formatos soportados: `.jpg` `.jpeg` `.png` `.webp` `.avif`

### 3. Crear info.md

```markdown
# Nombre del Producto

**Precio:** $XXX.000 COP  
**Tallas:** XS · S · M · L  
**Material:** Descripción del material

Descripción breve del producto.
```

### 4. Hacer push

```bash
git add .
git commit -m "nuevo producto: blazer camel"
git push
```

¡El sitio se actualiza automáticamente en ~1 minuto! ✨

---

## ➕ Agregar una nueva colección

Crea una carpeta dentro de `content/colecciones/`:

```
content/colecciones/accesorios/items/...
```

Aparecerá automáticamente como filtro en el catálogo.

---

## ✏️ Cambiar datos de la marca

Edita el archivo [`content/config.json`](content/config.json):

```json
{
  "marca": "Merci Mar",
  "tagline": "Moda que te hace sentir tú",
  "whatsapp": "50762721611",
  "instagram": "@_mercimar",
  "instagram_url": "https://www.instagram.com/_mercimar",
  "mensaje_whatsapp": "Hola! Me interesa información sobre"
}
```

---

## 🔧 Generar el sitio localmente

Requiere [Node.js](https://nodejs.org/es/download/) (v16+). Sin instalaciones adicionales.

```bash
node build.js
```

Abre `index.html` en tu navegador para ver el resultado.

---

## ⚙️ Configurar GitHub Pages

1. Sube el repositorio a GitHub
2. Ve a **Settings → Pages**
3. Source: **Deploy from a branch** → `main` → `/ (root)`
4. Guarda

Tu sitio: `https://[tu-usuario].github.io/[nombre-repo]/`

Cada `git push` regenera el sitio automáticamente vía GitHub Actions.

---

## 📁 Estructura completa

```
merci_mar_web/
├── .github/workflows/build.yml  ← build automático en cada push
├── assets/
│   ├── style.css               ← diseño del catálogo
│   └── images/
│       └── hero.png            ← imagen del hero
├── content/
│   ├── config.json             ← datos de la marca
│   └── colecciones/
│       ├── joyeria/
│       │   └── items/
│       │       └── collar-dorado/
│       │           ├── info.md
│       │           └── 1.png
│       └── ropa/
│           └── items/
│               ├── blusa-lino-blanca/
│               ├── pantalon-wide-leg/
│               └── vestido-midi/
├── build.js                    ← script generador
├── index.html                  ← generado automáticamente ✨
└── README.md
```
