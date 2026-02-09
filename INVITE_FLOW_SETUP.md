# Email/Password Invite-Flow - Setup Anleitung

## ✅ Implementiert

Der manuelle Email/Password Invite-Flow wurde vollständig implementiert:

### 1. **UserManagement Seite erweitert**
- ✅ Invite-Modal erstellt User-Dokument mit `status: 'invited'`
- ✅ Nach Invite wird **Invite Success Modal** angezeigt mit:
  - Einladungslink zum Kopieren
  - "E-Mail-Programm öffnen" Button mit vorausgefüllter E-Mail

### 2. **Signup Seite erstellt** (`/signup?invite=[DOC_ID]`)
- ✅ Validiert Invite-ID aus Query-Parameter
- ✅ Zeigt User-Daten aus Invite (Name, E-Mail, Jobtitel, Personalnummer)
- ✅ Passwort-Eingabe mit Bestätigung
- ✅ Erstellt Firebase Auth Account mit `createUserWithEmailAndPassword`
- ✅ Migriert Daten: Erstellt neues Doc mit `auth.user.uid`, löscht altes Invite-Doc
- ✅ Setzt `status: 'active'`
- ✅ Redirect zum Dashboard nach erfolgreicher Registrierung

### 3. **Routen & Übersetzungen**
- ✅ Route `/signup` hinzugefügt (öffentlich zugänglich)
- ✅ Vollständige DE/EN Übersetzungen für:
  - Invite Success Modal
  - E-Mail Template
  - Signup Seite (alle Felder, Fehler, Bestätigungen)

### 4. **User Flow**
1. Admin lädt User in UserManagement ein
2. Modal zeigt Invite-Link: `https://your-app.com/signup?invite=abc123`
3. Admin kopiert Link oder öffnet E-Mail-Programm
4. User klickt auf Link → Signup Seite
5. User erstellt Passwort
6. Account wird aktiviert und User kann sich einloggen

---

## 🔧 Firebase Console Setup (WICHTIG!)

**Vor dem Testen muss Email/Password Authentifizierung aktiviert werden:**

### Schritte:
1. Öffne Firebase Console: https://console.firebase.google.com
2. Wähle dein Projekt aus
3. Navigation: **Authentication** → **Sign-in method**
4. Klicke auf **Email/Password**
5. **Enable** aktivieren
6. **Save** klicken

### Screenshot-Guide:
```
Firebase Console
└─ Authentication
   └─ Sign-in method
      └─ Email/Password [Enable]
```

**Status:** ⚠️ Muss manuell aktiviert werden (kann nicht per Code gemacht werden)

---

## 📋 Test-Checklist

Nach Firebase Setup:

- [ ] Email/Password in Firebase Console aktiviert
- [ ] Admin kann User in `/admin/users` einladen
- [ ] Invite Success Modal zeigt Link
- [ ] E-Mail-Button öffnet Mail-Programm mit vorausgefülltem Text
- [ ] `/signup?invite=xyz` lädt User-Daten
- [ ] Passwort-Erstellung funktioniert
- [ ] User-Dokument wird mit Auth-UID erstellt
- [ ] Altes Invite-Dokument wird gelöscht
- [ ] Status wird auf `active` gesetzt
- [ ] Redirect zum Dashboard nach Signup

---

## 🔒 Sicherheit

- ✅ Invite-Link ist nur einmal verwendbar (Status wird auf `active` gesetzt)
- ✅ Passwort-Validierung (min. 6 Zeichen)
- ✅ Firebase Auth Sicherheitsregeln greifen
- ✅ Invite-Dokument wird nach Registrierung gelöscht

---

## 📧 E-Mail Template

Deutsch:
```
Betreff: Einladung zum HR Management System

Hallo [Name],

Sie wurden eingeladen, sich im HR Management System zu registrieren.

Bitte klicken Sie auf den folgenden Link, um Ihr Konto zu erstellen:
[Link]

Mit freundlichen Grüßen
```

English:
```
Subject: Invitation to HR Management System

Hello [Name],

You have been invited to register in the HR Management System.

Please click on the following link to create your account:
[Link]

Best regards
```

---

## ⚠️ Hinweis: Mitarbeiter-Seite

Die bestehende `/employees` Seite ist für **alle User** gedacht (Kollegenübersicht).
Die neue `/admin/users` Seite ist für **Admin-User** (Benutzerverwaltung mit Invite-System).

**Beide Seiten bleiben bestehen** - unterschiedliche Zwecke!
