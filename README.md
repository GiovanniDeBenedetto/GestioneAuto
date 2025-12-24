# Skylong - Frontend per hosting su GitHub Pages

**Descrizione**
Questo progetto è una copia frontend ispirata al sito https://skylong.altervista.org. È pensato per essere pubblicato su **GitHub Pages** (hosting statico). Il backend non è incluso: il progetto usa il tuo Google Apps Script come API (fornito dall'utente) per leggere e scrivere i record.

**Funzionalità**
- Pagina di **login** che salva `username` e `preferredMachine` nel `localStorage`.
- Pagina principale con form per aggiungere un record (usa jQuery per le chiamate API).
- Se non trova le credenziali nel `localStorage`, reindirizza automaticamente alla pagina di login.
- Pagina **Statistiche** che mostra la tabella dello storico, grafico (Chart.js) e pulsanti per eliminare un record (la cancellazione richiede che l'API Google Script supporti una chiamata di delete via POST con `{ token, action: 'delete', id }`).
- Manifest e service worker minimi per rendere la webapp "installabile" (PWA).

**Setup / Installazione**
1. Scarica e decomprimi lo zip fornito in questo repository.
2. Personalizza l'API endpoint se necessario (file `js/app.js` e `js/statistics.js`, variabile `API_URL`).
3. Commit dei file nel repository GitHub e abilita GitHub Pages (branch `main` o `gh-pages`).
4. Apri `https://<tuo-user>.github.io/<tuo-repo>/login.html` e accedi.

**API**
- Endpoint usato di default (fornito dall'utente):
  `https://script.google.com/macros/s/AKfycbxkWY9YEU3Ip_JN_Ag1zIZ3-8HaXaktTsW0nOyZOt0I3h_XqXS2gSbGPeGa21CQebwR/exec`
- GET: legge tutti i record (il codice assume risposta JSON con struttura `{ success:true, rows:[...] }`).
- POST: aggiunge record (JSON nel body). Esempio:
  ```js
  {
    token: "Stellina",
    macchina: "Fiat",
    autista: "Mario",
    date: "2025-11-24",
    km: 100,
    eur: 20,
    note: "Da HTML console"
  }
  ```
- DELETE (opzionale): la pagina Statistiche invia POST `{ token, action:'delete', id }`. Se la tua Apps Script non gestisce questa azione, la cancellazione fallirà: in tal caso cancella manualmente dallo spreadsheet o modifica lo script per supportare la rimozione.

**Note importanti**
- Le chiamate alle Google Apps Script possono essere bloccate da CORS/Autorizzazioni: assicurati che lo script sia deployato come `Anyone, even anonymous` (se vuoi accesso pubblico) o che la tua configurazione consenta le chiamate dal dominio GitHub Pages.
- Se riscontri problemi con la cancellazione, verifica lo script Apps Script: è necessario intercettare `action: 'delete'` e rimuovere la riga con l'`id`.
- Ho incluso un file segnaposto `app/app-placeholder.apk` per simulare il pulsante "Scarica App". Sostituiscilo con la tua APK reale se disponibile.

**Personalizzazione Stile**
- Il CSS in `css/styles.css` è realizzato mobile-first e riprende i colori e lo stile del sito originale; sentiti libero di modificarlo.

**Domande / Supporto**
Se vuoi, posso:
- adattare il CSS esattamente copiando file originali (se mi fornisci accesso o i file),
- modificare la logica di delete in base al codice della tua Apps Script,
- aggiungere autenticazione più solida (JWT, OAuth) — richiede modifiche lato server/script.
