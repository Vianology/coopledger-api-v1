# CoopLedger API – Production Ready

## Prérequis
- Node.js 20+
- PostgreSQL (Neon)
- Redis (Upstash ou self-hosted)
- Comptes : Cloudinary, Pinata, FedaPay, Google OAuth, GOWA API

## Installation
```bash
git clone ...
npm install
cp .env.example .env  # remplir les valeurs
npx prisma migrate dev --name init
npm run build
npm start# coopledger-api-v1
