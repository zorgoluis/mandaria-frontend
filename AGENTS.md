## Diseño – Lenguaje visual de Mandaria

Mandaria es una plataforma de mandados, fletes, viajes y mudanzas.
Tono: directo, confiable, eficiente. "Sin vueltas."
Usa la skill design-taste-frontend respetando SIEMPRE este lenguaje;
no propongas una estética nueva.

### Paleta (usar solo estos colores)
- Fondo: #F2F2F0 (blanco roto, nunca blanco puro)
- Texto / negro: #1E1C1A
- Verde Mandaria (acento único): #137A6A
- Verde suave para avisos: #E6F1EE
- Texto secundario: #5A5854
- Bordes y divisores: #1E1C1A con líneas de 1px
Prohibido: gradientes, morados/índigo, sombras difusas, glassmorphism.

### Tipografía
- Una sola familia grotesca (la que ya usa el proyecto).
- Titulares: peso extra bold, tracking negativo, interlineado muy cerrado,
  tamaños grandes. Se puede resaltar una palabra clave en verde.
- Etiquetas tipo "eyebrow": mayúsculas, pequeñas, tracking amplio, en verde.
- Texto de cuerpo: regular, tamaño moderado, color secundario.

### Formas y componentes
- Esquinas rectas (border-radius: 0) en botones, tarjetas e inputs.
- Botón primario: fondo verde, texto blanco, con flecha →.
- Botón secundario: contorno negro de 1px, fondo transparente.
- Separar contenido con líneas horizontales finas, no con tarjetas con sombra.
- Columnas tipo editorial con una línea superior sobre cada título.
- Bandas de color sólido (verde o negro) a todo el ancho para dar ritmo.
- Motivo visual recurrente: la ruta origen → destino (línea + punto inicial
  hueco + punto final sólido + vehículo). Reutilizarlo en estados de
  seguimiento, progreso y pasos.

### Movimiento
- Sobrio y con propósito: marquee de servicios, revelado al hacer scroll,
  vehículo avanzando sobre la ruta.
- Nada de rebotes exagerados ni animaciones decorativas sin significado.

### Qué evitar
- Tarjetas redondeadas apiladas, iconos emoji, ilustraciones genéricas 3D,
  hero centrado con gradiente, textos tipo "Bienvenido de nuevo 👋".

### Diales de la skill
- Landing: DESIGN_VARIANCE 6 · MOTION_INTENSITY 5 · VISUAL_DENSITY 3
- App web (paneles, formularios): DESIGN_VARIANCE 3 · MOTION_INTENSITY 2 · VISUAL_DENSITY 6