# PULSE BUDDY RELEASE ARTIFACTS

This document certifies the release configuration to be built by the GitHub Actions CI workflow for Android.

| Metric | Configured Value |
| :--- | :--- |
| **Package Name** | `com.pulse.buddy` |
| **Version Name** | `1.0.9` |
| **Version Code** | `9` |
| **Target SDK** | `36` |
| **Min SDK** | `24` |
| **AAB Path** | `android/app/build/outputs/bundle/release/app-release.aab` |
| **APK Path** | `android/app/build/outputs/apk/release/app-release.apk` |

### Play App Signing Integration
The CI workflow (`android-release.yml`) is fully equipped to securely inject keystore values natively into the Gradle pipeline when GitHub Action Secrets are present:
- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

If signed, the SHA-256 fingerprint will be visibly output inside the GitHub Actions CI log.

### Git References
- **Git Commit:** (Refer to `main` HEAD)
- **Git Tag:** `v1.0.9`
