<div align="center">

# 🩺 MediMitra

### The Health Operating System for Indian families

**Snap a lab report → understand it in your language → act on it.**
MediMitra remembers, monitors, and manages your whole family's health over time — it explains reports in plain language, forecasts risk from your trends, books verified care, and finds the cheapest medicines.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![AI: Gemini / Claude](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude-7c3aed)](#ai-layer)

</div>

---

## The problem

India has world-class hospitals and the cheapest generic medicines on earth — yet families still struggle, for three reasons:

1. **Fragmented records.** Reports live as photos scattered across phones and WhatsApp. Nobody remembers their cholesterol from two years ago.
2. **Communication & literacy gaps.** Patients can't decode their own reports, and millions can't read English.
3. **Access & affordability.** People don't know which screenings they're due, which hospital to trust, or that the generic costs a third of the brand.

MediMitra is one app that turns scattered medical information into **memory, foresight, and action** — for the whole family.

---

## What it does

| | Feature | What it means |
|---|---|---|
| 📸 | **Report intelligence** | Photograph any lab report → a plain-language briefing: health score, urgency triage, abnormal-value alerts, drug-interaction warnings, even lab data-entry-error detection. |
| 📈 | **Longitudinal trends + forecasting** | Every value is stored over time. A least-squares projection warns *"at this pace your HbA1c crosses the diabetes threshold by August 2026."* |
| 🤖 | **Grounded AI chat** | Ask *"is my cholesterol high?"* by voice or text. Answers come **only** from your record, with dates cited — it can't make things up, and defers to a clinician. |
| 👨‍👩‍👧 | **Family health management** | Add/remove members; each gets their own longitudinal record with last visit, last test, and current alerts. Caregiver-friendly. |
| 🏥 | **Verified hospital booking** | Adjustable vicinity radius, an ethical **4.3★+ guardrail**, a map, a doctor-ready visit summary, and an `.ics` calendar reminder. |
| 💊 | **Prescription → savings** | Prescriptions auto-arrive over **ABDM** (manual upload as fallback); the app prices generic vs branded across pharmacies and surfaces the cheapest option. |
| 🇮🇳 | **Scheme eligibility** | Flags relevant government schemes (e.g. Ayushman Bharat PM-JAY) when applicable. |
| 🗣️ | **Five languages, voice-first** | AI explanations, chat and prescription notes in **English, हिंदी, தமிழ், తెలుగు, বাংলা**, with read-aloud. |

---

## Architecture

MediMitra is a single Next.js app with **five clean layers**. The client never touches the AI or the database directly — it only calls the app's own API. That separation is what makes it scale and keeps it secure.

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT  (React 19 / Next.js App Router)                 │
│  /  ·  /upload  ·  /prescription      →  fetch() only    │
└───────────────┬─────────────────────────────────────────┘
                │  HTTPS · JSON
┌───────────────▼─────────────────────────────────────────┐
│  API LAYER  (stateless Next.js Route Handlers)           │
│  analyze · today · timeline · family · patients ·        │
│  book · prescription · ask · chat · reset                │
└───────┬───────────────────────────────┬─────────────────┘
        │                               │
┌───────▼─────────┐           ┌─────────▼──────────────────┐
│ DOMAIN LOGIC    │           │ AI PROVIDER ABSTRACTION     │
│ ranking · risk  │           │ Gemini OR Claude · schema-  │
│ projection      │           │ validated output · retries  │
│ screenings      │           │ · model fallback · grounding│
└───────┬─────────┘           └─────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│  DATA LAYER  better-sqlite3                                │
│  patients · reports · metrics (normalized) · appointments │
│  maps 1:1 to FHIR R4 — the ABDM standard                  │
└───────────────────────────────────────────────────────────┘
```

<a name="ai-layer"></a>
**AI layer highlights**
- **Provider-swappable** — `getProvider()` selects Gemini (free tier) or Claude from an env var; the rest of the app is agnostic.
- **Structured output** — the model is forced to return schema-validated JSON, so it can never break the UI.
- **Grounded** — answers are constrained to the patient's stored record to prevent hallucination.
- **Resilient** — retry with exponential backoff and automatic model fallback (`gemini-2.5-flash` → `2.0-flash`).
- **Graceful degradation** — the dashboard, trends and family views need **zero** AI calls; remove the key and the app still works.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Language | **TypeScript** (strict, end-to-end shared types) |
| Styling | **Tailwind CSS v4** — custom dark design system; charts & score ring are hand-built SVG (no chart library) |
| AI | **@google/genai** (Gemini) · **@anthropic-ai/sdk** (Claude) |
| Data | **better-sqlite3** — normalized metrics enable trends, recall & forecasting |
| Browser-native | Web Speech API (voice), Geolocation, keyless Google Maps embed, `.ics` calendar generation — **no extra libraries** |

---

## Getting started

> Requires Node.js 20+.

```bash
# 1. install
npm install

# 2. add an AI key (Gemini is free, no card required)
cp .env.example .env.local
#   then edit .env.local and set GEMINI_API_KEY=AIza...
#   (get one at https://aistudio.google.com/apikey)

# 3. run
npm run dev
```

Open **http://localhost:3000**, click **Open your dashboard**, and explore. The database (`medimitra.db`) is created and seeded with a demo family on first run.

```bash
npm run build   # production build
npm run start   # serve the production build
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | one of the two | Google AI Studio key — **free tier**, no card. |
| `ANTHROPIC_API_KEY` | one of the two | Optional Claude key; used only if Gemini isn't set. |
| `MEDIMITRA_DB_PATH` | no | Override the SQLite path (e.g. a mounted volume in production). |

---

## API surface

All routes are stateless JSON handlers under `src/app/api/`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST | Vision OCR + full report analysis |
| `/api/prescription` | POST | Prescription OCR + generic pricing |
| `/api/today` | GET | Daily briefing (ranking + forecast) |
| `/api/timeline` | GET | Longitudinal trends + projection |
| `/api/family` | GET / POST / DELETE | Family roster + per-member summaries |
| `/api/patients` | GET | Family member list |
| `/api/book` | POST | Appointment + doctor-ready summary |
| `/api/ask`, `/api/chat` | POST | Grounded Q&A / chat over the record |
| `/api/reset` | POST | Re-seed demo data |

---

## Deployment

MediMitra deploys to any **Node.js** host. Because `better-sqlite3` writes to disk, the DB path is automatically pointed at a writable location on serverless platforms (Vercel uses `/tmp`); for durable storage set `MEDIMITRA_DB_PATH` to a mounted volume or swap the data module to Postgres.

1. Push to GitHub.
2. Import the repo on your host (e.g. Vercel) and set `GEMINI_API_KEY`.
3. Deploy.

> **Roadmap to production:** JWT + ABHA/ABDM login, Postgres for durable multi-tenant storage, live lab/pharmacy partner APIs, full UI translation across all five languages, and wearable/device ingestion.

---

## ⚕️ Disclaimer

MediMitra is **informational and clinician-deferred — not a diagnostic device.** It helps you understand your reports and never replaces a qualified healthcare professional. Every output points back to a doctor for medical decisions.

---

<div align="center">
Built for the CCCL Buildathon · Digital Healthcare Accessibility & Patient Experience.
</div>
