# PedsVitals 3D (Production Build)

An interactive game to learn pediatric vitals and age-appropriate assessment approaches.
Built with Vite, Tailwind (JIT), Three.js, GSAP and WebAudio.

## Scripts
- `npm install`
- `npm run dev` (http://localhost:5173)
- `npm run build` (outputs to `dist/`)
- `npm run preview` (serve the build locally)

## Notes
- Tailwind is compiled from `src/styles.css` into a minimized CSS.
- The game logic is in `src/main.js` and `src/modules/*`.
- No external audio/image assets required. You can add Howler-based SFX easily.
