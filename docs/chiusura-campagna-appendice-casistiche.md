# Appendice — Tutte le casistiche (codici A…F)

Questo file è il **dettaglio completo** per team, FAQ e checklist.  
La **versione leggibile** con diagrammi è **`chiusura-campagna-leggibile.html`** (apri nel browser; stampa → PDF).

Specifica tecnica: [`campaign-funding-and-deadline.md`](campaign-funding-and-deadline.md).

---

## Parte A — Durante la raccolta e alla deadline (nessun addebito ancora)

| # | Situazione | Esito alla verifica di chiusura | Soldi addebitati in questo round? |
|---|------------|----------------------------------|-------------------------------------|
| **A1** | Non ci sono abbastanza adesioni **valide** (metodo di pagamento accettato) per obiettivo **+ margine**. | **Non finanziata** | **No** |
| **A2** | C’erano abbastanza persone, ma **prima della deadline** alcune **annullano** e si scende sotto soglia. | **Non finanziata** | **No** |
| **A3** | L’obiettivo (con margine) era raggiunto prima, ma **non** alla deadline. | **Non finanziata** | **No** |
| **A4** | Adesione **senza** metodo valido: non conta nel numero decisivo. | Se senza di lei non si arriva alla soglia → **Non finanziata** | **No** |
| **A5** | Come **A4**, ma completa carta/conto **in tempo** (sistema **entro** fine ufficiale). | Può far raggiungere la soglia | Ancora **no** addebito |
| **A6** | Adesione registrata **dopo** la fine ufficiale. | Non entra in **questa** chiusura | **No** |
| **A7** | Obiettivo + margine alla deadline, adesioni valide e in tempo. | **Finanziata** | Non ancora → fase pagamenti |

**Full bloom:** tetto massimo opzionale dopo l’obiettivo — non obbligatorio per essere finanziati; curare il copy in UI.

---

## Parte B — Dopo verifica: non finanziata

| # | Situazione | Cosa succede |
|---|------------|----------------|
| **B1** | Esito **non finanziata** (motivi tabella A, tranne A7). | **Nessun addebito** questo round |
| **B2** | Si vuole spostare la data **dopo** una prima esito non finanziata. | Il primo esito resta storico → **nuovo ciclo** (Parte E), non “semplice spostamento data” |

---

## Parte C — Panoramica dopo **finanziata**

1. Si possono avviare **addebiti** sui metodi salvati.  
2. **Prezzo unico** di campagna **al momento dell’incasso** del batch (non il prezzo del primo giorno dell’adesione).  
3. Non tutti i pagamenti passano al primo tentativo: è normale.

---

## Parte D — Pagamenti dopo **finanziata** (per singolo sostenitore)

| # | Situazione | Cosa succede | Campagna torna “non finanziata”? |
|---|------------|--------------|-----------------------------------|
| **D1** | Primo tentativo **ok** | **Pagato** | **No** |
| **D2** | Primo tentativo **fallisce** | Solleciti automatici, **in recupero** | **No** |
| **D3** | Dopo automatici ancora no | **Contatto diretto**, in recupero | **No** |
| **D4** | Dopo tutto, ancora no | **Fallito definitivo**; creator informato | **No** (non si ribalta l’esito chiusura solo per questo) |
| **D5** | Pochi insoluti vs **margine** obiettivo | Margine assorbe il rischio previsto | **No** |
| **D6** | Molti insoluti oltre il margine | Policy operativa (comunicazioni, azioni) | **No**, salvo regole eccezionali future |

---

## Parte E — Secondo round (dopo non finanziata)

| # | Situazione | Cosa succede |
|---|------------|----------------|
| **E1** | Nuovo ciclo, **nuova** data fine | Nuova verifica finale |
| **E2** | Chi era al round 1 | **Opt-in** esplicito al round 2 |
| **E3** | PM ancora valido | Riuso possibile; se scaduto → aggiornare |
| **E4** | Round 1 non finanziata | Storico invariato; nessun addebito R1 |
| **E5** | Round 2 **finanziata** | Addebiti come schema (prezzo a incasso di quel round) |
| **E6** | Round 2 ancora non finanziata | Nessun addebito quel round |
| **E7** | Non partecipa al round 2 | Fuori dal conteggio R2 |

---

## Parte F — Spostare la data di fine

| # | Situazione | Cosa succede |
|---|------------|----------------|
| **F1** | Prima della **prima** verifica finale | Backoffice può **posticipare** deadline |
| **F2** | Dopo la prima verifica | Non si corregge solo spostando la data → **nuovo ciclo** dove previsto |
