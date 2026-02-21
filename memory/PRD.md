# Frestea Ramadan Countdown - PRD

## Original Problem Statement
Website countdown Ramadan dengan flow:
- TVC looping => 120 menit sebelum maghrib countdown => countdown habis video berbuka (5 menit) => balik TVC

## User Personas
1. **Admin/Operator** - Mengelola video TVC, video berbuka, video countdown, dan jadwal maghrib
2. **Viewer** - Melihat tampilan countdown pada display

## Core Requirements
- Video TVC: list yang bisa ditambah/dikurangi dari database
- Video Countdown: video yang diputar secara berkala selama sesi countdown dengan interval yang bisa di-setting
- Admin panel untuk input jadwal manual maghrib
- Halaman admin untuk mengelola video dan jadwal
- Single location (Bekasi)
- Design minimalis dengan background dan countdown

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- `/api/tvc-videos` - CRUD untuk video TVC
- `/api/berbuka-videos` - CRUD untuk video berbuka
- `/api/countdown-videos` - CRUD untuk video countdown (dengan duration_minutes sebagai interval)
- `/api/schedules` - CRUD untuk jadwal maghrib
- `/api/display-state` - Logic state: TVC/countdown/berbuka
- `/api/auth/login` - JWT authentication
- `/api/users` - User management (create, change password, reset password)
- `/api/videos/upload` - Video file upload

### Frontend (React)
- Display Page (`/`) - Tampilan video/countdown dengan font Agriculture kustom
- Admin Page (`/admin`) - Tabs: Video TVC, Video Berbuka, Jadwal Maghrib, Video Countdown, User Management
- Login Page (`/login`) - JWT authentication

### Flow Logic (Final)
1. **Subuh - Maghrib (Countdown State)**:
   - Tampilkan countdown timer saja (background ungu)
   - Setelah X menit (interval dari backend), putar video countdown
   - Setelah video selesai, kembali ke countdown timer
   - Siklus berulang sampai waktu maghrib
2. **Waktu Maghrib**: Tampilkan video berbuka looping selama durasi yang ditentukan
3. **Setelah Berbuka**: Tampilkan TVC looping

### UI Customization
- Font countdown: **Agriculture** (custom font dengan outline/stroke effect)
- Background countdown: Ungu (#5B4B9E) saat timer, video saat interval
- Text effect: Aquamarine outline (#7FFFD4)
- Fixed position countdown: Posisi jam, menit, detik tidak bergerak saat berubah

## Completed Tasks (Feb 2026)
- ✅ Core countdown logic
- ✅ Admin panel CRUD
- ✅ Display page dengan state transitions
- ✅ JWT Authentication & Login
- ✅ User Management
- ✅ Video Upload Feature
- ✅ Custom Agriculture Font Implementation
- ✅ Fixed position countdown timer
- ✅ Video Countdown dengan interval yang bisa di-setting
- ✅ Deployment guides (VPS & cPanel)

## Prioritized Backlog
- P1: Import jadwal dari CSV/Excel
- P2: Multi-location support
- P2: Preset jadwal Ramadan

## Credentials
- Admin: `admin` / `admin123`

## Deployment Files
- `/app/deploy.txt` - VPS deployment guide
- `/app/deploy-cpanel.txt` - cPanel deployment guide
