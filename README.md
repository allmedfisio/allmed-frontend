# AllMed — Frontend

Gestionale web della clinica **ALLMEDfisio**: accettazione, sala d'attesa, postazione medico,
ticket, follow-up, compensi e statistiche WhatsApp.

Applicazione **Ionic 8 / Angular 19** distribuita come PWA su Firebase Hosting.
Parla con il backend tramite REST e Socket.IO.

- **Backend**: <https://github.com/allmedfisio/allmed-backend>
- **Produzione**: <https://allmed-manager-frontend.web.app>
- **Sito vetrina** (altro dominio, non è il gestionale): <https://www.allmedfisio.it>

## Indice

1. [Stack](#stack)
2. [Avvio in locale](#avvio-in-locale)
3. [Ambienti](#ambienti)
4. [Pagine e ruoli](#pagine-e-ruoli)
5. [Come è fatta l'applicazione](#come-è-fatta-lapplicazione)
6. [Build](#build)
7. [Deploy](#deploy)
8. [Service worker e cache](#service-worker-e-cache)
9. [Diagnostica](#diagnostica)
10. [Note e limiti noti](#note-e-limiti-noti)
11. [Struttura del repository](#struttura-del-repository)

## Stack

| Componente | Versione / ruolo |
|---|---|
| Angular | 19 (NgModule, lazy loading per pagina) |
| Ionic | 8 |
| TypeScript | 5.6 |
| Node.js | 20 (la stessa versione usata da GitHub Actions) |
| Realtime | `socket.io-client` 4 |
| Grafici | `chart.js` + `ng2-charts` |
| Editor testo | `ngx-quill` |
| Excel | `xlsx` (import/export pazienti) |
| Autenticazione | JWT in `localStorage`, decodificato con `jwt-decode` |
| PWA | `@angular/service-worker` con `ngsw-config.json` |
| App nativa | Capacitor 7 (configurato, non usato per la distribuzione) |

## Avvio in locale

Serve il backend in esecuzione (vedi il suo README) e Node 20.

```bash
npm ci
npm start          # ng serve → http://localhost:4200
```

L'app in sviluppo chiama `http://localhost:5000`: senza backend attivo la schermata di
login mostra un errore di rete, non un errore di credenziali.

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm start` | Server di sviluppo con ricarica automatica (`ng serve`). |
| `npm run build` | Build di sviluppo in `www/`. |
| `npx ng build --configuration production` | Build di produzione: sostituisce `environment.ts` con `environment.prod.ts`, hash dei file, budget. |
| `npm run build -- --configuration production` | La stessa build, usata da GitHub Actions. Vedi la nota sotto se hai npm 11. |
| `npm test` | Test Karma/Jasmine (`ng test`). |
| `npm run lint` | ESLint (`ng lint`). |

> Il vecchio `ionic serve` / `ionic build --prod` non serve più: gli script npm coprono tutto.

## Ambienti

| File | Uso | `apiUrl` |
|---|---|---|
| `src/environments/environment.ts` | sviluppo | `http://localhost:5000` |
| `src/environments/environment.prod.ts` | produzione | `https://allmed-backend.onrender.com` |

La sostituzione avviene in build tramite `fileReplacements` in `angular.json`. Per puntare a
un backend diverso basta modificare il file dell'ambiente e ricompilare.

## Pagine e ruoli

| Percorso | Pagina | Ruoli ammessi |
|---|---|---|
| `/login` | Accesso | pubblica |
| `/home` | Pagina di atterraggio | pubblica (nessun guard) |
| `/segreteria` | Accettazione: pazienti, chiamate, arrivi, archivio | `admin`, `segreteria` |
| `/medico` | Postazione medico: paziente in visita e prossimo | `admin`, `segreteria`, `medico` |
| `/sala-attesa` | Schermo per la sala d'attesa | `admin`, `segreteria`, `sala-attesa` |
| `/ticket-config` | Template del ticket e immagine promozionale | **nessun guard** (le API richiedono comunque il token) |
| `/follow-up` | Pazienti archiviati | `admin`, `segreteria` |
| `/calcolo-compensi` | Calcolatore compensi (solo calcolo locale) | `admin`, `segreteria` |
| `/analisi-marketing` | Statistiche messaggi WhatsApp | `admin` |
| `/business-analytics` | **Rimossa**: reindirizza a `/segreteria` | — |

Cosa fa ciascuna:

- **Segreteria** — elenco dei pazienti con numero progressivo, creazione e modifica
  (modali `add-patient-modal`, `edit-patient-modal`, `date-filter-modal`), segnalazione
  arrivo, chiamata, archiviazione, import massivo da Excel.
- **Medico** — mostra il paziente attualmente in visita e il prossimo in attesa del medico
  selezionato; la chiamata aggiorna lo stato per tutti i client collegati.
- **Sala d'attesa** — schermo pensato per un monitor: numeri e nomi dei pazienti in attesa.
- **Ticket config** — modifica il template del ticket stampato (`ticketTemplates/default`) e
  carica l'immagine promozionale su Firebase Storage.
- **Follow-up** — pazienti con stato `in_archivio`, con possibilità di eliminarli.
- **Calcolo compensi** — due calcolatori locali (percentuale di trattenuta e compenso per
  seduta). Non chiama il backend: i valori non vengono salvati.
- **Analisi marketing** — invii, clic e tasso di clic dei messaggi WhatsApp, con grafico
  giornaliero e ultimi 20 invii.

## Come è fatta l'applicazione

```
AppModule
 ├─ TokenInterceptor      aggiunge Authorization: Bearer <token> a ogni chiamata HTTP
 ├─ AuthGuardService      blocca le rotte senza token o con ruolo non ammesso
 ├─ AuthService           login, profilo (/auth/me), ruolo dal JWT, logout
 └─ pagine lazy          una NgModule per pagina, caricate on demand
```

- **Autenticazione**: dopo il login il token e il ruolo vengono salvati in `localStorage`
  (`token`, `role`). Il ruolo è letto dal payload del JWT, non da una chiamata.
  `AuthGuardService` controlla `route.data.roles`; se il ruolo non è ammesso torna al login.
- **Scadenza**: il token dura 12 ore e non viene rinnovato automaticamente. Alla scadenza le
  API rispondono `403` e serve rifare l'accesso.
- **Realtime**: `patient.service.ts` e `doctor.service.ts` aprono una connessione Socket.IO
  verso `environment.apiUrl` con `transports: ['websocket']`, entrano nella stanza adatta
  (`joinSegreteria`, `joinSala`, `joinStudio`) e aggiornano gli elenchi sugli eventi
  `patientsSnapshot`, `patientChanged`, `patientRemoved`, `doctorsUpdated`.
- **Stato**: gli elenchi vivono nei servizi come `BehaviorSubject`/`Observable`; le pagine si
  sottoscrivono. Non c'è uno store globale (niente NgRx).
- **Servizi**: `auth`, `auth-guard`, `token.interceptor`, `patient`, `doctor`, `template`,
  `whatsapp`, `marketing-analytics`, `version`.

## Build

```bash
npm ci
npx ng build --configuration production
```

L'output finisce in **`www/`** (ignorata da git). La build fallisce se il bundle iniziale
supera **5 MB** o se un componente supera **8 KB** di stili: sono i budget in `angular.json`.

> **Nota npm 11**: con npm 11 (per esempio Node 24 in locale) il comando
> `npm run build -- --configuration production` non passa il flag a `ng` — npm lo
> interpreta come propria configurazione e la build parte in modalità sviluppo. In quel
> caso usa `npx ng build --configuration production`. Sui runner GitHub (Node 20, npm 10)
> il comando del workflow funziona ed è quello che pubblica davvero.

## Deploy

Il deploy è automatico, non si carica nulla a mano.

| Workflow | Quando parte | Effetto |
|---|---|---|
| `.github/workflows/firebase-hosting-production.yml` | push su `main` | build di produzione e pubblicazione sul canale `live` |
| `.github/workflows/firebase-hosting-pull-request.yml` | apertura/aggiornamento di una PR | build e anteprima su un canale temporaneo |

Dettagli:

- Progetto Firebase: **`allmed-manager-frontend`** (`.firebaserc`, `firebase.json`).
- Cartella pubblicata: `www/`, con rewrite SPA `** → /index.html`.
- Secret usato dal workflow: `FIREBASE_SERVICE_ACCOUNT_ALLMED_MANAGER_FRONTEND`.
- Node 20 e `npm ci`: se il `package-lock.json` non è allineato a `package.json`, il workflow
  fallisce subito.

**Rilasciare una modifica**

```bash
npx ng build --configuration production   # verifica locale
git add -A
git commit -m "feat: ..."
git push origin main                      # parte il deploy
```

Controlla l'esito in GitHub → *Actions* → run "Deploy to Firebase Hosting on Main Push":
deve essere verde (circa 2 minuti). Poi apri il sito in **finestra anonima** e verifica.

**Rollback**: `git revert <commit>` e push (il deploy riparte da solo). In alternativa, da
GitHub → *Actions* → run precedente → *Re-run all jobs*: ricostruisce e ripubblica quel commit.

## Service worker e cache

L'app è una PWA: il service worker tiene in cache HTML, JS e CSS (`ngsw-config.json`, gruppo
`app` in `prefetch`). È la causa numero uno di "ho pubblicato ma vedo ancora la versione
vecchia".

- L'aggiornamento viene scaricato in background e applicato **al successivo caricamento
  completo** della pagina.
- Per forzarlo su un PC: chiudi **tutte** le schede del gestionale e riaprila. Se non basta,
  DevTools (F12) → *Application* → *Service Workers* → **Update**, poi **Unregister** e
  ricarica con Ctrl+F5.
- Ogni build di produzione ha hash nei nomi dei file (`outputHashing: all`), quindi una
  versione nuova non può essere servita "a metà".
- Dopo un deploy, la prima apertura può mostrare ancora la versione precedente per pochi
  secondi: è normale.

## Diagnostica

| Sintomo | Causa probabile | Rimedio |
|---|---|---|
| "Nessun utente" al login con credenziali giuste | Utente assente in `admins` sul backend, o backend puntato al progetto Firebase sbagliato | Verifica la collezione `admins` e `/ping/health` del backend. |
| Errore di rete al login | Backend non avviato (in locale) o in pausa (Render) | Avvia il backend; in produzione riprova dopo 30-60 secondi. |
| Ogni chiamata risponde `403` | Token scaduto (12 ore) o assente | Logout e nuovo accesso. |
| `403` solo su una pagina | Ruolo non ammesso per quella rotta | Controlla il campo `role` dell'utente. |
| Dopo il deploy vedo la versione vecchia | Cache del service worker | Vedi [Service worker e cache](#service-worker-e-cache). |
| La sala d'attesa non si aggiorna | Socket non connesso | Controlla la console del browser: deve esserci una connessione WebSocket verso il backend. |
| Build fallita per budget | Bundle oltre 5 MB o stili oltre 8 KB | Riduci la dipendenza o alza il budget in `angular.json` (con criterio). |
| Workflow rosso su `npm ci` | Lockfile non allineato | `npm install`, committa `package-lock.json`. |
| Pagina bianca dopo il deploy | Errore in fase di bootstrap | Apri la console: cerca errori di import o di versione Angular. |

## Note e limiti noti

- **`/ticket-config` non ha guard**: la pagina si apre senza login, ma le chiamate al backend
  falliscono senza token. Da valutare se aggiungere il guard.
- **Ruolo nel `localStorage`**: il guard si fida del valore salvato. La sicurezza vera è lato
  backend, che ricontrolla il ruolo nel JWT.
- **Nessun refresh token**: dopo 12 ore l'utente deve rientrare.
- **Dipendenze non usate**: `@angular/fire`, `firebase` e `rxfire` sono nel `package.json` ma
  il codice non usa Firestore lato client. Si possono rimuovere.
- **`VERSION` duplicata**: `src/version.ts` e `src/app/version.ts` contengono `1.0.0` e vanno
  tenute allineate a `package.json` a mano.
- **Capacitor non configurato per la distribuzione**: `capacitor.config.ts` ha ancora
  `appId: 'io.ionic.starter'`. L'app si usa come PWA.
- **Test**: le 15 spec sono gli scheletri generati dal CLI ("should create"), non coprono la
  logica. La CI non esegue i test, solo la build.
- **`getByStudy$`** in `patient.service.ts` chiama una rotta deprecata (`410`) e non è usato
  da nessuna pagina: codice morto da rimuovere.
- **`cors.json`** nella root è la configurazione CORS del bucket Firebase Storage.

## Struttura del repository

```
src/
  app/
    pages/                una cartella per pagina (segreteria, medico, sala-attesa,
                          login, ticket-config, follow-up, calcolo-compensi,
                          analisi-marketing)
    home/                 pagina di atterraggio
    services/             auth, guard, interceptor, patient, doctor, template,
                          whatsapp, marketing-analytics, version
    shared/               componenti riusabili (kpi-card, chart-card)
    *-modal/              modali di segreteria (aggiungi/modifica paziente, filtro date,
                          aggiungi medico)
    app-routing.module.ts rotte, lazy loading e ruoli
    app.module.ts         provider globali (interceptor, locale it-IT, grafici)
  environments/           environment.ts (dev) e environment.prod.ts (produzione)
  theme/                  variabili di stile Ionic
  assets/                 immagini e risorse statiche
  version.ts              versione mostrata nell'app
ngsw-config.json          cache del service worker
firebase.json             hosting: pubblica www/, rewrite SPA
angular.json              build, budget, sostituzione ambienti
```
