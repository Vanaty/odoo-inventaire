import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import { clearError, login } from '@/store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function LoginScreen() {
  const [url, setUrl] = useState('http://192.168.68.148:8070');
  const [database, setDatabase] = useState('ilo_market');
  const [username, setUsername] = useState('benjadaoro');
  const [password, setPassword] = useState('Voloina713');

  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth);

  const handleLogin = async () => {
    if (!url || !database || !username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    dispatch(clearError());
    
    try {
      await dispatch(login({
        url: url.trim(),
        database: database.trim(),
        username: username.trim(),
        password: password.trim(),
      })).unwrap();
    } catch (error) {
      Alert.alert('Erreur de connexion', error as string);
    }
  };

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#10B981" />
          <Text style={styles.welcomeText}>Bienvenue !</Text>
          <Text style={styles.userInfo}>{user.name}</Text>
          <Text style={styles.companyInfo}>{user.company_name}</Text>
          <Text style={styles.infoText}>
            Vous êtes connecté à Odoo. Utilisez l'onglet Inventaire pour gérer vos produits.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="server-outline" size={48} color="#3B82F6" />
          <Text style={styles.title}>Connexion Odoo</Text>
          <Text style={styles.subtitle}>Inventaire Mobile</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="globe-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="URL du serveur Odoo"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="server-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Nom de la base de données"
                value={database}
                onChangeText={setDatabase}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Nom d'utilisateur"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  userInfo: {
    fontSize: 18,
    color: '#3B82F6',
    marginTop: 8,
  },
  companyInfo: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 24,
  },
});