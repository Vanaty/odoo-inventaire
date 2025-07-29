import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { restoreSession } from '@/store/authSlice';
import { store } from '@/store/store';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <SafeAreaView style={styles.container}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </SafeAreaView>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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