import Scanner from '@/components/Scanner';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import {
  addInventoryLine,
  removeInventoryLine,
  searchProductByBarcode
} from '@/store/inventorySlice';
import { InventoryLine, Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
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
  const { loading, error, currentLocation, inventoryLines } = useSelector(state => state.inventory);
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

  const handleRemoveFromInventory = (lineId: number) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette ligne d\'inventaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch(removeInventoryLine(lineId)) },
      ]
    );
  };

  const renderInventoryLine = useCallback(({ item }: { item: InventoryLine }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
        <View style={styles.inventoryProductInfo}>
          <Text style={styles.inventoryProductName} numberOfLines={1}>{item.product_name}</Text>
          <View style={styles.inventoryMeta}>
            <Text style={styles.inventoryLocation}>📍 {item.location_name}</Text>
            {item.product_barcode && (
              <Text style={styles.inventoryBarcode}>📱 {item.product_barcode}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => item.id && handleRemoveFromInventory(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inventoryContent}>
        <View style={styles.quantityRow}>
          <View style={styles.quantityItem}>
            <Text style={styles.quantityLabel}>Théorique</Text>
            <Text style={styles.quantityValue}>{item.theoretical_qty}</Text>
          </View>
          <View style={styles.quantityArrow}>
            <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
          </View>
          <View style={styles.quantityItem}>
            <Text style={styles.quantityLabel}>Compté</Text>
            <Text style={styles.quantityValue}>{item.product_qty}</Text>
          </View>
        </View>
        
        <View style={[
          styles.differenceContainer,
          { 
            backgroundColor: item.difference_qty === 0 ? '#F0F9FF' : 
                           item.difference_qty > 0 ? '#ECFDF5' : '#FEF2F2' 
          }
        ]}>
          <Ionicons 
            name={item.difference_qty === 0 ? "checkmark-circle" : 
                  item.difference_qty > 0 ? "trending-up" : "trending-down"} 
            size={16} 
            color={item.difference_qty === 0 ? '#0EA5E9' :
                   item.difference_qty > 0 ? '#10B981' : '#DC2626'} 
          />
          <Text style={[
            styles.differenceText,
            { 
              color: item.difference_qty === 0 ? '#0EA5E9' :
                     item.difference_qty > 0 ? '#10B981' : '#DC2626' 
            }
          ]}>
            {item.difference_qty === 0 ? 'Conforme' : 
             `Écart: ${item.difference_qty > 0 ? '+' : ''}${item.difference_qty}`}
          </Text>
        </View>
      </View>
    </View>
  ), []);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Connexion requise</Text>
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
          <Ionicons name="location-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Emplacement requis</Text>
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>📱 Scanner</Text>
            <Text style={styles.subtitle}>📍 {currentLocation.name}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{inventoryLines.length}</Text>
              <Text style={styles.statLabel}>Lignes</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.scanSection}>
          {lastScannedCode && (
            <View style={styles.lastScanContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <View style={styles.lastScanInfo}>
                <Text style={styles.lastScanLabel}>Dernier scan</Text>
                <Text style={styles.lastScanCode}>{lastScannedCode}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <View style={styles.scanButtonContent}>
              <Ionicons name="camera-outline" size={28} color="white" />
              <Text style={styles.scanButtonText}>Scanner un produit</Text>
              <Text style={styles.scanButtonSubtext}>Appuyez pour commencer</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inventorySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Lignes d'inventaire</Text>
            <View style={styles.inventoryCount}>
              <Text style={styles.inventoryCountText}>{inventoryLines.length}</Text>
            </View>
          </View>
          
          {inventoryLines.length === 0 ? (
            <View style={styles.emptyInventory}>
              <Ionicons name="clipboard-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucune ligne d'inventaire</Text>
              <Text style={styles.emptySubtext}>Scannez des produits pour commencer</Text>
            </View>
          ) : (
            <FlatList
              data={inventoryLines}
              renderItem={renderInventoryLine}
              keyExtractor={item => item.id?.toString() || Math.random().toString()}
              style={styles.inventoryList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.inventoryListContent}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          )}
        </View>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scanSection: {
    paddingVertical: 20,
  },
  lastScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lastScanInfo: {
    marginLeft: 12,
  },
  lastScanLabel: {
    fontSize: 14,
    color: '#064E3B',
    fontWeight: '500',
  },
  lastScanCode: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scanButtonContent: {
    alignItems: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  scanButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  inventorySection: {
    flex: 1,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  inventoryCount: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inventoryCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inventoryList: {
    flex: 1,
  },
  inventoryListContent: {
    paddingBottom: 20,
  },
  inventoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inventoryProductInfo: {
    flex: 1,
  },
  inventoryProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  inventoryMeta: {
    gap: 2,
  },
  inventoryLocation: {
    fontSize: 14,
    color: '#64748B',
  },
  inventoryBarcode: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  inventoryContent: {
    gap: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  quantityArrow: {
    paddingHorizontal: 12,
  },
  differenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  itemSeparator: {
    height: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyInventory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
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