# site-intern

Application React/Vite pour le site interne du BDE Epitech Réunion.

## Démarrage

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` lance le serveur de développement.
- `npm run build` génère la version de production.
- `npm run preview` prévisualise le build localement.

## Notes

- Créez un fichier `.env.local` à partir de `.env.example` et renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Si vous voulez garder une validation locale en attendant la whitelist Supabase, définissez `VITE_ALLOWED_EMAILS` avec une liste d&apos;emails séparés par des virgules.
- Le frontend lit une table `events` contenant au minimum `id`, `title`, `date`, `time`, `location`, `description`, `price`, `places`, `visibility`, `schedule` et `activities`.
- Les appels auth et data passent automatiquement sur Supabase quand les variables d’environnement sont présentes, sinon l’app reste utilisable en mode local.
# site-intern