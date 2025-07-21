import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { restoreSession } from '@/store/authSlice';
import { store } from '@/store/store';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  useFrameworkReady();

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
        });
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        setFontsLoaded(true);
      }
    }

    async function restoreUserSession() {
      try {
        await store.dispatch(restoreSession());
      } catch (error) {
        console.log('No session to restore or session expired');
      } finally {
        setSessionRestored(true);
      }
    }

    const initializeApp = async () => {
      await Promise.all([loadFonts(), restoreUserSession()]);
      await SplashScreen.hideAsync();
    };

    initializeApp();
  }, []);

  if (!fontsLoaded || !sessionRestored) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});