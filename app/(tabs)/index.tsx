import FeatureCard from '@/components/FeatureCard';
import Login from '@/components/Login';
import Logo from '@/components/Logo';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import { logout } from '@/store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showLoginModal, setShowLoginModal] = useState(false);

  const dispatch = useAppDispatch();
  const { isAuthenticated, user, config } = useSelector(state => state.auth);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: () => dispatch(logout())
        }
      ]
    );
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  if (!isAuthenticated) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.welcomeSection}>
            <Logo size="large" style={styles.logoContainer} />
            <Text style={styles.appTitle}>ILO MARKET</Text>
            <Text style={styles.appSubtitle}>Application mobile de gestion d'inventaire</Text>
            
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>🚀 Fonctionnalités</Text>
              
              <FeatureCard
                icon="scan"
                iconColor="#10B981"
                title="Scanner de codes-barres"
                description="Scannez rapidement vos produits pour mettre à jour l'inventaire"
              />

              <FeatureCard
                icon="cube-outline"
                iconColor="#3B82F6"
                title="Gestion des produits"
                description="Recherchez et gérez facilement votre catalogue de produits"
              />

              <FeatureCard
                icon="location"
                iconColor="#F59E0B"
                title="Multi-emplacements"
                description="Gérez l'inventaire de plusieurs emplacements de stock"
              />

              <FeatureCard
                icon="cloud-done"
                iconColor="#8B5CF6"
                title="Synchronisation temps réel"
                description="Synchronisation automatique avec votre serveur Odoo"
              />
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => setShowLoginModal(true)}
            >
              <Ionicons name="log-in" size={20} color="white" />
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Login Modal */}
        <Modal
          visible={showLoginModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLoginModal(false)}
        >
          <View style={styles.modalContainer}>
            <Login onLoginSuccess={handleLoginSuccess} />
          </View>
        </Modal>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.authenticatedContainer}>
          <View style={styles.userSection}>
            {/* <View style={styles.userIconContainer}>
              <Ionicons name="person" size={32} color="#FBBF24" />
            </View> */}
            <Logo size="large" style={styles.userIconContainer} />
            <Text style={styles.welcomeText}>Bienvenue !</Text>
            <Text style={styles.userInfo}>{user?.name}</Text>
            <Text style={styles.companyInfo}>{user?.company_name}</Text>
          </View>

          <View style={styles.connectionCard}>
            <Text style={styles.connectionTitle}>📡 Connexion active</Text>
            <View style={styles.connectionDetails}>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>Serveur:</Text>
                <Text style={styles.connectionValue}>{config?.url}</Text>
              </View>
              {config?.database && (
                <View style={styles.connectionRow}>
                  <Text style={styles.connectionLabel}>Base de données:</Text>
                  <Text style={styles.connectionValue}>{config.database}</Text>
                </View>
              )}
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>Utilisateur:</Text>
                <Text style={styles.connectionValue}>{user?.login}</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>⚡ Actions rapides</Text>
            
            <FeatureCard
              icon="cube-outline"
              iconColor="#3B82F6"
              title="Gérer l'inventaire"
              description="Onglet Inventaire"
              onPress={() => {/* Navigate to inventory tab */}}
            />

            <FeatureCard
              icon="scan"
              iconColor="#10B981"
              title="Scanner des produits"
              description="Onglet Scanner"
              onPress={() => {/* Navigate to scan tab */}}
            />
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 Raccourcis</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="cube" size={20} color="#3B82F6" />
                <Text style={styles.statLabel}>Produits</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="location" size={20} color="#F59E0B" />
                <Text style={styles.statLabel}>Emplacements</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.statLabel}>Validés</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={20} color="#8B5CF6" />
                <Text style={styles.statLabel}>En cours</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  welcomeSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  appSubtitle: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#d8900c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: '#d8900c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  authenticatedContainer: {
    flex: 1,
    paddingTop: 40,
  },
  userSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userIconContainer: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '300',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 16,
    color: '#64748B',
  },
  connectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  connectionDetails: {
    gap: 8,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  connectionValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FECACA',
    gap: 8,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});