# IM Inventory - Odoo Mobile Inventory Management

This is a mobile application built with [Expo](https://expo.dev) for managing inventory in an Odoo ERP system. It allows users to scan product barcodes, update stock quantities, and validate inventory adjustments directly from their mobile devices.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Building for Production (Android APK)](#building-for-production-android-apk)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Features

-   **User Authentication**: Secure login to your Odoo instance.
-   **Product Catalog**: View and search for products.
-   **Barcode Scanning**: Quickly find products using the device's camera.
-   **Inventory Adjustments**: Create and manage inventory lines.
-   **Real-time Updates**: Synchronize inventory data with your Odoo backend.
-   **Location-based Inventory**: Manage stock for different warehouse locations.

## Prerequisites

Before you begin, ensure you have the following installed:
-   [Node.js](https://nodejs.org/) (LTS version recommended)
-   An active Odoo instance (version 14 or higher) accessible from your development machine/network.

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd odoo-inventaire
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Odoo Connection:**
    The application needs to connect to your Odoo instance. The connection configuration is managed within the app's settings screen. No `.env` file is needed for this.

4.  **Generate native project files:**
    This command will create the `android` and `ios` directories.
    ```bash
    npx expo prebuild
    ```

5.  **Enable HTTP traffic (for development on Android):**
    If your Odoo instance is not served over HTTPS during development, you need to allow clear text traffic. In `android/app/src/main/AndroidManifest.xml`, add `android:usesCleartextTraffic="true"` to the `<application>` tag:
    ```xml
    <application
      android:name=".MainApplication"
      android:usesCleartextTraffic="true"
      ...>
    ```

## Usage

To start the development server and run the app:

```bash
npx expo start
```

This will open the Expo developer tools in your browser. You can then:
-   Run on an Android emulator or connected device.
-   Run on an iOS simulator or connected device.
-   Run in the browser (web support).

## Building for Production (Android APK)

1.  **Create a Keystore for signing:**
    You need to sign your APK to distribute it. First, generate a keystore file:
    ```bash
    keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
    ```
    Follow the prompts to create the keystore. Place the generated `my-release-key.keystore` file inside the `android/app/` directory.

2.  **Configure Gradle for signing:**
    Open `android/gradle.properties` and add the following lines with your keystore credentials. It's recommended to use environment variables for security instead of hardcoding passwords.
    ```properties
    MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
    MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
    MYAPP_UPLOAD_STORE_PASSWORD=your-store-password
    MYAPP_UPLOAD_KEY_PASSWORD=your-key-password
    ```

3.  **Build the APK:**
    Navigate to the `android` directory and run the Gradle command to build the release APK.
    ```bash
    cd android
    ./gradlew assembleRelease
    # On Windows, use:
    # gradlew.bat assembleRelease
    ```
    The signed APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

## Project Structure

A brief overview of the key directories in this project:

```
.
├── app/                # Expo Router file-based routing
│   ├── (tabs)/         # Layout for tab navigation
│   └── _layout.tsx     # Root layout
├── assets/             # Static assets (fonts, images, audio)
├── components/         # Reusable React components
├── hooks/              # Custom React hooks
├── services/           # Services for external APIs (e.g., Odoo)
├── store/              # Redux Toolkit state management
└── types/              # TypeScript type definitions
```

## Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute code, please open an issue or submit a pull request.
