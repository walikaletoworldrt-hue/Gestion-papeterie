# Walikale Papeterie

Socle d'application de gestion de papeterie base sur :

- React
- TypeScript
- Vite
- Electron
- Supabase pour la base de donnees centralisee
- SQLite local pour le mode offline desktop
- Netlify pour la version web

## Scripts

```bash
npm install
npm run dev
```

Autres scripts utiles :

```bash
npm run build
npm run preview
npm run typecheck
```

## Architecture

- `src/` : application React
- `electron/` : shell Electron, preload et couche SQLite
- `main.cjs` : bootstrap Electron en mode TypeScript via `tsx`
- `netlify.toml` : configuration de deploiement web Netlify
- `.env.example` : variables Vite / Supabase

## Notes

- En desktop, les donnees passent par Electron et sont stockees dans SQLite.
- En web, la couche Supabase est preparee pour la synchronisation centralisee.
- La synchronisation offline/online est prete au niveau de l'architecture et peut etre etendue sur la prochaine iteration.
