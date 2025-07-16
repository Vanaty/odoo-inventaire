import Scanner from '@/components/Scanner';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import {
  addInventoryLine,
  searchProductByBarcode
} from '@/store/inventorySlice';
import { Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ScanScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  const dispatch = useAppDispatch();
  const { loading, error, currentLocation } = useSelector(state => state.inventory);
  const { isAuthenticated } = useSelector(state => state.auth);

  const handleScan = async (barcode: string) => {
    if (!isAuthenticated) {
      Alert.alert('Erreur', 'Veuillez vous connecter d\'abord');
      return;
    }

    setLastScannedCode(barcode);
    setShowScanner(false);

    try {
      const product = await dispatch(searchProductByBarcode(barcode)).unwrap();
      if (product) {
        setScannedProduct(product);
        setShowQuantityModal(true);
      } else {
        Alert.alert(
          'Produit non trouvé',
          `Aucun produit trouvé avec le code-barres: ${barcode}`,
          [
            { text: 'OK' },
            { text: 'Scanner à nouveau', onPress: () => setShowScanner(true) }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Erreur', error as string);
    }
  };

  const handleAddToInventory = async () => {
    if (!scannedProduct || !quantity || !currentLocation) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité et sélectionner un emplacement');
      return;
    }

    try {
      await dispatch(addInventoryLine({
        product_id: scannedProduct.id,
        product_name: scannedProduct.name,
        product_barcode: scannedProduct.barcode,
        theoretical_qty: scannedProduct.qty_available,
        product_qty: parseFloat(quantity),
        difference_qty: parseFloat(quantity) - scannedProduct.qty_available,
        location_id: currentLocation.id,
        location_name: currentLocation.name,
      })).unwrap();

      setShowQuantityModal(false);
      setScannedProduct(null);
      setQuantity('');
      
      Alert.alert(
        'Succès',
        'Produit ajouté à l\'inventaire',
        [
          { text: 'OK' },
          { text: 'Scanner suivant', onPress: () => setShowScanner(true) }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', error as string);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text style={styles.notAuthenticatedText}>
            Veuillez vous connecter pour utiliser le scanner
          </Text>
        </View>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
          <Text style={styles.notAuthenticatedText}>
            Veuillez sélectionner un emplacement dans l'onglet Inventaire
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scanner</Text>
        <Text style={styles.subtitle}>Emplacement: {currentLocation.name}</Text>
      </View>

      <View style={styles.centerContent}>
        <Ionicons name="camera-outline" size={80} color="#3B82F6" />
        <Text style={styles.instructionText}>
          Scannez un code-barres pour ajouter un produit à l'inventaire
        </Text>
        
        {lastScannedCode && (
          <View style={styles.lastScanContainer}>
            <Text style={styles.lastScanLabel}>Dernier code scanné:</Text>
            <Text style={styles.lastScanCode}>{lastScannedCode}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
        >
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.scanButtonText}>Commencer le scan</Text>
        </TouchableOpacity>
      </View>

      {/* Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <Scanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      {/* Quantity Modal */}
      <Modal
        visible={showQuantityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={styles.modalTitle}>Produit trouvé !</Text>
            
            {scannedProduct && (
              <>
                <Text style={styles.modalProductName}>{scannedProduct.name}</Text>
                <Text style={styles.modalProductInfo}>
                  Code: {scannedProduct.default_code}
                </Text>
                <Text style={styles.modalProductInfo}>
                  Stock actuel: {scannedProduct.qty_available} {scannedProduct.uom_name}
                </Text>
                
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Quantité comptée:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                    autoFocus
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowQuantityModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalAddButton}
                    onPress={handleAddToInventory}
                    disabled={!quantity}
                  >
                    <Text style={styles.modalAddText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  lastScanContainer: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  lastScanLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  lastScanCode: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalProductInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalInputContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});