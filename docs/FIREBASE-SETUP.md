# Firebase / FCM setup (Phase 2)

The push code (`src/lib/push.ts`, `src/lib/devices.ts`, `src/components/PushManager.tsx`)
is complete and no-ops on web. To actually **receive** pushes on Android you must connect a
Firebase project and add the Google Services Gradle plugin. None of this is committed
(`google-services.json` is gitignored), so do it once locally / in CI.

> Until these steps are done, `npm run dev` and `npm run build` work fine (push is native-only
> and guarded), but an Android **APK build will fail** once the steps are half-applied — apply
> all of them together.

## 1. Firebase project
1. Create a Firebase project (or reuse the Pak Flood DSS one if shared).
2. Add an **Android app** with package name **`pk.gov.pmd.ffd.flood`** (matches `capacitor.config.ts`).
3. Download **`google-services.json`** → place at `android/app/google-services.json`.

## 2. Gradle wiring (Capacitor does not add this automatically)
`android/build.gradle` — add the classpath:
```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.2'
  }
}
```
> The `com.google.gms:google-services` classpath resolves from **Google's Maven repo** —
> ensure `google()` is in `buildscript { repositories { … } }`. Capacitor 6's generated
> `android/build.gradle` already includes it; only an eye on it if you've customised repos.

**Do NOT add `apply plugin: 'com.google.gms.google-services'` yourself** — `android/app/build.gradle`
already auto-applies it (the guarded block at the bottom) **when `google-services.json` is present**.
Adding it manually causes a duplicate-plugin Gradle error. You only need the classpath above.

## 3. Sync + run
```bash
npm run build && npm run cap:sync
npm run android:run     # needs JDK 17+ and the Android SDK
```

## 4. Backend side (the other half)
- The server needs the **FCM v1 service-account JSON** at the path in `FCM_CREDENTIALS`
  (`FcmService` already implements HTTP v1 — see `docs/BACKEND-INTEGRATION.md` §3). Same Firebase
  project as the app.
- The device endpoints (`POST /devices`, `/devices/heartbeat`, `DELETE /devices`) are tracked in
  `backend/0002-devices-push-registration.md`.

## Notes
- **Android 13+ runtime permission** (`POST_NOTIFICATIONS`) is handled by
  `@capacitor/push-notifications` + our pre-prompt (`PushManager`) → OS dialog.
- **Notification channel**: `FcmService` can target an Android channel id (e.g. `flood_alerts`)
  for a distinct sound. Create the channel client-side if we want a custom tone (Phase 5 polish).
- **Tap deeplinks**: the backend sends `data.deeplink = "ffd://<type>/<id>"`; `routeForData`
  resolves it and `PushManager` navigates. No native intent-filter needed (handled in-WebView).
