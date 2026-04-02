# AppBoutique

Application web complete de gestion pour une epicerie.

- React + Vite pour le frontend
- Node.js + Express pour le backend
- MongoDB avec Mongoose
- Authentification JWT avec roles admin/employe
- Gestion produits, caisse, stock, clients, factures et tableau de bord
- Generation PDF et envoi email via Gmail SMTP
- Connexion Google OAuth + code de verification par email

## Demarrage local Windows

Utilise de preference les scripts Windows a la racine pour eviter les problemes de chemin PowerShell `\\?\...`.

1. Renseigner `server/.env` et `client/.env`
2. Installer les dependances:

```bash
npm install
```

3. Creer l'admin par defaut:

```bash
npm run seed:admin
```

4. Lancer le backend:

```bash
.\start-server.cmd
```

5. Lancer le frontend dans une autre fenetre:

```bash
.\start-client.cmd
```

Ou lancer les deux:

```bash
.\start-dev.cmd
```

## Variables critiques

- `server/.env` doit contenir une vraie `MONGO_URI` Atlas
- `GMAIL_SMTP_PASS` doit etre un mot de passe d'application Google
- `client/.env` doit contenir `VITE_GOOGLE_CLIENT_ID`

## Deploiement

- Frontend: Render Static Site
- Backend: Render Web Service
- Base de donnees: MongoDB Atlas
- Configuration: `render.yaml`
