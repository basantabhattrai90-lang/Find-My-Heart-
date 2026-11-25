# Firebase Online Multiplayer Setup — Find My Heart

Find My Heart uses **Firebase Realtime Database** and **Firebase Anonymous Authentication** for genuine 2-player online synchronization. When Firebase credentials are not configured, the game runs in an explicitly labeled **Local Preview Mode (Offline)**.

## 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Add a **Web App** (`</>`) to your project and copy the `firebaseConfig` JSON object.

## 2. Enable Anonymous Authentication
1. In the Firebase Console, open **Authentication → Sign-in method**.
2. Enable **Anonymous** sign-in and save.

## 3. Enable Realtime Database & Deploy Rules
1. Open **Build → Realtime Database** and create a database (select a region close to you).
2. Open the **Rules** tab and paste the contents of `/database.rules.json` from this project:
   - Rooms are private to authenticated anonymous players.
   - Room listing is disabled (`.read: false` on `/rooms`).
   - Maximum **2 players per room** is enforced at both the database rules and transaction levels.
   - Chat messages are length-validated (`1–200` chars) and bound to the sender's `auth.uid`.

## 4. Connect Your Credentials
You can connect Firebase in either of two ways:

### Option A: Environment Variables (`.env`)
Copy `.env.example` to `.env` and fill in your values:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

### Option B: In-App Settings (Quick Connect)
1. Open **Settings** on the Start Screen.
2. Scroll to **Firebase Realtime Database** and click **Configure**.
3. Paste your `firebaseConfig` JSON object and click **Save Config**.
