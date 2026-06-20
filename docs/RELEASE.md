# Release guide (Phase 5)

Steps to ship the FFD Flood app to the Play Store. Prerequisites: JDK 17+, Android SDK
(Android Studio), and the Firebase setup in [`FIREBASE-SETUP.md`](FIREBASE-SETUP.md).

## 1. App icons & splash
Provide a 1024×1024 source logo, then generate all densities:
```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --android   # reads ./assets/icon.png + ./assets/splash.png
npm run cap:sync
```
Brand: reuse Pak Flood DSS assets if shared; otherwise the calm-teal mark (tokens in `BACKEND-INTEGRATION.md` §5).

## 2. Signing
Create a release keystore and an **un-committed** `android/keystore.properties` (gitignored):
```bash
keytool -genkey -v -keystore ffd-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ffd
```
```properties
# android/keystore.properties
storeFile=/abs/path/ffd-release.jks
storePassword=********
keyAlias=ffd
keyPassword=********
```
`android/app/build.gradle` already wires this (the release signingConfig activates only when the file exists). Print the **SHA-256** for App Links (step 5):
```bash
keytool -list -v -keystore ffd-release.jks -alias ffd | grep SHA256
```

## 3. Version bump
`android/app/build.gradle` → bump `versionCode` (integer, +1 each release) and `versionName` (e.g. `0.1.0`).

## 4. Build the bundle
```bash
# point .env at production:  VITE_API_BASE_URL=https://<host>/api/app/v1  (and remove VITE_USE_MOCKS)
npm run build && npm run cap:sync
cd android && ./gradlew bundleRelease   # → app/build/outputs/bundle/release/app-release.aab
```
> **Optional minify:** `minifyEnabled true` + `shrinkResources true` in `build.gradle` shrinks the
> APK but must be **verified on-device** with the Capacitor consumer ProGuard rules before relying on it.

## 5. App Links (so WhatsApp/web links open the app)
Send the backend (request **0005**) the **package** `pk.gov.pmd.ffd.flood` + the release **SHA-256**.
They host `/.well-known/assetlinks.json` and the `/app/{type}/{id}` redirect on the app host. Then
uncomment the App Link `<intent-filter android:autoVerify="true">` in `AndroidManifest.xml` (set the
real host) and re-build. The `ffd://` scheme filter already works for push taps.

## 6. Play Console
- **Privacy policy** URL (required). Must cover: account email/name, device push token, and that
  no precise location is collected.
- **Data safety form** — declare:
  | Data | Collected | Purpose |
  |---|---|---|
  | Email + name | Yes (account only; optional — app works anonymously) | Account, personalization |
  | Device/FCM token | Yes | Push notifications |
  | App interactions (crash/opens) | Yes (analytics seam) | Diagnostics |
  | Precise/approx location | **No** | — |
- Complete the content rating questionnaire; upload the `.aab`; roll out to internal testing first.

## Carryover verification (couldn't be tested without a device)
- **Cold-start notification tap** → deep-links correctly (PushManager handles `getLaunchUrl` + the
  push `actionPerformed` replay; verify on a real device).
- **`flood_alerts` channel** shows with the intended importance/tone.
- **App Links** open the app after `assetlinks.json` is live (use `adb shell am start -d "https://…/app/advisory/1"`).
- **Token storage** is `@capacitor/preferences` (app-private SharedPreferences), not the Keystore —
  acceptable for this data class; revisit if scope grows.
