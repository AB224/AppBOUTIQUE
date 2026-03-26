# AppBoutique

Application web complete de gestion pour une epicerie:

- React + Vite pour le frontend
- Node.js + Express pour le backend
- MongoDB avec Mongoose
- Authentification JWT avec roles admin/employe
- Gestion produits, caisse, stock, clients, factures et tableau de bord
- Generation PDF et envoi email via Gmail SMTP

## Demarrage

1. Installer les dependances:

```bash
npm install
```

2. Copier `server/.env.example` vers `server/.env` et renseigner les variables.

3. Creer un administrateur par defaut:

```bash
npm run seed:admin
```

4. Lancer l'application:

```bash
npm run dev
```

## Comptes

Le script de seed cree un compte admin configurable via les variables `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

## Deploiement

- Frontend: Vercel
- Backend: Render
- Base de donnees: MongoDB Atlas
