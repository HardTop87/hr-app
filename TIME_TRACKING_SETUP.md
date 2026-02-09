# Zeit-Tracking System

## Firestore Indexes benötigt

Für das Zeit-Tracking-System müssen folgende Firestore Composite Indexes erstellt werden:

### timeEntries Collection

1. **Index für tägliche Einträge:**
   - Collection: `timeEntries`
   - Felder:
     - `userId` → Ascending
     - `date` → Ascending
     - `startTime` → Ascending

2. **Index für monatliche Einträge (Neu!):**
   - Collection: `timeEntries`
   - Felder:
     - `userId` → Ascending
     - `date` → Ascending (für Range-Query)
     - `date` → Ascending (zweiter für orderBy)
     - `startTime` → Ascending

**So erstellst du die Indexes:**

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Öffne dein Projekt "cococo-hr-platform"
3. Navigiere zu **Firestore Database** → **Indexes** → **Composite**
4. Klicke auf **Create Index**
5. Gib die Felder wie oben beschrieben ein
6. Klicke auf **Create**

Alternativ wird der Index automatisch erstellt, wenn du das erste Mal versuchst, die Zeiterfassung zu nutzen. Firebase zeigt dann einen Link in der Konsole an, über den du den Index direkt erstellen kannst.

## Features

- ✅ Echtzeit-Tracking mit Start/Pause/Stopp
- ✅ Compliance-Warnungen (6h → 30min Pause, max 10h)
- ✅ Professionelle Zeitanzeige
- ✅ Toast-Benachrichtigungen
- ✅ Audit-Trail-fähiges Datenmodell
- ✅ CoCoCo-Design

## Benutzer-Setup

Damit ein Benutzer die Zeiterfassung sehen kann, muss in Firestore das Feld `requiresTimeTracking` auf `true` gesetzt werden:

```javascript
{
  uid: "user-id",
  requiresTimeTracking: true,  // <-- Auf true setzen
  // ... andere Felder
}
```
