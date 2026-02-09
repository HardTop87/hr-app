# Firebase Security Rules Deployment

## Quick Deploy (Empfohlen)

### 1. Firebase CLI installieren
```bash
npm install -g firebase-tools
```

### 2. Firebase Login
```bash
firebase login
```

### 3. Firebase Projekt initialisieren (einmalig)
```bash
firebase init firestore
```
- Wähle "Use an existing project"
- Wähle dein Projekt aus
- Verwende `firestore.rules` als Rules-Datei
- Verwende `firestore.indexes.json` als Indexes-Datei

### 4. Security Rules deployen
```bash
firebase deploy --only firestore:rules
```

---

## Manuelle Deployment (Alternative)

Falls Firebase CLI Probleme macht, kannst du die Rules auch manuell im Firebase Console hochladen:

1. Öffne: https://console.firebase.google.com
2. Wähle dein Projekt
3. Navigiere zu: **Firestore Database** → **Rules**
4. Kopiere den Inhalt von `firestore.rules`
5. Füge ihn in den Editor ein
6. Klicke **Publish**

---

## Wichtige Regel für Invite-Flow

Die wichtigste Änderung in den Rules:

```javascript
match /users/{userId} {
  // Erlaube unauthentifizierten Lesezugriff NUR für Einladungen
  allow read: if resource.data.status == 'invited' || 
                 isOwner(userId) || 
                 isAdmin();
  
  // Erlaube Erstellung für Signup-Prozess
  allow create: if isAuthenticated() && 
                   request.auth.uid == userId;
}
```

Diese Regel ermöglicht es unauthentifizierten Benutzern, Einladungs-Dokumente zu lesen, aber nur wenn `status == 'invited'`. Nach der Registrierung wird der Status auf `'active'` gesetzt und ist dann nicht mehr öffentlich lesbar.

---

## Nach dem Deployment testen

1. Admin: Erstelle eine Einladung in `/admin/users`
2. Kopiere den generierten Invite-Link
3. Öffne den Link in einem Inkognito-Fenster
4. Der Fehler "Missing or insufficient permissions" sollte verschwunden sein
5. Du solltest die Benutzerinformationen sehen und ein Passwort erstellen können
