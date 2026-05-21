# SamTaxco — Android app

This project ships an Android wrapper around the live SamTaxco web app via
**Capacitor**. The native shell is a thin WebView that loads the production
URL; pushing web updates is instant (no app store re-submission for content
changes), only the native shell needs re-publishing when you add a Capacitor
plugin or change the icon / splash.

## Architecture

| Layer | What it is |
|---|---|
| Web | The Next.js app at `https://samtaxco.app` (or wherever you deploy) |
| Native shell | `android/` — a Capacitor-generated Gradle project. Loads the web URL in a WebView. |
| Plugins | `@capacitor/app` (back button), `@capacitor/status-bar`, `@capacitor/splash-screen` |
| Authentication | WebAuthn / passkeys (biometric login) work directly inside the WebView — the same code paths as the website |

The `webDir: "public"` in `capacitor.config.ts` is required by Capacitor but
not actually used at runtime because `server.url` redirects every request to
the live server. This is the standard pattern for Next.js + Capacitor apps.

## Build the APK in the cloud (recommended)

The repo includes `.github/workflows/android-build.yml`. The first push to
`main` triggers a CI build automatically.

1. **Create a GitHub repo** for the project (private is fine).
2. Push the repo:
   ```bash
   cd F:/WebAppProject/mindset-app
   git init && git add . && git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/samtaxco.git
   git push -u origin main
   ```
3. Wait ~6 minutes for the **Android APK** workflow to finish (Actions tab).
4. Download `samtaxco-debug-apk` from the workflow run page.
5. Side-load on your Android phone (see "Install on phone" below).

## Build the APK locally (optional)

You only need this if you want to iterate quickly without pushing to CI.

Requirements:
- **Java JDK 21** ([Adoptium Temurin](https://adoptium.net/) recommended)
- **Android Studio** ([download](https://developer.android.com/studio)) — installs Android SDK + platform tools

After installing both:
```powershell
cd F:\WebAppProject\mindset-app
npx cap sync android        # copies the latest config + plugins into android/
npx cap open android        # opens Android Studio
# Then in Android Studio: Build → Build APK(s)
```
The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.

Or fully command-line:
```powershell
cd android
./gradlew assembleDebug
```

## Install on phone

Two options:

**A. Side-load via USB**

1. Enable Developer Mode on the phone (Settings → About → tap "Build number" 7 times).
2. Enable USB debugging.
3. `adb install android/app/build/outputs/apk/debug/app-debug.apk`

**B. APK transfer (no USB)**

1. Email/AirDrop/Drive the `.apk` to the phone.
2. Tap it → Android asks for "Install from unknown sources" — allow.
3. App lands in the drawer with the SamTaxco brand icon.

## Production / Play Store distribution

Two extra steps beyond CI:

### 1. Generate a signing keystore (one time)

```bash
keytool -genkey -v -keystore release.keystore -alias samtaxco \
  -keyalg RSA -keysize 2048 -validity 10000
```
Remember the keystore password + key password — **don't lose them**, you can
never publish an update without them.

### 2. Add the secrets to GitHub

In the repo's **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE` | `cat release.keystore \| base64 -w0` (the keystore base64-encoded) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `samtaxco` |
| `ANDROID_KEY_PASSWORD` | the key password |
| `SAMTAXCO_PROD_URL` | optional: override the URL (default is `https://samtaxco.app`) |

### 3. Trigger a release build

Either:
- **Manually**: GitHub → Actions → "Android APK" → "Run workflow" → check "Build signed release APK"
- **Or push a git tag**: `git tag v1.0.0 && git push --tags`

The CI uploads `samtaxco-release-apk` as a 365-day artifact. Download it,
upload to the Play Console.

### 4. Google Play Console

- **One-time fee**: $25 USD (https://play.google.com/console/u/0/signup)
- Upload the signed APK / AAB.
- Fill in app metadata, screenshots, content rating, privacy policy URL.
- Submit for review (usually < 1 day for first review).

## Updating the app

Three flavours of updates:

| Type of change | Action required |
|---|---|
| **Content / UI / API / database** | Just deploy the Next.js server. The wrapper auto-loads the new code. **No app store submission.** |
| **App icon, splash, name, version bump** | Re-run CI (push to main or trigger workflow). Upload the new APK to Play. |
| **Capacitor plugin added / removed** | `npm install …`, then `npx cap sync android`, then push to trigger CI build. |

## Switching the production URL

Edit `capacitor.config.ts` → set `SAMTAXCO_PROD_URL` either in `.env` (local)
or via GitHub Secret (CI). Re-run `npx cap sync android` so the embedded
`capacitor.config.json` in `android/app/src/main/assets/` picks it up.

## Local development against `npm run dev`

To test the Android wrapper against your local dev server (without deploying):
```powershell
$env:SAMTAXCO_USE_DEV = "1"
npx cap sync android
npx cap open android
# Run on an emulator (the URL will be http://10.0.2.2:3000 — emulator's host loopback)
```

## Folder map

```
mindset-app/
├── android/                          ← generated by `npx cap add android`
│   ├── app/
│   │   ├── build.gradle              ← signing config lives here
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── assets/
│   │       │   ├── capacitor.config.json   ← runtime config (server.url)
│   │       │   └── public/                 ← copy of /public web assets
│   │       └── res/
│   │           ├── mipmap-*/         ← brand-gradient launcher icons
│   │           └── values/strings.xml ← app name
│   ├── gradle/                       ← Gradle wrapper
│   ├── gradlew                       ← Gradle launcher (use this, not host gradle)
│   └── settings.gradle
├── capacitor.config.ts               ← Capacitor source config
├── .github/workflows/android-build.yml ← CI workflow
└── scripts/
    ├── generate-android-icons.mjs   ← regenerate icons from a tweaked design
    └── ...
```

## Troubleshooting

**"Java not found" when running gradlew locally**
Install JDK 21 from https://adoptium.net/ and add it to PATH.

**WebView shows a blank page on first launch**
Check `capacitor.config.ts`: `server.url` must be reachable from the phone.
If it's localhost from your dev machine, the phone can't reach `127.0.0.1` —
use your machine's LAN IP (`http://192.168.x.y:3000`) instead.

**Biometric login not working in the APK**
WebAuthn requires HTTPS in production. Localhost is the only exception.
Ensure `server.url` is `https://...`.

**APK is too large**
The debug APK is ~5 MB because all UI is fetched at runtime. There's nothing
to shrink. The release APK is smaller still.
