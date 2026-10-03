# Cita Stay 💕 - Comparador de Alojamientos en Pareja

Una aplicación web moderna, romántica y colaborativa diseñada para que parejas comparen opciones de alojamiento (de **Airbnb, Booking, Instagram, Google Maps**, etc.) en tiempo real, voten con corazones, calculen presupuestos y tomen la mejor decisión con ayuda de un **Asesor Romántico con Inteligencia Artificial**.

---

## ✨ Características Principales

1. **Conexión en Pareja en Tiempo Real**:
   - Espacio compartido mediante código de pareja (ej: `AMOR-2026`) y enlace directo (`?space=AMOR-2026`).
   - Sincronización automática entre los teléfonos y computadoras de ambos.
   - Perfiles personalizados con nombres y avatares románticos (🌸 Cami & 🐻 Nico, 🦊, 🐰, 🥑, etc.).
   - Selector rápido para alternar quién está votando ("Viendo como...").

2. **Ingreso Inteligente & Extracción con IA**:
   - Pega cualquier enlace de **Airbnb, Booking.com, Instagram o Google Maps** o texto descriptivo.
   - Botón **"Extraer con IA ✨"**: Obtiene automáticamente el nombre del lugar, precio estimado por noche, ubicación, tipo de alojamiento, fotos y puntos destacados.
   - Formulario manual completo para editar o agregar notas personales y fotos.

3. **Panel de Comparación Dual**:
   - **Vista de Tarjetas (Cards)**: Tarjetas visuales con fotos de alta resolución, etiquetas de pros/contras, precios por noche y total calculado según la cantidad de noches configurada.
   - **Vista de Tabla Comparativa (Matrix)**: Comparación lado a lado de todos los alojamientos, precios, votos individuales y estado de match.
   - **Votación con Corazones**: Cada uno vota si le gusta (`❤️`) o no (`🤍`) y puede dejar una opinión privada ("¡Amo la tina caliente!", "Muy caro").
   - **¡Es un Match! 💕**: Cuando ambos votan positivamente por un lugar, se activa una celebración con confetti y se marca con la insignia de Match oficial.
   - **Notas & Mensajes de Pareja**: Hilo de comentarios íntimo dentro de cada tarjeta para coordinar detalles ("Pregunté por el late check-out").

4. **Asesor Romántico IA (Cúpido IA)**:
   - Botón **"✨ Asesor IA"** que analiza todas las opciones guardadas.
   - Recomienda:
     - 👑 **La Elección Ganadora**: El mejor balance entre amor mutuo, comodidades y presupuesto.
     - 💰 **Mejor Calidad / Precio**: La opción más económica sin perder el romanticismo.
     - 🥂 **Opción Especial / Lujo**: Para una ocasión inolvidable o aniversario.
     - 💌 **Veredicto de Pareja**: Análisis cariñoso y personalizado de sus gustos y cómo congenian.
     - 💡 **Consejo de Viaje**: Tips románticos para su escapada.

5. **Diseño y Estética Pastel**:
   - Paleta de colores pasteles suaves: Rosas empolvados, lavanda, vainilla, menta y durazno suave.
   - Tipografías elegantes (*Playfair Display* & *Plus Jakarta Sans*).
   - Glassmorphism sutil, corazones flotantes de fondo y micro-animaciones suaves.
   - 100% responsivo para celulares y pantallas grandes.

---

## 🚀 Despliegue y Acceso Público

### 1. URL Pública Inmediata (Localtunnel)
- **URL Pública**: `https://cita-amor-stay.loca.lt`
- **Contraseña de Túnel (si la solicita)**: `200.83.69.232`
- Al entrar desde cualquier teléfono o computadora, ambos pueden compartir el enlace:
  `https://cita-amor-stay.loca.lt/?space=AMOR-2026`

### 2. Despliegue en Vercel (1-Click)
El proyecto incluye `vercel.json` y `api/index.js` listos:
```bash
npx vercel
```
O simplemente sube este repositorio a GitHub y conecta tu cuenta en [vercel.com](https://vercel.com).

### 3. Despliegue en Netlify
Incluye `netlify.toml` preconfigurado:
```bash
npx netlify deploy --prod
```

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar servidor completo (Backend + Frontend):
   ```bash
   node server.js
   ```
3. O en modo desarrollo con Vite:
   ```bash
   npm run dev
   ```
   Abrir en el navegador: `http://localhost:5173` (dev) o `http://localhost:3001` (producción).
