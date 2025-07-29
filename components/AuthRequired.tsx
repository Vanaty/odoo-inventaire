import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AuthRequiredProps {
  title?: string;
  message?: string;
  iconName?: string;
}

export default function AuthRequired({ 
  title = "Connexion requise",
  message = "Veuillez vous connecter pour accéder à cette fonctionnalité",
  iconName = "lock-closed-outline"
}: AuthRequiredProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={80} color="white" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // grey
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  iconContainer: {
    backgroundColor: '#F7931A', // warning
    borderRadius: 40,
    padding: 32,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: '#263238', // midnight_text
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#666C78', // charcoalGray
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 320,
  },
});
