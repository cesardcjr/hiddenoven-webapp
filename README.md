# The Hidden Oven

A full-stack web application for customer ordering, staff order management, and admin control.

## Stack
- **Frontend:** React + Vite + Tailwind CSS → deployed on Vercel
- **Backend:** Node.js + Express → Firebase Cloud Functions
- **Database:** Cloud Firestore
- **Storage:** Firebase Cloud Storage
- **Auth:** Firebase Authentication

## Monorepo Structure
```
hidden-oven/
├── frontend/       # React app (Customer, Staff, Admin portals)
├── functions/      # Express API (Cloud Functions)
├── firestore.rules
├── storage.rules
└── firebase.json
```

## Portals
| Portal   | Path         | Auth Required |
|----------|--------------|---------------|
| Customer | /            | No            |
| Staff    | /staff       | Yes (staff)   |
| Admin    | /admin       | Yes (admin)   |

## Setup
See SETUP.md for Firebase configuration and environment variable instructions.
