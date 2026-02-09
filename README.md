# HR Management System

Eine moderne, mehrsprachige HR-Management-Plattform für kleine bis mittelständische Unternehmen mit Multi-Company-Support, entwickelt mit React, TypeScript, Firebase und Tailwind CSS.

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Installation](#installation)
- [Benutzerrollen](#benutzerrollen)
- [Module & Features](#module--features)
- [Datenbank-Struktur](#datenbank-struktur)
- [Internationalisierung](#internationalisierung)

---

## 🎯 Übersicht

Dieses HR-Management-System bietet eine zentrale Plattform für die Verwaltung von:
- **Mitarbeiterdaten** (Profile, Dokumente, Assets, Probezeit-Tracking)
- **Zeiterfassung** (Arbeitszeiten, Pausen, Compliance mit DE/UK Regularien)
- **Urlaubsverwaltung** (Anträge, Genehmigungen, Team-Kalender mit Feiertagen)
- **Onboarding & Offboarding** (Strukturierte Prozesse mit Asset-Integration)
- **Lohnbuchhaltung** (Berichte, Export)
- **Organisationsstruktur** (Abteilungen, Hierarchien)

### Highlights

✅ **Multi-Company-Support**: Verwaltung mehrerer Unternehmen in einer Instanz  
✅ **Rollenbasierte Zugriffskontrolle**: 5 verschiedene Benutzerrollen  
✅ **Vollständig zweisprachig**: DE/EN Unterstützung in allen Modulen  
✅ **100% Responsive**: Mobile-first Design mit Tailwind CSS  
✅ **Realtime Updates**: Firebase Firestore für Live-Daten  
✅ **Compliance**: Deutsche & UK Arbeitsrechtskonformität  
✅ **Datenschutz**: Geburtstage ohne Jahrgang, sichere Dokumentenverwaltung  
✅ **UX-Optimiert**: Skeleton Loading States, optimistische Updates

---

## 🚀 Features

### 🏠 Dashboard
- **KPI-Übersicht**: Aktive Mitarbeiter, offene Urlaubsanträge, laufende Onboardings
- **Zeiterfassung Widget**: Schnellzugriff mit Realtime-Anzeige der Arbeitszeit
- **Team-Anwesenheitsradar**: Live-Übersicht - Büro/Remote/Abwesend
- **Geburtstage**: Heutige und kommende (Datenschutzkonform ohne Jahr)
- **Probezeit-Tracker**: Mitarbeiter in Probezeit mit Countdown
- **Skeleton States**: Intelligente Ladeanimationen für alle Widgets

### 👥 Mitarbeiterverwaltung
- **Mitarbeiterverzeichnis**: Durchsuchbare Liste mit Multi-Filter (Abteilung, Firma, Status)
- **Detailprofile**: Vollständige Stammdaten inkl. Probezeit-Information
- **Profilbilder**: Upload via Firebase Storage
- **Probezeit-Management**:
  - Automatisches Tracking von Probezeitenden
  - Dashboard-Benachrichtigungen für HR (7 Tage vorher)
  - Visuelle Countdown-Anzeige
  - Automatische Status-Aktualisierung

### 👤 Mein Profil (Vollständig responsiv)
- **Persönliche Daten**: Adresse, Geburtsdatum, Notfallkontakt
- **Bankverbindung**: IBAN/BIC (DE) oder Sort Code/Account Number (UK)
- **Steuerinformationen**: Steuer-ID, Steuerklasse (DE), National Insurance (UK)
- **Arbeitsverhältnis**: Vertragsart, Wochenstunden, Urlaubsanspruch, Probezeit
- **Equipment**: Zugewiesene Assets mit Seriennummern
- **Dokumente**: Upload persönlicher Dokumente

### ⏱️ Zeiterfassung (100% responsiv)
- **Live-Tracking**: Start, Pause, Wiederaufnahme, Stop mit optimistischen Updates
- **Kalenderansicht**: Monatliche Übersicht mit Soll/Ist-Vergleich
- **Mobile-Optimiert**: Touch-freundliche Controls, gestackte Layouts
- **Manuelle Einträge**: Nachträgliches Erfassen mit Kommentarfunktion
- **Compliance-Warnungen**:
  - Deutschland: Max. 10 Stunden/Tag, 6 Stunden ohne Pause
  - UK: Max. 13 Stunden/Tag, 6 Stunden ohne Pause
- **Export**: CSV-Export für Lohnbuchhaltung
- **Skeleton States**: Während Ladezeiten

### 🏖️ Abwesenheitsverwaltung (Vollständig übersetzt & responsiv)
- **Urlaubsanträge**: Mehrsprachige UI (DE/EN) mit Typ-Auswahl
  - Urlaub, Krankheit, Kind krank, Remote, Dienstreise, Unbezahlt
- **Genehmigungsworkflow**: Admin-Genehmigung erforderlich
- **Resturlaub-Berechnung**: Automatische Berechnung verfügbarer Urlaubstage
- **Mobile-Optimiert**: 
  - Responsive Formulare mit Touch-freundlichen Controls
  - Gestacktes Layout auf kleinen Bildschirmen
  - Optimierte Kartenansicht für Mobilgeräte

**Team-Kalender** (Desktop & Tablet):
- **Timeline-Layout**: Mitarbeiter × Tage Matrix-Ansicht
- **Monatswähler**: Navigation (◀ ▶) + "Heute"-Button
- **Abteilungsfilter**: "Alle Abteilungen", "Meine Abteilung", spezifische Abteilungen
- **Farbcodierung nach Typ**:
  - Urlaub: Grün (emerald-500)
  - Krank/Kind krank: Rot (rose-500)
  - Workation: Blau (blue-500)
  - Dienstreise: Orange (amber-500)
- **Visuelle Unterscheidung**:
  - Arbeitstage: Weißer Hintergrund
  - Wochenenden: Grauer Hintergrund
  - Feiertage: Roter Hintergrund mit Border
  - Heute: Rosa vertikaler Border
- **Tooltips**: Feiertagsnamen, Abwesenheitsdetails (Typ, Status, Zielland)
- **Regionale Feiertage**:
  - Integration deutscher Feiertage basierend auf User-Bundesland
  - Bundesweite und regionale Feiertage
  - Powered by `date-holidays` Library

### 👔 Abwesenheitsmanagement (Admin) (Vollständig übersetzt)
- **Zweisprachige Oberfläche**: Komplette DE/EN Unterstützung
- **Antragsübersicht**: Tabs für "Ausstehend" und "Historie"
- **Genehmigung/Ablehnung**: Mit Kommentarfunktion und Begründung
- **Responsive Tabellen**: Mobile-optimierte Darstellung
- **Filter & Suche**: Nach Status, Mitarbeiter, Zeitraum

### 📚 Onboarding & Offboarding (Phase 13 - NEU!)

**Strukturierte Prozesse für Ein- und Austritte:**

**Onboarding** (Neue Mitarbeiter):
- Vorlagenverwaltung mit wiederverwendbaren Checklisten
- Automatische Aufgabenzuweisung (HR, IT, Manager, Mitarbeiter)
- Fortschritts-Tracking mit Prozentanzeige
- Realtime-Updates für alle Beteiligten

**Offboarding** (Austretende Mitarbeiter):
- Separate Offboarding-Prozesse und -Vorlagen
- **Asset-Integration**: Automatische Anzeige zugewiesener Geräte
- Equipment-Rückgabe-Tracking:
  - Liste aller zugewiesenen Assets (Laptop, Smartphone, etc.)
  - Status-Anzeige (Ausstehend/Zurückgegeben)
  - Admin kann Rückgabe direkt aus Offboarding-Prozess verbuchen
- Mitarbeiter-Ansicht mit Übersicht der zurückzugebenden Geräte

**Admin-Features**:
- **Prozesstyp-Umschalter**: Toggle zwischen Onboarding/Offboarding
- Gefilterte Ansichten nach Prozesstyp
- Template-Erstellung mit automatischer Typ-Zuweisung
- Übersicht über alle laufenden Ein- und Austrittsprozesse

**Mitarbeiter-Ansicht**:
- "Mein Onboarding" / "Mein Austritt" - dynamische Titel
- Checklisten mit Aufgaben
- Equipment-Übersicht bei Offboarding
- Fortschrittsbalken

### 🔐 Benutzerverwaltung (Admin)
- **Mitarbeiter einladen**: E-Mail-basiertes Invite-System
- **Benutzer bearbeiten**:
  - Basisdaten (Name, E-Mail, Personalnummer, Rolle)
  - Arbeitsverhältnis (Vertragsart, Stunden, Urlaubsanspruch)
  - **Probezeit**: Startdatum + Dauer in Monaten (automatische Berechnung)
  - Einstellungen (Zeiterfassung, Google SSO)
- **Übersetzungen**: Vollständige DE/EN Unterstützung inkl. Probezeit-Felder
- **Dokumentenverwaltung**: Upload persönlicher Dokumente für Mitarbeiter
- **Status-Verwaltung**: Aktiv, Eingeladen, Deaktiviert

### 🖥️ Asset-Management (Admin)
- **Asset-Verwaltung**: Laptop, Smartphone, Monitor, Sonstiges
- **Zuweisung**: Direkte Zuweisung an Mitarbeiter
- **Rücknahme**: Mit Notiz-Funktion
- **Tracking**: Seriennummern, Zuweisungsdatum, Garantie
- **History**: Vollständiger Verlauf aller Zuweisungen
- **Übersicht**: Dashboard mit Statistiken (Total, Zugewiesen, Verfügbar)

### 💰 Lohnbuchhaltung (Admin)
- **Monatsberichte**: Automatische Generierung aus Zeiterfassung
- **Soll/Ist-Vergleich**: Pro Mitarbeiter
- **CSV-Export**: Für externe Lohnsoftware
- **Überstunden-Berechnung**: Automatisch

### 🏢 Unternehmenseinstellungen (Admin)
- **Abteilungsverwaltung**: Erstellen, Bearbeiten, Löschen
- **Hierarchien**: Abteilungsleiter zuweisen
- **Firmendokumente**: Zentrale Dokumente für alle Mitarbeiter
- **Multi-Company**: Verwaltung mehrerer Unternehmen

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **React Router DOM** - Client-side Routing
- **Tailwind CSS 4** - Utility-First Styling
- **Lucide React** - Icon Library (600+ Icons)
- **React Hot Toast** - Notifications
- **i18next** - Internationalisierung (DE/EN)

### Backend & Database
- **Firebase Authentication** - User Management
  - Email/Password
  - Google SSO
- **Cloud Firestore** - NoSQL Database
  - Realtime Updates via onSnapshot
  - Security Rules
  - Composite Indexes
- **Firebase Storage** - File Storage
  - Profile Pictures
  - Document Uploads
  - Asset Photos

### Development Tools
- **ESLint** - Code Linting
- **PostCSS** - CSS Processing
- **TypeScript Compiler** - Type Checking

### External Libraries
- **date-holidays** - Regional Holiday Calculation
  - Deutsche Feiertage nach Bundesland
  - 16 deutsche Bundesländer supported

---

## 📁 Projektstruktur

```
hr-app/
├── src/
│   ├── components/          # Wiederverwendbare Komponenten
│   │   ├── dashboard/       # Dashboard-spezifische Widgets
│   │   │   ├── StatCard.tsx
│   │   │   ├── TimeTrackingWidget.tsx
│   │   │   └── TimeClock.tsx
│   │   ├── profile/
│   │   │   └── ProfilePictureUpload.tsx
│   │   ├── time/
│   │   │   └── TimeEntryModal.tsx
│   │   ├── ui/              # UI-Komponenten
│   │   │   └── Skeleton.tsx # Loading States
│   │   ├── AdminRoute.tsx   # Admin-Route-Guard
│   │   └── ProtectedRoute.tsx
│   │
│   ├── contexts/            # React Contexts
│   │   ├── AuthContext.tsx  # Authentifizierung & User State
│   │   └── NotificationContext.tsx
│   │
│   ├── hooks/               # Custom Hooks
│   │   ├── useAbsenceManager.ts
│   │   ├── useAbsences.ts
│   │   ├── useAssets.ts
│   │   ├── useDashboard.ts
│   │   ├── useDocuments.ts
│   │   ├── useOnboarding.ts
│   │   ├── useProbationCheck.ts
│   │   ├── useTeamCalendar.ts
│   │   └── useTimeTracking.ts
│   │
│   ├── layouts/             # Layout-Komponenten
│   │   └── DashboardLayout.tsx
│   │
│   ├── lib/                 # Utilities & Config
│   │   ├── firebase.ts      # Firebase Konfiguration
│   │   ├── i18n.ts          # i18next Setup & Übersetzungen
│   │   └── countryConfig.ts # Länder-spezifische Konfiguration
│   │
│   ├── pages/               # Seiten-Komponenten
│   │   ├── admin/           # Admin-Seiten
│   │   │   ├── AssetManagement.tsx
│   │   │   ├── PayrollReport.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx
│   │   ├── Profile.tsx
│   │   ├── TimeTracking.tsx
│   │   ├── Absences.tsx             # Mitarbeiter-Ansicht (vollständig übersetzt)
│   │   ├── AbsenceManager.tsx       # Admin-Ansicht (vollständig übersetzt)
│   │   ├── TeamCalendar.tsx         # Team-Kalender mit Feiertagen
│   │   ├── OnboardingMyPlan.tsx     # Mitarbeiter-Onboarding/Offboarding
│   │   ├── OnboardingAdmin.tsx      # Admin Onboarding/Offboarding
│   │   ├── CompanySettings.tsx
│   │   ├── Login.tsx
│   │   └── Signup.tsx
│   │
│   ├── types/               # TypeScript Type Definitions
│   │   ├── absence.ts
│   │   ├── asset.ts
│   │   ├── document.ts
│   │   ├── onboarding.ts    # Mit type: 'onboarding' | 'offboarding'
│   │   ├── time.ts
│   │   └── user.ts          # Mit probationEndDate
│   │
│   ├── utils/               # Utility Functions
│   │   ├── dateUtils.ts     # Probation calculations
│   │   └── holidayUtils.ts  # Deutsche Feiertags-Berechnung
│   │
│   ├── App.tsx              # Root Component
│   ├── main.tsx             # Entry Point
│   └── index.css            # Global Styles
│
├── public/                  # Static Assets
├── firestore.rules          # Firestore Security Rules
├── .env                     # Environment Variables (nicht commiten!)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 📦 Installation

### Voraussetzungen

- Node.js 18+ und npm
- Firebase-Projekt (siehe [Firebase Console](https://console.firebase.google.com))

### Schritt 1: Repository klonen

```bash
git clone <repository-url>
cd hr-app
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

Wichtige Dependencies:
- `firebase` - Backend & Database
- `date-holidays` - Regionale Feiertags-Berechnung
- `react-i18next` - Internationalisierung
- `lucide-react` - Icons

### Schritt 3: Firebase-Projekt einrichten

1. Erstelle ein neues Firebase-Projekt in der [Firebase Console](https://console.firebase.google.com)
2. Aktiviere **Authentication** (Email/Password & Google)
3. Erstelle eine **Firestore Database** (im Production Mode)
4. Aktiviere **Firebase Storage**
5. Kopiere die Firebase-Konfiguration

### Schritt 4: Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Schritt 5: Entwicklungsserver starten

```bash
npm run dev
```

App läuft auf: `http://localhost:5173`

---

## 🎭 Benutzerrollen

| Rolle | Beschreibung | Berechtigungen |
|-------|-------------|----------------|
| **global_admin** | Superadmin über alle Firmen | Vollzugriff auf alles |
| **company_admin** | Admin einer spezifischen Firma | Vollzugriff innerhalb der Firma |
| **hr_manager** | HR-Manager | User-Verwaltung, Abwesenheiten, Onboarding/Offboarding, Assets |
| **supervisor** | Abteilungsleiter | Team-Übersicht, Abwesenheitsgenehmigung |
| **employee** | Normaler Mitarbeiter | Eigene Daten, Zeiterfassung, Urlaubsanträge, Onboarding-Plan |

---

## 📚 Module & Features

### 1. Dashboard (`/`)
**Hook:** `useDashboard.ts`

**Features:**
- KPI-Übersicht (Mitarbeiter, Urlaubsanträge, Onboarding-Prozesse)
- Zeiterfassung-Widget mit Realtime-Updates
- Team-Anwesenheitsradar
- Geburtstage (ohne Jahrgang)
- **Probezeit-Tracker** (NEU):
  - Anzeige aller Mitarbeiter in Probezeit
  - Countdown bis Probezeitende
  - Nur für HR/Admin sichtbar
  - Automatische Benachrichtigungen 7 Tage vorher
- Skeleton Loading States

### 2. Zeiterfassung (`/time-tracking`)
**Hook:** `useTimeTracking.ts`

**Collection:** `timeEntries`

**Features:**
- Realtime-Tracking mit onSnapshot
- Optimistische Updates
- Compliance-Warnungen (DE/UK)
- Kalenderansicht
- CSV-Export
- Mobile-optimiert

### 3. Urlaubsverwaltung

**Mitarbeiter-Ansicht** (`/absences`):
- **Vollständig zweisprachig** (DE/EN)
- Antragsstellung mit 6 Typen
- Resturlaub-Berechnung
- Status-Tracking
- Mobile-responsive Formulare

**Admin-Ansicht** (`/admin/absences`):
- **Vollständig zweisprachig** (DE/EN)
- Genehmigung/Ablehnung mit Begründung
- Filterable Tabellen
- Responsive Design

**Team-Kalender** (`/team-calendar`):
- Timeline-Matrix (Mitarbeiter × Tage)
- Farbcodierte Abwesenheitstypen
- Regionale Feiertage (date-holidays)
- Abteilungsfilter
- Tooltips für Details

**Hook:** `useTeamCalendar.ts`

### 4. Onboarding & Offboarding (Phase 13)

**Komponenten:**
- `OnboardingMyPlan.tsx` - Mitarbeiter-Ansicht
- `OnboardingAdmin.tsx` - Admin-Verwaltung

**Collections:**
- `onboarding_templates` - Vorlagen mit `type: 'onboarding' | 'offboarding'`
- `onboarding_processes` - Prozesse mit `type: 'onboarding' | 'offboarding'`

**Features:**
- **Prozesstyp-Umschalter**: Separate Ansichten für On-/Offboarding
- **Vorlagenverwaltung**: Wiederverwendbare Checklisten
- **Aufgaben-Tracking**: Mit Rollen (HR, IT, Manager, Mitarbeiter)
- **Asset-Integration** (Offboarding):
  - Automatische Anzeige zugewiesener Geräte
  - Equipment-Rückgabe-Tracking
  - Admin kann Rückgabe direkt verbuchen
  - Mitarbeiter sehen, was zurückzugeben ist
- **Fortschrittsanzeige**: Prozentuale Fertigstellung
- **Realtime-Updates**: Sofortige Synchronisation

**Datenstruktur:**
```typescript
interface OnboardingTemplate {
  id: string;
  title: string;
  type: 'onboarding' | 'offboarding';  // NEU!
  steps: OnboardingStep[];
  deleted?: boolean;  // Soft delete
}

interface OnboardingProcess {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  type: 'onboarding' | 'offboarding';  // NEU!
  startDate: string;
  status: 'active' | 'completed';
  tasks: OnboardingTask[];
  progress: number;
}
```

### 5. Benutzerverwaltung (`/admin/users`)

**Features:**
- Mitarbeiter einladen
- Profil bearbeiten
- **Probezeit-Management** (NEU):
  - Startdatum eingeben
  - Dauer in Monaten (z.B. 3 oder 6)
  - Automatische Berechnung Probezeitende
  - Anzeige: "Probezeit endet am [Datum] (X Tage)"
  - Übersetzungen für "1 Monat" / "X Monate"
- Dokumentenverwaltung
- E-Mail-Migration (privat → Firmen-E-Mail)
- Google SSO Enforcement

**Vollständig übersetzt:**
- Alle Labels (DE/EN)
- Monat/Monate (Singular/Plural)
- Probezeitende-Anzeige

### 6. Asset-Management (`/admin/assets`)

**Hook:** `useAssets.ts`

**Collection:** `assets`

**Features:**
- CRUD-Operationen
- Zuweisung an Mitarbeiter
- Rücknahme mit Notiz
- Garantie-Tracking
- History-Verlauf
- **Offboarding-Integration**: Assets werden in Offboarding-Prozessen angezeigt

---

## 🗄️ Datenbank-Struktur

### Collections

#### `users`
```javascript
{
  uid: "firebase-auth-uid",
  email: "user@example.com",
  displayName: "Max Mustermann",
  companyId: "triple_c",
  role: "employee",
  status: "active",
  startDate: "2024-01-01",
  probationEndDate: "2024-04-01",  // NEU! Probezeitende
  holidayRegion: "de-by",
  vacationEntitlement: 30,
  // ... weitere Felder
}
```

#### `onboarding_templates`
```javascript
{
  id: "auto-generated",
  title: "Standard Onboarding",
  type: "onboarding",  // oder "offboarding" - NEU!
  steps: [...],
  deleted: false,  // Soft delete - NEU!
  createdAt: 1704067200000
}
```

#### `onboarding_processes`
```javascript
{
  id: "auto-generated",
  userId: "employee-uid",
  templateId: "template-id",
  title: "Mein Onboarding",
  type: "onboarding",  // oder "offboarding" - NEU!
  status: "active",
  startDate: "2024-01-01",
  tasks: [...],
  progress: 45
}
```

#### `assets`
```javascript
{
  id: "auto-generated",
  companyId: "triple_c",
  type: "laptop",
  model: "MacBook Pro 16\"",
  identifier: "LAP-001",
  serialNumber: "ABC123456",
  status: "assigned",  // 'in_stock' | 'assigned' | 'broken' | 'retired'
  assignedToUserId: "user-uid",
  assignedDate: "2024-01-15",
  // ... weitere Felder
}
```

---

## 🌍 Internationalisierung

### Unterstützte Sprachen

- **Deutsch** (`de`) - Standard
- **English** (`en`)

### Vollständig übersetzte Module

✅ Dashboard  
✅ Zeiterfassung  
✅ Abwesenheiten (Mitarbeiter)  
✅ Abwesenheitsmanagement (Admin)  
✅ Team-Kalender  
✅ Onboarding/Offboarding  
✅ Benutzerverwaltung (inkl. Probezeit)  
✅ Asset-Management  
✅ Profil  
✅ Navigation & Common

### Struktur

Alle Übersetzungen in `src/lib/i18n.ts`:

```typescript
const resources = {
  de: {
    translation: {
      // Navigation
      dashboard: 'Dashboard',
      
      // Absences
      absences: {
        title: 'Abwesenheiten',
        type: {
          vacation: 'Urlaub',
          sick: 'Krankheit',
          // ...
        },
        // ...
      },
      
      // Absence Manager (Admin)
      absenceManager: {
        title: 'Anträge verwalten',
        tabs: {
          pending: 'Ausstehend',
          history: 'Verlauf'
        },
        // ...
      },
      
      // Team Calendar
      teamCalendar: {
        title: 'Team-Kalender',
        filter: {
          all: 'Alle Abteilungen',
          my: 'Meine Abteilung'
        },
        // ...
      },
      
      // Onboarding
      onboarding: {
        processTypes: {
          onboarding: 'Onboarding',
          offboarding: 'Offboarding'
        },
        offboarding: {
          equipmentReturn: 'Geräte zurückgeben',
          myOffboarding: 'Mein Austritt',
          // ...
        },
        // ...
      },
      
      // User Management (inkl. Probation)
      userManagement: {
        form: {
          startDate: 'Startdatum',
          probationMonths: 'Probezeit (Monate)',
          noProbation: 'Keine Probezeit',
          month: 'Monat',
          months: 'Monate',
          probationEnds: 'Probezeit endet am',
          // ...
        },
        // ...
      },
    }
  },
  en: { ... }
};
```

### Verwendung

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
t('absenceManager.title');  // "Anträge verwalten" oder "Manage Requests"
t('onboarding.processTypes.offboarding');  // "Offboarding"
```

---

## 🎨 UX & Design

### Responsive Design

- **Mobile-first**: Alle Seiten optimiert für Smartphones
- **Breakpoints**: sm, md, lg, xl (Tailwind Standard)
- **Touch-friendly**: Große Buttons, swipeable Elemente
- **Adaptive Layouts**: Spalten → Zeilen auf kleinen Bildschirmen

### Loading States

**Skeleton Components** (`src/components/ui/Skeleton.tsx`):
- Intelligente Platzhalter während Ladezeiten
- Vermeidung von Layout-Shifts
- Eingesetzt in: Dashboard, Profile, Employees, TimeTracking

### Color Scheme

**Brand Colors:**
- Primary: `#FF79C9` (Cococo Berry) - CTA-Buttons, Highlights
- Secondary: `#1E4947` (Cococo Moss) - Navigation, Headers
- Accent: `#FF1493` (Deep Pink) - Icons, Links

**Semantic Colors:**
- Success: Emerald-500 (Urlaub genehmigt)
- Error: Red-500 (Ablehnung, Fehler)
- Warning: Orange-500 (Compliance-Warnungen)
- Info: Blue-500 (Informationen)

### Typography

- **Headings**: font-semibold, font-bold
- **Body**: text-sm, text-base
- **Labels**: text-xs, uppercase, tracking-wide

---

## 🔧 Development

### Scripts

```bash
npm run dev      # Development Server (Port 5173)
npm run build    # Production Build
npm run lint     # ESLint Check
npm run preview  # Preview Production Build
```

### Best Practices

1. **TypeScript**: Strikte Typen, keine `any`
2. **Komponenten**: Klein, wiederverwendbar, single responsibility
3. **Hooks**: Geschäftslogik auslagern
4. **i18n**: Keine hardcoded Strings, immer `t()`
5. **Responsive**: Mobile-first, Breakpoints nutzen
6. **Accessibility**: ARIA-Labels, keyboard navigation
7. **Performance**: Lazy loading, memo, useMemo/useCallback

---

## 🐛 Bekannte Features & Verbesserungen

### Implementierte Features (Phase 13)

✅ Onboarding/Offboarding Trennung  
✅ Asset-Integration in Offboarding  
✅ Template Soft Delete  
✅ Probezeit-Management mit Countdown  
✅ Vollständige i18n für Absences  
✅ Vollständige i18n für AbsenceManager  
✅ Skeleton Loading States  
✅ Team-Kalender mit Feiertagen  
✅ Responsive Design für alle Pages

### Zukünftige Verbesserungen

- [ ] Push-Benachrichtigungen (Firebase Cloud Messaging)
- [ ] Bulk-Operations für Assets
- [ ] Advanced Reporting (Charts, Analytics)
- [ ] Mobile App (React Native)
- [ ] Offline-Modus (PWA mit Service Worker)

---

## 📄 Lizenz

Proprietär - Alle Rechte vorbehalten.

---

**Version**: 2.0.0 (Phase 13 - Offboarding)  
**Letztes Update**: 9. Februar 2026  
**Entwickelt mit** ❤️ **von Triple C Labs**
