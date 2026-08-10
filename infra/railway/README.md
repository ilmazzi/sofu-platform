# Deploy Railway di Sofu

Questa guida e scritta per usare il **dashboard Railway**, non la CLI.

Segue la documentazione ufficiale Railway su:

- monorepo: progetto vuoto, servizi vuoti, poi collegamento al repo;
- Laravel: app HTTP, worker e scheduler separati;
- Dockerfile custom: variabile `RAILWAY_DOCKERFILE_PATH`;
- variabili tra servizi: sintassi `${{nome-servizio.NOME_VARIABILE}}`.

## Risultato finale

Dentro un solo progetto Railway creerai:

```txt
sofu-platform
  Postgres    database
  api         Laravel API
  web         sito pubblico React + proxy /api verso api
  worker      queue worker Laravel
  scheduler   scheduler Laravel
```

Redis **non e obbligatorio per partire**.

Partiamo senza Redis, usando:

```env
QUEUE_CONNECTION=database
CACHE_STORE=database
```

Redis si potra aggiungere dopo, se nel tuo dashboard Railway lo trovi come template/database.

## Prima di iniziare

Railway deploya dal repository GitHub, quindi prima devi avere `main` pushato:

```bash
git push origin main
```

Se `main` non e pushato, Railway non vedra le ultime modifiche.

## 1. Crea un progetto vuoto

Nel dashboard Railway:

1. Click su **New Project**.
2. Scegli **Empty Project**.
3. Chiamalo per esempio:

```txt
sofu-platform
```

Non partire da **Deploy from GitHub repo**.

Per un monorepo, la doc Railway consiglia di creare prima il progetto/servizi vuoti e poi collegare ogni servizio al repo.

## 2. Crea Postgres

Nel project canvas:

1. Click su **Create** o **New**.
2. Cerca **Postgres** o **PostgreSQL**.
3. Crea il servizio database.
4. Rinominalo esattamente:

```txt
Postgres
```

Il nome e importante per usare questa variabile:

```env
${{Postgres.DATABASE_URL}}
```

## 3. Crea i servizi vuoti

Nel project canvas crea quattro **Empty Service**:

```txt
api
web
worker
scheduler
```

Devono essere servizi vuoti, non direttamente "Deploy from GitHub repo".

Per ogni servizio:

1. Apri il servizio.
2. Vai in **Settings**.
3. Sezione **Source**.
4. Collega il repository GitHub `sofu-platform`.
5. Branch: `main`.
6. Root directory: lascia la root del repo.

Non impostare root directory su `apps/api` o `apps/web`, perche i Dockerfile Railway stanno in:

```txt
infra/railway/
```

e hanno bisogno di vedere tutto il monorepo.

## 4. Configura api

Servizio Railway:

```txt
api
```

### Variables

Nel servizio `api`, vai in **Variables** e inserisci:

```env
RAILWAY_DOCKERFILE_PATH=infra/railway/api.Dockerfile
PORT=8080

APP_NAME=Sofu
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:CHANGE_ME

APP_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}
DB_SSLMODE=require

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=file

SANCTUM_STATEFUL_DOMAINS=${{web.RAILWAY_PUBLIC_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}

PAYMENT_PROVIDER=mock
SIMULATION_ENABLED=false
SOFU_PAYMENT_ATTRITION_BUFFER=0.10
```

### Networking

Nel servizio `api`:

1. Vai in **Settings**.
2. Vai in **Networking**.
3. Click su **Generate Domain**.

Il dominio pubblico di `api` serve a farlo raggiungere dal servizio `web`.

L'utente finale non deve usare questo dominio.

### Healthcheck

Se Railway ti chiede un healthcheck path, usa:

```txt
/api/v1/health
```

## 5. Configura web

Servizio Railway:

```txt
web
```

Questo e l'unico dominio che aprirai nel browser.

### Variables

Nel servizio `web`, vai in **Variables** e inserisci:

```env
RAILWAY_DOCKERFILE_PATH=infra/railway/web.Dockerfile
PORT=8080

VITE_API_URL=
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# IMPORTANTE: questa variabile viene “infornata” nel build Docker.
# Dopo averla impostata con la chiave reale da Stripe Dashboard → Redeploy del servizio web.
# Se resta pk_test_CHANGE_ME, Stripe risponde 401 e i campi carta non si montano.

API_UPSTREAM=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

Importante:

- `VITE_API_URL` deve restare vuota.
- Il browser chiamera `/api/...` sul dominio `web`.
- Caddy dentro `web` inoltrera `/api/...` al servizio `api`.

### Networking

Nel servizio `web`:

1. Vai in **Settings**.
2. Vai in **Networking**.
3. Click su **Generate Domain**.

Questo e il dominio principale da aprire.

### Healthcheck

Se Railway ti chiede un healthcheck path, usa:

```txt
/
```

## 6. Configura worker

Servizio Railway:

```txt
worker
```

### Variables

Metti le stesse variabili del servizio `api`.

L'unica cosa specifica del servizio e:

```env
RAILWAY_DOCKERFILE_PATH=infra/railway/api.Dockerfile
```

### Start command

In **Settings -> Deploy -> Custom Start Command**, inserisci:

```bash
sofu-railway-run-worker
```

Non generare dominio pubblico per `worker`.

## 7. Configura scheduler

Servizio Railway:

```txt
scheduler
```

### Variables

Metti le stesse variabili del servizio `api`.

L'unica cosa specifica del servizio e:

```env
RAILWAY_DOCKERFILE_PATH=infra/railway/api.Dockerfile
```

### Start command

In **Settings -> Deploy -> Custom Start Command**, inserisci:

```bash
sofu-railway-run-scheduler
```

Non generare dominio pubblico per `scheduler`.

## 8. Genera APP_KEY

In locale:

```bash
cd apps/api
php artisan key:generate --show
```

Copia il valore in Railway come `APP_KEY` su:

```txt
api
worker
scheduler
```

## 9. Primo deploy

Ordine consigliato:

1. Deploy `Postgres`.
2. Deploy `api`.
3. Deploy `web`.
4. Deploy `worker`.
5. Deploy `scheduler`.

Se un servizio parte prima che tutte le variabili siano impostate, puo fallire. Non e grave: completa le variabili e fai redeploy.

## 10. Migrazioni

Dopo che `api` e deployato:

1. Apri il servizio `api`.
2. Apri una shell/console Railway del servizio.
3. Esegui:

```bash
php artisan migrate --force
```

Solo per staging/demo:

```bash
php artisan db:seed --force
```

Non fare seed in produzione vera.

## 11. Test

Apri il dominio pubblico del servizio:

```txt
web
```

Poi testa:

```txt
https://DOMINIO_WEB/api/v1/health
```

Deve rispondere:

```json
{"status":"ok","service":"sofu-api"}
```

Se funziona questo URL, significa che:

- `web` serve correttamente React;
- `web` sta inoltrando `/api` ad `api`;
- `api` sta girando;
- le variabili principali sono lette correttamente.

## 12. Pagamenti Stripe

Per staging puoi lasciare:

```env
PAYMENT_PROVIDER=mock
```

Per produzione vera, su `api`, `worker`, `scheduler` imposta:

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Su `web` imposta:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Non mettere mai le chiavi Stripe nel repo.

## 13. Se vuoi aggiungere Redis dopo

Se nel tuo dashboard Railway trovi Redis:

1. Crea il servizio Redis dal template/database.
2. Rinominalo:

```txt
Redis
```

3. Su `api`, `worker`, `scheduler` cambia:

```env
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_URL=${{Redis.REDIS_URL}}
```

4. Redeploy di `api`, `worker`, `scheduler`.

Se Redis non lo trovi, non blocca il deploy: la queue database funziona per partire.

## 14. Dominio custom

Quando avrai il dominio vero:

1. Aggiungi il dominio custom solo al servizio `web`.
2. Aggiorna su `api`, `worker`, `scheduler`:

```env
APP_URL=https://tuodominio.it
FRONTEND_URL=https://tuodominio.it
SANCTUM_STATEFUL_DOMAINS=tuodominio.it
CORS_ALLOWED_ORIGINS=https://tuodominio.it
```

3. Su `web`, lascia:

```env
VITE_API_URL=
```

## Note importanti

- Railway non usa il nostro `docker-compose.yml` per questo deploy.
- Ogni servizio usa un Dockerfile tramite `RAILWAY_DOCKERFILE_PATH`.
- Crea i servizi come **Empty Service**, poi collega il repo.
- Non cambiare root directory: resta sulla root del monorepo.
- Non usare `route:cache` finche le route closure non vengono convertite in controller.
- `worker` e `scheduler` non devono avere dominio pubblico.
- Per partire non serve Redis: Postgres basta per DB, cache database e queue database.
