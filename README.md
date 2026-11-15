# FaceRec — Face Detection Web App

A React + Vite image-only face-detection interface based on the supplied landing-page reference.

## Included pages
- Public landing page matching the supplied FaceRec design direction
- Workspace overview/dashboard
- Image upload and preview (JPG, PNG, WEBP; 15 MB maximum)
- Detection results page
- Browser-local detection history
- Settings and API connection status

Video upload and live-camera features are intentionally excluded. This app is a **face detector**, not an identity-recognition system: the model detects face locations; it does not identify who a person is.

## 1. Run the frontend

Open PowerShell in this folder:

```powershell
cd "C:\Users\USER\OneDrive\Desktop\Document Folder\AI\Face Detection"
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

If PowerShell cannot find `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## 2. Run the backend

The Node/Express backend (`server.js`) keeps your Ultralytics API key private and calls the model for you.

1. Copy `.env.example` to `.env` and set `ULTRALYTICS_API_KEY=your_key`.
2. In one terminal run `npm run server` (port 5000).
3. In another terminal run `npm run dev` (port 5173). Vite proxies `/api` to the backend, so no CORS or `VITE_API_BASE_URL` setup is needed.

Endpoints: `GET /api/health`, `POST /api/detect` (multipart field `file`; `/api/predict` is an alias).
Response: `{ face_count, detections: [{class_name, confidence, x1, y1, x2, y2}], image_width, image_height }`.
The frontend draws the boxes over your image itself.

## 3. Production

```powershell
npm run build
npm start
```

`npm start` serves the built `dist/` app and the API together at http://localhost:5000.
Set `VITE_API_BASE_URL` only if the backend is hosted on a different origin.

`python test_face_api.py` calls the model API directly (needs `ULTRALYTICS_API_KEY`).
