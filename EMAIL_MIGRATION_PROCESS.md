# E-Mail-Migration Prozess

## Übersicht

Der Einladungs- und E-Mail-Migrationsprozess ermöglicht es, neue Mitarbeiter zunächst mit ihrer privaten E-Mail einzuladen und später auf die Firmen-E-Mail umzustellen.

## Prozess

### 1. Einladung mit privater E-Mail

**Admin (UserManagement):**
- Lädt neuen Mitarbeiter ein
- Gibt **private E-Mail** ein (z.B. `max.privat@gmail.com`)
- Firmen-E-Mail ist noch nicht bekannt
- System erstellt Invite-Dokument mit Status `invited`

**Mitarbeiter (Signup):**
- Erhält Einladungslink per E-Mail
- Öffnet Link und erstellt Passwort
- Firebase Auth Account wird mit **privater E-Mail** erstellt
- Status wird auf `active` gesetzt
- Kann sich mit privater E-Mail anmelden

### 2. Migration zur Firmen-E-Mail

**Admin (UserManagement - Benutzer bearbeiten):**
- Öffnet Bearbeitungsdialog für Mitarbeiter
- Ändert E-Mail von `max.privat@gmail.com` zu `max.mustermann@firma.de`
- System prüft:
  - E-Mail nicht bereits in Firestore verwendet
  - E-Mail nicht bereits in Firebase Auth verwendet
- Firestore-Dokument wird aktualisiert
- **Wichtig:** Firebase Auth E-Mail wird NICHT automatisch geändert

**Hinweis an Admin:**
> "E-Mail aktualisiert. Der Mitarbeiter muss sich mit der neuen E-Mail anmelden oder Google SSO verwenden."

### 3. Mitarbeiter-Optionen nach E-Mail-Änderung

Der Mitarbeiter hat zwei Möglichkeiten:

#### Option A: Google SSO (Empfohlen)
- Mitarbeiter klickt auf "Mit Google anmelden"
- Meldet sich mit Firmen-E-Mail an (`max.mustermann@firma.de`)
- System erkennt E-Mail und verknüpft Profil automatisch
- Alter Firebase Auth Account mit privater E-Mail bleibt bestehen, wird aber nicht mehr verwendet

#### Option B: Passwort-Login (Nicht mehr möglich)
- Login mit privater E-Mail funktioniert technisch noch
- Aber: System findet kein Profil mit dieser E-Mail in Firestore
- Login schlägt fehl

## Technische Details

### Firestore Datenstruktur

**Invite-Dokument (Status: invited):**
```typescript
{
  uid: "temp-id-123",  // Temporäre ID
  email: "max.privat@gmail.com",
  displayName: "Max Mustermann",
  status: "invited",
  companyId: "company-1",
  role: "employee",
  // ... weitere Felder
}
```

**Nach Signup (Status: active):**
```typescript
{
  uid: "firebase-auth-uid",  // Echte Firebase Auth UID
  email: "max.privat@gmail.com",
  displayName: "Max Mustermann",
  status: "active",
  companyId: "company-1",
  role: "employee",
  // ... weitere Felder
}
```

**Nach E-Mail-Änderung durch Admin:**
```typescript
{
  uid: "firebase-auth-uid",  // Bleibt gleich
  email: "max.mustermann@firma.de",  // ✅ Geändert
  displayName: "Max Mustermann",
  status: "active",
  companyId: "company-1",
  role: "employee",
  // ... weitere Felder
}
```

### Firebase Auth

- Account bleibt mit **privater E-Mail** verknüpft
- Kann nicht direkt von Admin geändert werden (Firebase Sicherheitsregel)
- Mitarbeiter muss sich neu mit Firmen-E-Mail registrieren (Google SSO)
- Alter Account kann bestehen bleiben (kein Problem, da nicht mehr verwendet)

### AuthContext Login-Logik

```typescript
// Bei Login (E-Mail/Passwort oder Google SSO)
1. Firebase Auth Anmeldung
2. Suche User-Profil in Firestore mit auth.user.email
3. Falls nicht gefunden → Suche mit auth.user.uid
4. Falls immer noch nicht gefunden → Fehler
```

## Validierungen

### Bei Einladung (handleInviteUser)
- ✅ E-Mail nicht bereits in Firestore
- ✅ Pflichtfelder ausgefüllt

### Bei E-Mail-Änderung (handleSaveEdit)
- ✅ E-Mail nicht bereits in Firestore (anderer User)
- ✅ E-Mail nicht bereits in Firebase Auth
- ✅ Hinweis an Admin über notwendige Aktion des Mitarbeiters

### Bei Signup (handleSubmit)
- ✅ Invite existiert und ist gültig
- ✅ Passwort min. 6 Zeichen
- ✅ Passwörter stimmen überein
- ✅ Firebase Auth Account wird erstellt

## Firestore Security Rules

```javascript
match /users/{userId} {
  // Invite-Dokumente können ohne Auth gelesen werden (für Signup-Seite)
  allow read: if resource.data.status == 'invited' || isAuthenticated();
  
  // User kann eigenes Dokument erstellen (bei Signup)
  allow create: if (isAuthenticated() && request.auth.uid == userId) ||
                   (isAdmin() && request.resource.data.status == 'invited');
  
  // Admin oder Owner kann updaten
  allow update: if isOwner(userId) || isAdmin();
  
  // Admin kann löschen (z.B. Invite-Dokument nach Signup)
  allow delete: if isAdmin() || 
                   (isAuthenticated() && resource.data.status == 'invited');
}
```

## Best Practices

### Für Admins
1. **Einladung:** Private E-Mail verwenden, wenn Firmen-E-Mail noch nicht existiert
2. **Onboarding:** Nach Google Workspace Aktivierung E-Mail im System ändern
3. **Kommunikation:** Mitarbeiter informieren, dass er Google SSO verwenden soll

### Für Mitarbeiter
1. **Anfang:** Mit privater E-Mail registrieren und Passwort setzen
2. **Nach Firmen-E-Mail Aktivierung:** Google SSO verwenden
3. **Kein manuelles Update:** Firebase Auth E-Mail nicht selbst ändern nötig

## Bekannte Einschränkungen

1. **Firebase Auth E-Mail:** Kann nicht direkt von Admin geändert werden
2. **Alter Account:** Bleibt mit privater E-Mail bestehen (unbedenklich)
3. **Keine automatische Migration:** Mitarbeiter muss aktiv Google SSO verwenden

## Zukünftige Erweiterungen

Mögliche Verbesserungen:
- **Cloud Function:** Automatische E-Mail-Migration in Firebase Auth
- **Account-Linking:** Alte und neue E-Mail verknüpfen
- **Benachrichtigung:** Automatische E-Mail an Mitarbeiter bei E-Mail-Änderung
- **Profil-Einstellungen:** Mitarbeiter kann selbst E-Mail aktualisieren

## Zusammenfassung

✅ **Funktioniert:**
- Einladung mit privater E-Mail
- Signup und Login mit privater E-Mail
- Admin kann E-Mail im Profil ändern
- Google SSO mit neuer Firmen-E-Mail

⚠️ **Manueller Schritt erforderlich:**
- Mitarbeiter muss nach E-Mail-Änderung Google SSO verwenden
- Alter Firebase Auth Account bleibt bestehen (kein Problem)

🚫 **Nicht möglich:**
- Automatische Migration von privater zu Firmen-E-Mail in Firebase Auth
- Admin kann Firebase Auth E-Mail nicht direkt ändern
