FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_COMPILE_SDK=34
ENV ANDROID_BUILD_TOOLS=34.0.0
ENV ANDROID_SDK_TOOLS=13114758
ENV PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/tools/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    wget \
    unzip \
    git \
    curl \
    ca-certificates \
    gnupg \
    python3 \
    python3-pip \
    build-essential \
    zip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (latest stable LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install --global yarn eas-cli

# Install Android SDK with fixed version
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_TOOLS}_latest.zip -O /tmp/sdk-tools.zip && \
    unzip -q /tmp/sdk-tools.zip -d /tmp/sdk && \
    rm -rf $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    mv /tmp/sdk/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    rm -rf /tmp/sdk-tools.zip /tmp/sdk && \
    yes | $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --licenses && \
    $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_SDK_ROOT \
        "platform-tools" \
        "platforms;android-${ANDROID_COMPILE_SDK}" \
        "build-tools;${ANDROID_BUILD_TOOLS}"

# Verify installations
RUN node -v && npm -v && java -version

WORKDIR /app

# Exemple d'utilisation
# docker run -it --rm -v $(pwd):/app your-image-name bash
# This Dockerfile sets up an environment for Android development with Node.js and EAS CLI.
# You can build and run your Android applications using this image.
