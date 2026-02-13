# Frestea Ramadan Countdown - PRD

## Original Problem Statement
Website countdown Ramadan dengan flow:
- TVC looping => 120 menit sebelum maghrib countdown => countdown habis video berbuka (5 menit) => balik TVC

## User Personas
1. **Admin/Operator** - Mengelola video TVC, video berbuka, dan jadwal maghrib
2. **Viewer** - Melihat tampilan countdown pada display

## Core Requirements
- Video TVC: list yang bisa ditambah/dikurangi dari database
- Admin panel untuk input jadwal manual maghrib
- Halaman admin untuk mengelola video dan jadwal
- Single location (Bekasi)
- Design minimalis dengan background dan countdown

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- `/api/tvc-videos` - CRUD untuk video TVC
- `/api/berbuka-videos` - CRUD untuk video berbuka
- `/api/schedules` - CRUD untuk jadwal maghrib
- `/api/display-state` - Logic state: TVC/countdown/berbuka

### Frontend (React)
- Display Page (`/`) - Tampilan video/countdown
- Admin Page (`/admin`) - 3 tabs: Video TVC, Video Berbuka, Jadwal Maghrib

### Flow Logic
1. Normal: Tampilkan TVC looping
2. 120 menit sebelum maghrib: Tampilkan countdown
3. Waktu maghrib: Tampilkan video berbuka selama durasi yang ditentukan
4. Setelah berbuka: Kembali ke TVC

## Prioritized Backlog
- P0: ✅ Core countdown logic
- P0: ✅ Admin panel CRUD
- P0: ✅ Display page dengan state transitions
- P1: Bulk import jadwal (available)
- P2: Multi-location support
- P2: Preset jadwal Ramadan

## Next Tasks
1. Add sample TVC video URLs
2. Add berbuka video
3. Input jadwal maghrib untuk tanggal yang diperlukan
