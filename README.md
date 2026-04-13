# MiFinanza 💰

App de finanzas familiares con React + Vite + Supabase.

## Configuración rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
- Ve a [supabase.com](https://supabase.com) y crea un proyecto
- Copia el contenido de `supabase-schema.sql` en el SQL Editor y ejecútalo
- Copia tu `Project URL` y `anon key` en `.env.local`

### 3. Correr localmente
```bash
npm run dev
```
Abre http://localhost:5173

### 4. Deploy en Vercel (gratis)
```bash
npm install -g vercel
vercel --prod
```
Agrega las variables de entorno en el dashboard de Vercel.

## Estructura del proyecto
```
mifinanza/
├── src/
│   ├── main.jsx          → Entrada principal
│   ├── AppRoot.jsx       → Manejo de sesión (login/logout)
│   ├── App.jsx           → App principal con todas las pantallas
│   ├── Auth.jsx          → Pantalla de login/registro/familia
│   ├── supabaseClient.js → Configuración de Supabase
│   └── useFinanzas.js    → Hook con todo el CRUD de Supabase
├── supabase-schema.sql   → Schema de base de datos
├── .env.local            → Variables de entorno (NO subir a GitHub)
├── index.html
├── vite.config.js
└── package.json
```

## Compartir con tu esposa
1. Regístrate tú primero → crea una familia → copia el UUID
2. Tu esposa se registra → "Unirme a familia" → pega el UUID
3. ¡Comparten todos los datos en tiempo real!
