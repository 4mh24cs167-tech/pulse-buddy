# Privacy Policy for Pulse Buddy

**Effective Date:** 2026-10-08

## 1. Introduction
Pulse Buddy is a privacy-first, local-offline companion application designed to help you manage reminders with a virtual 3D buddy. We prioritize your privacy above all else. 

## 2. Data Collection and Storage
**We do not collect, transmit, or share any personal data.** 
Pulse Buddy operates entirely on your local device. 

* **Reminders and Settings:** All reminder data, scheduling constraints, and app preferences are stored locally in the application's secure data directory (`state.json`).
* **Custom Buddies (Photos):** Any photos uploaded to create custom buddies are encoded and saved strictly within your device's local AssetStore. No images are uploaded to the cloud, and no external servers process your photos.
* **Usage Statistics:** Information such as your current streak, reminder history, and interaction counts are only kept locally to display progress.
* **No Telemetry/Analytics:** Pulse Buddy does not use any tracking SDKs, analytics frameworks, or telemetry services.

## 3. Third-Party Services
Pulse Buddy does not integrate with remote ad-networks or cloud data providers. We use `@capacitor/local-notifications` to schedule alerts using your device's native hardware. This does not involve sending data to push-notification servers (like FCM or APNs) externally.

## 4. Export / Import
You have full control over your data. You may export your settings and custom buddies to a local `.pbuddy` file for your own backups. We are not responsible for where you store these exported files.

## 5. Contact
If you have any questions about this privacy policy, please contact the developer at: [Insert Developer Contact Information]
