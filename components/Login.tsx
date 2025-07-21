import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import { odooService } from '@/services/odoo';
import { clearError, login } from '@/store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useCallback, useEffect, useState } from 'react';
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
import Logo from './Logo';

const STORAGE_KEYS = {
  URL: '@odoo_url',
  USERNAME: '@odoo_username',
  DATABASE: '@odoo_database',
};

interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [url, setUrl] = useState('http://192.168.68.150:8070');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('benjadaoro');
  const [password, setPassword] = useState('Voloina713');
  const [showDatabaseField, setShowDatabaseField] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const dispatch = useAppDispatch();
  const { loading, error } = useSelector(state => state.auth);

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const [savedUrl, savedUsername, savedDatabase] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.URL),
        AsyncStorage.getItem(STORAGE_KEYS.USERNAME),
        AsyncStorage.getItem(STORAGE_KEYS.DATABASE),
      ]);
      
      if (savedUrl) setUrl(savedUrl);
      if (savedUsername) setUsername(savedUsername);
      if (savedDatabase) setDatabase(savedDatabase);
    } catch (error) {
      console.log('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (urlValue: string, usernameValue: string, databaseValue: string) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.URL, urlValue),
        AsyncStorage.setItem(STORAGE_KEYS.USERNAME, usernameValue),
        AsyncStorage.setItem(STORAGE_KEYS.DATABASE, databaseValue),
      ]);
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const validateField = useCallback((field: string, value: string) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'url':
        if (!value.trim()) {
          errors.url = 'L\'URL est requise';
        } else if (!/^https?:\/\/.+/.test(value.trim())) {
          errors.url = 'URL invalide (doit commencer par http:// ou https://)';
        } else {
          delete errors.url;
        }
        break;
      case 'username':
        if (!value.trim()) {
          errors.username = 'Le nom d\'utilisateur est requis';
        } else {
          delete errors.username;
        }
        break;
      case 'password':
        if (!value.trim()) {
          errors.password = 'Le mot de passe est requis';
        } else if (value.length < 3) {
          errors.password = 'Le mot de passe doit contenir au moins 3 caractères';
        } else {
          delete errors.password;
        }
        break;
      case 'database':
        if (showDatabaseField && !value.trim()) {
          errors.database = 'La base de données est requise';
        } else {
          delete errors.database;
        }
        break;
    }
    
    setValidationErrors(errors);
  }, [validationErrors, showDatabaseField]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    validateField('url', newUrl);
  };

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    validateField('username', newUsername);
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    validateField('password', newPassword);
  };

  const handleDatabaseChange = (newDatabase: string) => {
    setDatabase(newDatabase);
    validateField('database', newDatabase);
  };

  // Check if database field should be shown when URL changes
  useEffect(() => {
    const checkDatabases = async () => {
      if (url.trim() && !validationErrors.url) {
        setLoadingDatabases(true);
        try {
          odooService.setConfig({ url: url.trim(), database: '', username: '', password: '' });
          const databases = await odooService.getDatabase();
          
          if (!databases || (Array.isArray(databases) && databases.length === 0)) {
            setShowDatabaseField(true);
            setAvailableDatabases([]);
            setDatabase('');
          } else if (Array.isArray(databases) && databases.length === 1) {
            setDatabase(databases[0]);
            setShowDatabaseField(false);
            setAvailableDatabases(databases);
          } else if (Array.isArray(databases) && databases.length > 1) {
            setShowDatabaseField(true);
            setAvailableDatabases(databases);
            if (!database || !databases.includes(database)) {
              setDatabase(databases[0]);
            }
          }
        } catch (error) {
          console.log('Could not fetch databases, showing database field');
          setShowDatabaseField(true);
          setAvailableDatabases([]);
        } finally {
          setLoadingDatabases(false);
        }
      }
    };

    const timeoutId = setTimeout(checkDatabases, 500);
    return () => clearTimeout(timeoutId);
  }, [url, validationErrors.url]);

  const isFormValid = () => {
    return Object.keys(validationErrors).length === 0 &&
           url.trim() && 
           username.trim() && 
           password.trim() && 
           (!showDatabaseField || database.trim());
  };

  const handleLogin = async () => {
    validateField('url', url);
    validateField('username', username);
    validateField('password', password);
    validateField('database', database);

    if (!isFormValid()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    dispatch(clearError());
    
    try {
      const credentials = {
        url: url.trim(),
        database: database.trim(),
        username: username.trim(),
        password: password.trim(),
      };

      await dispatch(login(credentials)).unwrap();
      await saveCredentials(credentials.url, credentials.username, credentials.database);
      onLoginSuccess?.();
    } catch (error) {
      Alert.alert('Erreur de connexion', error as string);
    }
  };

  const clearForm = () => {
    setUrl('');
    setDatabase('');
    setUsername('');
    setPassword('');
    setValidationErrors({});
    AsyncStorage.multiRemove([STORAGE_KEYS.URL, STORAGE_KEYS.USERNAME, STORAGE_KEYS.DATABASE]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <Logo size="large" style={styles.logoContainer} />
          <Text style={styles.title}>Connexion Odoo</Text>
          <Text style={styles.subtitle}>Authentifiez-vous pour continuer</Text>
        </View>

        <View style={styles.form}>
          {/* URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URL du serveur</Text>
            <View style={[
              styles.inputContainer, 
              loadingDatabases && styles.inputContainerLoading,
              validationErrors.url && styles.inputContainerError
            ]}>
              <Ionicons name="globe-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="https://votre-serveur.odoo.com"
                value={url}
                onChangeText={handleUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {loadingDatabases && (
                <Ionicons name="refresh" size={20} color="#3B82F6" />
              )}
            </View>
            {validationErrors.url && (
              <Text style={styles.errorText}>{validationErrors.url}</Text>
            )}
          </View>

          {/* Database Input/Picker */}
          {showDatabaseField && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base de données</Text>
              {availableDatabases.length > 1 ? (
                <View style={[styles.inputContainer, validationErrors.database && styles.inputContainerError]}>
                  <Ionicons name="server-outline" size={20} color="#6B7280" />
                  <Picker
                    selectedValue={database}
                    onValueChange={handleDatabaseChange}
                    style={styles.picker}
                  >
                    {availableDatabases.map((db) => (
                      <Picker.Item key={db} label={db} value={db} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <View style={[styles.inputContainer, validationErrors.database && styles.inputContainerError]}>
                  <Ionicons name="server-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Nom de la base de données"
                    value={database}
                    onChangeText={handleDatabaseChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
              {validationErrors.database && (
                <Text style={styles.errorText}>{validationErrors.database}</Text>
              )}
            </View>
          )}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
            <View style={[styles.inputContainer, validationErrors.username && styles.inputContainerError]}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Votre nom d'utilisateur"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
              />
            </View>
            {validationErrors.username && (
              <Text style={styles.errorText}>{validationErrors.username}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <View style={[styles.inputContainer, validationErrors.password && styles.inputContainerError]}>
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
            {validationErrors.password && (
              <Text style={styles.errorText}>{validationErrors.password}</Text>
            )}
          </View>

          {/* Global Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.errorContainerText}>{error}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                (!isFormValid() || loading || loadingDatabases) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={!isFormValid() || loading || loadingDatabases}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Connexion en cours...' : 
                 loadingDatabases ? 'Vérification...' : 'Se connecter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
              <Text style={styles.clearButtonText}>Effacer le formulaire</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 100,
    height: 90,
    borderRadius: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '300',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '300',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 54,
  },
  inputContainerLoading: {
    borderColor: '#3B82F6',
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  picker: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorContainerText: {
    color: '#DC2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#d8900c',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#d8900c',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
