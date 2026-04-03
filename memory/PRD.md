# System Department Of Corrections - PRD

## Original Problem Statement
Zbuduj kompletny system ERP "System Department Of Corrections" z architekturą Fullstack (React + FastAPI + MongoDB).

## User Personas
- **Founder (Admin)**: Pełna kontrola nad systemem, może edytować wszystkie profile, zarządzać całym sprzętem, przypisywać wyposażenie
- **Employee**: Może przeglądać dane, dodawać/edytować tylko własny sprzęt, profil read-only

## Core Requirements (Static)
1. Users: ID, Imię, Nazwisko, Nr odznaki, Stopień, Rola (founder/employee), Hasło
2. OfficerProfiles: 6 slotów Paski Zasługi, Checkboxy szkolenia (OPP, KPP, Strzelanie, Taktyka, Prawo, Pierwsza Pomoc), Notatki, Data awansu
3. Assets: Nazwa, Nr seryjny (S/N), Kategoria, Status, createdBy
4. Assignments: Łączenie Assets z Users

## What's Been Implemented (2026-04-03)
- ✅ JWT Authentication z admin seeding (admin@doc.gov / Admin123!)
- ✅ Dashboard z statystykami
- ✅ Lista pracowników z hierarchią (BOARD, HIGH COMMAND, COMMAND, SERGEANT, OFFICERS)
- ✅ Profil funkcjonariusza z paskami zasługi, szkoleniami, notatkami
- ✅ Read-only profil dla employee, pełna edycja dla founder
- ✅ Ewidencja sprzętu z usuwaniem kaskadowym
- ✅ Przypisywanie sprzętu do pracowników
- ✅ Historia zmian (Audit Log)
- ✅ **NOWE**: Pracownik może dodawać własny sprzęt z profilu (automatyczne przypisanie)
- ✅ **NOWE**: Pracownik może edytować/usuwać tylko swój sprzęt
- ✅ **NOWE**: Badge "Osobisty" przy sprzęcie osobistym w ewidencji
- ✅ Dark mode UI (zinc/black/yellow)
- ✅ Polski interfejs

## API Endpoints
- POST /api/auth/login, logout, /me, /refresh
- GET/POST/PUT/DELETE /api/users, /api/assets, /api/assignments
- POST /api/assets/my-equipment (dodawanie własnego sprzętu)
- GET /api/audit-logs, /api/stats

## Prioritized Backlog
### P0 (Done)
- Core authentication ✅
- User management ✅
- Equipment management ✅
- Personal equipment feature ✅

### P1 (Future)
- Eksport danych do PDF/Excel
- Filtrowanie audit logu po dacie
- Bulk operations na sprzęcie

### P2 (Nice to have)
- Dashboard charts
- Email notifications
- Mobile responsive improvements

## Next Tasks
1. Dodanie eksportu danych do PDF/Excel
2. Rozbudowa dashboardu o wykresy
3. Dodanie powiadomień systemowych
