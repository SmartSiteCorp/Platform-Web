# Platform-Web

SmartSite web platform monorepo.

## Objectif

Ce depot contient la plateforme web SmartSite :

- un backend API pour la logique metier, les permissions, les migrations SQL et la documentation Swagger/OpenAPI ;
- un frontend web pour les dashboards et interfaces metier ;
- un socle partage pour les contrats TypeScript communs si le besoin apparait.

L'objectif de cette initialisation est d'avoir une base stricte, maintenable et evolutive.

## Architecture

```text
Platform-Web/
├── apps/
│   ├── api/      # Backend NestJS, PostgreSQL, migrations SQL, Swagger/OpenAPI
│   └── web/      # Frontend Next.js, React, Tailwind, client API genere
├── packages/
│   └── shared/   # Code TypeScript partage entre les apps si necessaire
├── docker-compose.yml
└── package.json
```

Le projet est organise en monorepo npm workspaces afin de centraliser les commandes, le typage, les tests et les dependances principales tout en gardant une separation claire entre le backend et le frontend.

## Choix Techniques

### Backend

Le backend utilise NestJS avec TypeScript strict.

Ce choix permet de garder une architecture modulaire, adaptee a une API metier complexe comme SmartSite : organisations, utilisateurs, roles, chantiers, taches, fichiers, drone, IA, scan 3D et AR.

Le backend contient deja :

- une structure par modules ;
- une validation globale des entrees ;
- une configuration CORS ;
- une securite HTTP de base avec Helmet ;
- Swagger/OpenAPI ;
- PostgreSQL via SQL pur avec `pg`.

### Base de donnees

Le projet utilise PostgreSQL et du SQL pur, sans ORM.

Ce choix donne un controle direct sur :

- les relations ;
- les contraintes ;
- les index ;
- les transactions ;
- les performances ;
- l'evolution precise du schema.

Le schema SmartSite est versionné avec des migrations SQL dans `apps/api/database/migrations`.

### Frontend

Le frontend utilise Next.js, React, TypeScript et Tailwind.

Ce choix permet de construire une interface moderne, typée, responsive et compatible avec une evolution progressive des dashboards SmartSite.

Les composants UI s'appuient sur des bibliotheques robustes lorsque c'est utile, notamment Radix UI pour l'accessibilite et Lucide pour les icones.

### Frontend / Backend

Le backend expose une specification OpenAPI via Swagger.

Le frontend genere ensuite un client API type avec `openapi-ts`.

Avantages :

- le frontend consomme les vrais types exposes par le backend ;
- les duplications de types sont limitees ;
- les erreurs de contrat API sont detectees plus vite ;
- la documentation Swagger reste synchronisee avec l'API.

## Migrations SQL

Les migrations sont decoupees par domaine metier :

```text
000001_extensions_and_enums.sql
000002_organizations_users_roles.sql
000003_sites_planning_tasks.sql
000004_files_documents_task_evidence.sql
000005_devices_drone_missions_flights.sql
000006_scans_bim_ar.sql
000007_ai_processing_partners_notifications.sql
000008_seed_roles.sql
```

Ce decoupage evite un fichier SQL massif, difficile a relire et dangereux a modifier.

Le runner de migration est concu pour etre robuste :

- table `schema_migrations` ;
- checksum SHA-256 de chaque fichier ;
- transaction par migration ;
- verrou PostgreSQL pour eviter deux executions concurrentes ;
- execution ordonnee par prefixe numerique.

Regle importante : une migration deja appliquée ne doit pas etre modifiée. Pour faire evoluer la base, créer une nouvelle migration.

```bash
npm run db:migration:create -- add_feature_name
```

## Environnement

Le port PostgreSQL local est `5433` afin d'eviter les conflits avec une installation PostgreSQL locale sur `5432`.

## Commandes

Installation :

```bash
npm install
```

Demarrer PostgreSQL (ouvrir Docker avant):

```bash
npm run db:up
```

Executer les migrations :

```bash
npm run db:migrate
```

Demarrer le backend et le frontend :

```bash
npm run dev
```

Demarrer uniquement le backend :

```bash
npm run dev:api
```

Demarrer uniquement le frontend :

```bash
npm run dev:web
```

Verifier le projet :

```bash
npm run check
```

Builder le projet :

```bash
npm run build
```

Formatter le projet :

```bash
npm run format
```

Generer le client API frontend :

```bash
npm run generate:api-client
```

## Conventions Git

Les branches de feature suivent un nom explicite :

```text
feature/authentication
feature/drone-mission
fix/register-validation
chore/ci
```

Les messages de commit suivent le format Conventional Commits :

```text
type(scope): message court
```

Exemples :

```text
feat(auth): add organization registration
fix(web): remove deprecated TypeScript baseUrl
chore(ci): add GitHub Actions workflow
```

Types autorises :

```text
feat, fix, docs, style, refactor, test, chore, ci, build, perf
```

## URLs Locales

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000
Swagger:  http://localhost:4000/api/docs
Health:   http://localhost:4000/api/health
```

## Qualite

La base du projet impose :

- TypeScript strict ;
- ESLint ;
- Prettier ;
- tests avec Vitest ;
- documentation Swagger ;
- migrations SQL versionnees ;
- separation claire front/back ;
- generation de client API type ;
- application des principes SOLID et DRY autant que possible.

Le code metier doit rester lisible, decoupe et testable. Les gros fichiers, les fonctions trop complexes et les contournements de typage sont a eviter des le depart.
