# MediMate

A personal medication management app that helps users track prescriptions, dosages, and schedules — all from their phone or browser.

* App Link: https://project2-e9097.web.app

## About

MediMate makes managing medications simple and private. Users can scan prescription images using their device camera, and the app automatically extracts medication names, dosages, and scheduling information — all processed locally in the browser for complete privacy.

## Features

- Scan prescriptions using your device camera or upload an image
- Automatic text extraction via OCR (processed entirely in the browser)
- Smart medication scheduling with flexible options:
  - Everyday
  - Specific days
  - Every few days
  - Custom schedules
- Track multiple doses per day
- Find nearby pharmacies on an interactive map
- Mobile-first, responsive design

## Third-Party Integrations

- **Tesseract.js** — Client-side OCR to extract text from prescription 
  images. No images are sent to external servers, ensuring user privacy.
- **Browser Media APIs (getUserMedia)** — Accesses the device camera for live prescription scanning directly in the browser.
- **Leaflet + ArcGIS** — Interactive maps for geolocation and proximity-based pharmacy detection.
- **Lucide (lucide-vue-next)** — Icon library for Vue.
- **PrimeVue** — UI component library for consistent, responsive styling.

## Privacy

All OCR processing happens locally in the browser. No medical images or prescription data are sent to external servers or third-party services.

## Tech Stack

- **Frontend:** Vue.js, Vue Router, VueFire
- **Backend:** Google Cloud Firebase, Firestore
- **Auth:** Firebase Authentication
- **OCR:** Tesseract.js
- **Maps:** Leaflet, ArcGIS
  

Splash Page:

<img width="1897" height="910" alt="image" src="https://github.com/user-attachments/assets/faae1e5c-e48a-4794-b235-eb94fb336863" />


Dashboard:

<img width="1906" height="916" alt="image" src="https://github.com/user-attachments/assets/1ad7d0bd-2903-4c8b-aed5-45b393e8fb50" />

 
