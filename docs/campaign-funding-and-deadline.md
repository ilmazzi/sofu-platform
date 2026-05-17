# Campagna: deadline, funded / not funded, pledge e incasso (Fase 0)

Documento di **specifica di prodotto** per allineare team e implementazione (modello ispirato a Kickstarter, con le fasi Growing / Bloom / Blooming di Sofu).  
Le decisioni qui sono **vincolanti per le fasi successive**; le voci in *Decisione aperta* vanno chiuse prima di implementare pagamenti e scheduler.

---

## 1. Terminologia (linguaggio prodotto)

| Concetto | Significato |
|----------|-------------|
| **Seed / 0%** | Avvio campagna: nessun progresso verso il Bloom, o progresso misurato verso l’obiettivo Growing. |
| **Growing drops** | Fase **prima** del Bloom: le adesioni contano come “crescita dal seme”. |
| **100% / Bloom** | Raggiunto l’obiettivo di **Growing drops** in senso **operativo**: prenotazioni attive ≥ soglia che include il **cuscinetto** §2.3 (non il solo `target_supporters` “netto” se diverso). |
| **Cuscinetto (buffer incassi)** | Percentuale aggiuntiva nel calcolo della soglia Bloom/100% per coprire **incassi attesi mancanti** dopo *funded*; vedi §2.3. |
| **Blooming drops** | Dopo il Bloom: nuove adesioni nella fase di **fioritura**; naming distinto dalla crescita pre-Bloom. |
| **Full bloom** | **Tetto** massimo di posti nella fase Blooming (`full_bloom_drops`), non coincide con il “100%” del Bloom. |
| **Deadline** | Data/ora di fine raccolta impegni definita per campagna (`ends_at` o equivalente). |

**Nota:** la percentuale **0% → 100%** nel copy si riferisce al progresso verso il **Bloom** (obiettivo Growing, **con** cuscinetto §2.3 se applicato al denominatore/soglia), non al riempimento del Full bloom.

---

## 2. Regola centrale: *funded* vs *not funded*

Valutazione eseguita **non prima** della **deadline** (momento di cutoff definito sotto).

- **Funded** — se **entrambe** le condizioni sono vere **al momento della valutazione** (una tantum post-cutoff; inclusione dei drop secondo §2.4):
  1. **Deadline raggiunta** (istante di valutazione ≥ cutoff; vedi §2.1).
  2. **Condizione di Bloom ancora soddisfatta** in quel momento: `active_reservations_count >= soglia_Bloom` dove `soglia_Bloom` deriva da `target_supporters` e dal **cuscinetto** §2.3. Il conteggio **attivo** include solo prenotazioni **con metodo di pagamento valido** (§2.5), oltre alle regole contabili attuali. Non basta aver toccato il Bloom in un istante passato se, prima della valutazione, cancellazioni o altri eventi riportano il conteggio sotto soglia (vedi §5).

- **Not funded** — in tutti gli altri casi (deadline passata ma Bloom mai raggiunto entro cutoff; oppure valutazione anticipata vietata).

**Effetto *not funded*:** **nessun addebito** sugli impegni (pledge / drop); comunicazione chiara ai sostenitori e al creator.

**Effetto *funded*:** la campagna entra nel flusso di **incasso** sulle prenotazioni valide secondo §3 e §4.

### 2.1 Cutoff temporale (timezone)

- **Decisione chiusa:** la deadline è nella **timezone del creator**; l’istante di cutoff è la **fine del giorno calendario locale**: **23:59:59** (precisione al secondo) in quella timezone.
- **DST / ora legale:** usare un identificatore **IANA** (es. `Europe/Rome`) per la campagna, così il passaggio ora legale/solare è implicito; evitare offset fissi “+1” manuali.
- Regola tecnica: un solo **timezone per campagna** (IANA) e `ends_at` memorizzato in **UTC** (equivalente a quel 23:59:59 locale), con visualizzazione localizzata.

### 2.2 Bloom dopo la deadline?

- **Decisione chiusa:** la valutazione avviene **alla deadline** (cutoff §2.1). Se a quel momento il Bloom **non** risulta mai stato raggiunto entro il cutoff, la campagna è **not funded** e non si apre uno spiragio “retroattivo”. Nel modello prodotto **non** si prosegue oltre la deadline per “raggiungere il Bloom in ritardo”: la raccolta impegni è conclusa con l’esito della valutazione.

### 2.3 Cuscinetto (buffer) sui non-pagamenti nel calcolo del goal

- **Decisione chiusa:** prima di considerare raggiunto il **goal al 100% / Bloom**, la soglia operativa deve includere una percentuale **cuscinetto** rispetto al target di **offerte / posti** richiesti, così da prevedere realisticamente che una quota di sostenitori **non pagherà** dopo *funded* (carta, insufficient funds, ecc.) e comunque restare coperti verso l’obiettivo economico minimo.
- **Calibrazione — decisione chiusa (A):** un **solo default globale di piattaforma** (es. `sofu.payment_attrition_buffer` o equivalente), con valore numerico scelto **nel range indicativo 7%–15%** e **fissato in implementazione**; applicato a **tutte** le campagne. **Nessuna** scelta per-campagna lato creator. **Override** del valore solo da **backoffice** (casi eccezionali), con audit tracciato in Fase 1 o oltre.
- **Esempio di applicazione (teste):** `soglia_Bloom = ceil(target_supporters × (1 + cuscinetto))` con `cuscinetto` espresso come decimale (es. 0.10 = 10%). Se in futuro il goal fosse **monetario**, la stessa logica si applica all’obiettivo in valuta con le regole di aggregazione definite allora.
- **Trasparenza:** il creator (e, dove serve, il public copy) possono chiarire che la soglia include un margine realistico sui pagamenti, senza ambiguità sul “cosa si intende per obiettivo raggiunto”.

### 2.4 Race alla deadline: inclusione dei drop e valutazione

- **Decisione chiusa** (combinazione **B + ordine di valutazione tipo A**):
  - **Inclusione:** conta solo un drop **accettato e persistito dal backend** con timestamp **autorevole lato server** (es. creazione/conferma della prenotazione valida) tale che sia **≤ `ends_at`** (UTC, coerente con §2.1). Non si usa l’orologio del client né il “click” come prova di anteriorità alla deadline.
  - **Valutazione:** la transizione *funded* / *not funded* è **una tantum**, **dopo** il cutoff, su un insieme **coerente** di prenotazioni che soddisfano la regola di inclusione; implementazione **idempotente** (nessun doppio esito se il job riparte).
  - Richieste che completano **dopo** `ends_at` non entrano nel conteggio Bloom di quella chiusura.

### 2.5 Metodo di pagamento mancante o record “storici”

- **Decisione chiusa (Fase 1):** ai fini di **soglia_Bloom**, valutazione *funded* / *not funded* e incasso, una prenotazione **non** è conteggiata tra le **attive** se non ha un **metodo di pagamento valido** (allineato al **blocco netto** §3).
- **Migrazioni / legacy** senza PM: non entrano nel conteggio finché l’utente non completa il setup; se la conferma server cade **≤ `ends_at`**, vale §2.4. **Nessuna** eccezione del tipo “attivo senza PM” in Fase 1.
- **UX / ops:** solleciti al completamento prima del cutoff restano **consigliati**; non cambiano la regola contabile.

### 2.6 Estensione manuale della deadline (`ends_at`) e “seconda possibilità”

- **Decisione chiusa — spostamento semplice:** il **backoffice** può impostare un nuovo `ends_at` **successivo** (stessa **IANA** §2.1, valore **UTC** aggiornato).
- **Fase 1:** lo spostamento di `ends_at` è supportato **solo** se la campagna **non** ha ancora eseguito la **prima** valutazione finale *funded* / *not funded* (stessa chiusura, stesso “round”). Job e snapshot §2.4 usano l’`ends_at` **vigente** al cutoff; **idempotenza** come §2.4.
- **Prodotto futuro (dopo *not funded*):** può servire offrire una **seconda raccolta** al creator. La valutazione già avvenuta resta **storica** (non si “cancella” l’esito *not funded*). Il modello da prevedere è un **nuovo ciclo** (es. “round 2” / campagna riaperta): **nuovo** `ends_at`, eventuale stato dedicato, **nuova** valutazione *funded* / *not funded* al nuovo cutoff, con regole di inclusione §2.4 rispetto a **quella** deadline. **Non** è la stessa cosa dello spostamento di `ends_at` prima della prima chiusura. Il trattamento delle prenotazioni del round 1 è definito in **§2.7**; implementazione e copy restano **post–Fase 1**.

### 2.7 Round 2: prenotazioni round 1 nel nuovo ciclo

Si applica solo al **nuovo ciclo** dopo esito *not funded* (§2.6). **Implementazione fuori Fase 1**; la tabella fissa la **logica di prodotto** così design e API non divergono.

| Aspetto | Regola |
|--------|--------|
| **Conteggio Bloom / soglia in R2** | Le prenotazioni del round 1 **non** sono attive per R2 **automaticamente**. Serve un’**adesione esplicita al round 2** (es. “Resto dentro”, nuovo drop vincolato al ciclo). Il timestamp §2.4 per l’inclusione nel Bloom di R2 è la **conferma server** di quell’adesione, **≤ `ends_at` di R2**. |
| **Persistenza dati R1** | Gli esiti del round 1 restano **immutabili** in storico (*not funded*, nessun addebito). In R2 si creano **nuovi record** di prenotazione (o si collegano con `round` / `parent_reservation_id`); **non** si sovrascrive l’esito del round 1. |
| **Metodo di pagamento** | Come §2.5: si può **riusare** il PM se valido; se scaduto o invalidato, **aggiornamento obbligatorio** prima che la prenotazione R2 sia idonea a Bloom e incasso. |
| **Prezzo alla capture** | Stesso schema **§3 B (1)** nel batch *funded* **del round 2**: importo unico = prezzo campagna **nell’istante** di quel batch, non ereditato dalla promessa R1. |
| **Cuscinetto** | Stesso modello **§2.3** (percentuale globale di piattaforma) applicato al **conteggio** verso `soglia_Bloom` nel round 2; `target_supporters` / copy dell’obiettivo sono quelli **del ciclo R2** se il creator li riallinea. |
| **Renunciare a R2** | Chi non aderisce o cancella prima del cutoff R2 **non** è incluso nel Bloom R2; **nessun** addebito dal round 1 (già concluso *not funded*). |

---

## 3. Pledge (drop) e metodo di pagamento

- **Requisito:** per creare un drop valido, il sostenitore deve avere un **metodo di pagamento valido** registrato (o completare il setup nello stesso flusso del pledge).
- **Nessun metodo valido → nessun drop** (o drop solo in stato non confermante, da escludere: preferibile **blocco netto** per coerenza con incasso differito).
- **Decisione chiusa:** al pledge **nessun addebito**; si valida/salva solo un metodo di pagamento valido.

**Decisione chiusa — importo da incassare a *funded*:** **B — Prezzo alla capture**  
Si addebita l’importo **al momento dell’incasso** (tipicamente subito dopo valutazione *funded* / batch post–deadline), non lo snapshot al click. Serve **UX e copy** chiari: il sostenitore vede che il prezzo può evolvere fino al momento dell’addebito.

**Decisione chiusa — granularità del prezzo alla capture (sotto B):** **(1) Prezzo unico di campagna** per tutte le prenotazioni incluse nel batch *funded*: un solo valore, pari al **prezzo di campagna corrente** (es. `current_price_cents` o min/max se il modello lo prevede) **nell’istante** in cui si esegue l’incasso. Non si ricalcola un importo **per prenotazione** con il motore prezzi a T (es. differenze Growing vs Blooming nello stesso batch). È la scelta di prodotto coerente con “un prezzo di campagna che evolve” fino al momento dello sblocco.

| Riferimento | Descrizione |
|-------------|-------------|
| **A — Snapshot al pledge** | (Scartata) Importo fissato al pledge. |
| **B — Prezzo alla capture** | **Scelta.** Importo alla capture; sotto-B **(1)** = prezzo campagna unico all’istante del batch. |
| **B — sotto (2)** | (Scartata) Importo per prenotazione ricalcolato a T con motore prezzi. |
| **C — Ibrido** | (Scartata) |

---

## 4. Incasso post–*funded*

- Solo dopo stato **funded**: avvio **addebiti** (es. PaymentIntent off-session) sui metodi salvati, con retry e gestione fallimenti documentata.
- **Funded** non implica che tutti gli incassi vadano a buon fine: prevedere stati per prenotazione (pagato / fallito / in recupero) e policy di rimedio.

**Fallimenti di incasso — decisione chiusa (prodotto “C”):** non basarsi solo su un binario A/B “retry eterni vs cancellazione che abbassa il Bloom”. Prevedere:

1. **Solleciti automatici** — email/notifiche/in-app e finestre di retry coerenti con il provider di pagamento, prima e dopo il primo declino.
2. **Servizio di contatti diretti** — canale operativo (es. team/outreach) per gestire i casi che non si risolvono da soli con gli automatismi, con obiettivo di recupero pagamento e chiarezza verso il sostenitore.
3. **Coerenza con il cuscinetto §2.3:** il buffer nella soglia Bloom riduce la probabilità che pochi default post-deadline compromettano l’obiettivo; **non** sostituisce solleciti e contatti. La policy se, dopo tutti i tentativi, restano importi mancanti materiali (es. superamento del buffer reale) va dettagliata in Fase 1 (es. cosa comunica il creator, eventuali azioni residue); **non** si ribalta retroattivamente la valutazione *funded* / *not funded* della campagna solo perché un pagamento fallisce, salvo regole eccezionali future esplicitate.

**Parametri operativi e “SLA” (decisione Fase 0):** frequenza solleciti, numero massimo di tentativi e finestre temporali si **definiscono in Fase 1** in **config** e in base alle capacità del **payment provider** (es. retry Stripe). In Fase 0 **non** si fissano numeri (giorni, N email) né **SLA** commerciali verso creator o sostenitori; eventuali promesse “entro X giorni” restano prodotto/marketing successivo.

---

## 5. Edge cases (checklist)

- [x] Deadline con **nessun** drop idoneo: not funded; nessun incasso (coerente §2).
- [x] Bloom poi calo sotto soglia **prima** della deadline: **not funded** — §2 / §5.
- [x] Bloom / race alla deadline: **§2.4** (timestamp server ≤ `ends_at`, valutazione idempotente post-cutoff).
- [x] Senza metodo valido / legacy: **§2.5** (nessun conteggio attivo senza PM; completamento entro cutoff se ammesso).
- [ ] Full bloom prima della deadline: regola *funded* ok; **copy** da allineare in UI.
- [ ] Cuscinetto §2.3: **implementazione** — valore numerico in config globale, override backoffice, barra 100% / `hasReachedBloom`.
- [x] Post-*funded*: tipi di stato + solleciti + contatti §4; parametri numerici in Fase 1; insoluti oltre buffer → policy Fase 1 (§4).
- [x] Estensione `ends_at` / round 2: **§2.6–§2.7** (spostamento prima della 1ª valutazione in Fase 1; nuovo ciclo e tabella R1→R2 = impl. post–Fase 1).

---

## 6. Allineamento al codice attuale (riferimento)

- Bloom logico: `Campaign::hasReachedBloom()` dovrà allinearsi a **soglia_Bloom** (target + **cuscinetto** §2.3), non solo `target_supporters` grezzo, oltre agli stati campagna.
- Inclusione drop vs deadline: campi/data §2.4 (accettazione server ≤ `ends_at`).
- “Attive” vs Bloom: filtro **PM valido** §2.5; `ends_at` e round di chiusura §2.6–§2.7.
- Deadline: campo `ends_at` su campagna.
- Transizioni stato “chiusura” da collegare in implementazione futura a *funded* / *not funded* (oggi non esposte come flusso Kickstarter completo).

---

## 7. Prossimi passi (fuori da questo documento)

1. ~~Decisioni Fase 0~~ — **chiuse:** §2.1–§2.7 (timezone, Bloom, cuscinetto, race, PM, deadline, **round 2 + tabella R1→R2**), §3–§4 (pledge, capture, recupero incassi, **parametri SLA differiti a Fase 1**). **Implementazione Fase 1:** cifra cuscinetto (7–15%), query/stati per PM valido, job chiusura + idempotenza, config solleciti, policy insoluti oltre buffer, copy full bloom. **Dopo Fase 1:** feature **round 2** §2.6–§2.7 (stati campagna, adesione esplicita, nuovi record prenotazione).
2. `domain-model.md` già punta a questo file; aggiornarlo se il modello di pagamento nel testo principale va allineato al pledge senza capture immediata.
3. Passare a **Fase 1** (migrazioni / metodo pagamento utente / tracciamento pledge / pricing alla capture).

---

*Versione: 0.9 (Fase 0 — tabella round 2)*  
*Ultimo aggiornamento: §2.7 prenotazioni R1 nel nuovo ciclo; §6 §7 allineati.*
