import AuthRequired from '@/components/AuthRequired';
import Scanner from '@/components/Scanner';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import {
  addInventoryLine,
  deleteInventoryLine,
  loadInventoryLines,
  searchProductByBarcode,
  validateInventoryLines
} from '@/store/inventorySlice';
import { InventoryLine, Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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

  // Load existing inventory lines when location changes
  useEffect(() => {
    if (isAuthenticated && currentLocation) {
      dispatch(loadInventoryLines(currentLocation.id));
    }
  }, [dispatch, isAuthenticated, currentLocation]);

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
      
      // Reload inventory lines to get updated data
      dispatch(loadInventoryLines(currentLocation.id));
      
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

  const handleValidateAll = async () => {
    if (inventoryLines.length === 0) {
      Alert.alert('Aucune ligne', 'Il n\'y a aucune ligne d\'inventaire à valider');
      return;
    }

    Alert.alert(
      'Valider tout l\'inventaire',
      `Êtes-vous sûr de vouloir valider toutes les ${inventoryLines.length} lignes d'inventaire ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Valider tout', 
          style: 'default',
          onPress: async () => {
            try {
              const lineIds = inventoryLines.map(line => line.id!).filter(id => id);
              await dispatch(validateInventoryLines(lineIds)).unwrap();
              Alert.alert('Succès', 'Toutes les lignes d\'inventaire ont été validées');
            } catch (error) {
              Alert.alert('Erreur', error as string);
            }
          }
        },
      ]
    );
  };

  const handleValidateLine = async (lineId: number, productName: string) => {
    Alert.alert(
      'Valider la ligne',
      `Valider la ligne d'inventaire pour "${productName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Valider', 
          style: 'default',
          onPress: async () => {
            try {
              await dispatch(validateInventoryLines([lineId])).unwrap();
              Alert.alert('Succès', 'Ligne d\'inventaire validée');
            } catch (error) {
              Alert.alert('Erreur', error as string);
            }
          }
        },
      ]
    );
  };

  const handleRemoveFromInventory = async (lineId: number) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette ligne d\'inventaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await dispatch(deleteInventoryLine(lineId)).unwrap();
            } catch (error) {
              Alert.alert('Erreur', error as string);
            }
          }
        },
      ]
    );
  };

  const renderInventoryLine = useCallback(({ item }: { item: InventoryLine }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
        <View style={styles.inventoryProductInfo}>
          <Text style={styles.inventoryProductName} numberOfLines={2}>{item.product_name}</Text>
          <View style={styles.inventoryMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={14} color="#64748B" />
              <Text style={styles.inventoryLocation}>{item.location_name}</Text>
            </View>
            {item.product_barcode && (
              <View style={styles.metaItem}>
                <Ionicons name="barcode" size={14} color="#64748B" />
                <Text style={styles.inventoryBarcode}>{item.product_barcode}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.validateButton}
            onPress={() => item.id && handleValidateLine(item.id, item.product_name)}
          >
            <Ionicons name="checkmark" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => item.id && handleRemoveFromInventory(item.id)}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.inventoryContent}>
        <View style={styles.quantityRow}>
          <View style={styles.quantityItem}>
            <Text style={styles.quantityLabel}>Théorique</Text>
            <Text style={styles.quantityValue}>{item.theoretical_qty}</Text>
          </View>
          <View style={styles.quantityArrow}>
            <Ionicons name="arrow-forward" size={20} color="#CBD5E1" />
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
            size={18} 
            color={item.difference_qty === 0 ? '#0EA5E9' :
                   item.difference_qty > 0 ? '#10B981' : '#EF4444'} 
          />
          <Text style={[
            styles.differenceText,
            { 
              color: item.difference_qty === 0 ? '#0EA5E9' :
                     item.difference_qty > 0 ? '#10B981' : '#EF4444' 
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
      <AuthRequired
        title='Connexion requise'
        message='Veuillez vous connecter pour accéder au scanner'
        iconName='camera-outline'
      />
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
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Scanner</Text>
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color="#df9e1d" />
              <Text style={styles.subtitle}>{currentLocation.name}</Text>
            </View>
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
        {lastScannedCode && (
          <View style={styles.lastScanContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <View style={styles.lastScanInfo}>
              <Text style={styles.lastScanLabel}>Dernier scan</Text>
              <Text style={styles.lastScanCode}>{lastScannedCode}</Text>
            </View>
          </View>
        )}

        <View style={styles.inventorySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="list" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Lignes d'inventaire</Text>
            </View>
            <View style={styles.headerActions}>
              {inventoryLines.length > 0 && (
                <TouchableOpacity
                  style={styles.validateAllButton}
                  onPress={handleValidateAll}
                >
                  <Ionicons name="checkmark-done" size={16} color="white" />
                  <Text style={styles.validateAllText}>Valider tout</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {inventoryLines.length === 0 ? (
            <View style={styles.emptyInventory}>
              <View style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyText}>Aucune ligne d'inventaire</Text>
              <Text style={styles.emptySubtext}>Appuyez sur le bouton caméra pour scanner</Text>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowScanner(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={28} color="white" />
      </TouchableOpacity>

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
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Produit trouvé</Text>
            
            {scannedProduct && (
              <>
                <View style={styles.productCard}>
                  <Text style={styles.modalProductName}>{scannedProduct.name}</Text>
                  <View style={styles.productDetails}>
                    <View style={styles.productDetailItem}>
                      <Text style={styles.productDetailLabel}>Code:</Text>
                      <Text style={styles.productDetailValue}>{scannedProduct.default_code}</Text>
                    </View>
                    <View style={styles.productDetailItem}>
                      <Text style={styles.productDetailLabel}>Stock actuel:</Text>
                      <Text style={styles.productDetailValue}>
                        {scannedProduct.qty_available} {scannedProduct.uom_name}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Quantité comptée</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Entrez la quantité"
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
                    style={[styles.modalAddButton, !quantity && styles.modalAddButtonDisabled]}
                    onPress={handleAddToInventory}
                    disabled={!quantity}
                  >
                    <Text style={styles.modalAddText}>Ajouter à l'inventaire</Text>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 12,
    color: '#df401d',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  lastScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  successIcon: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 8,
  },
  lastScanInfo: {
    marginLeft: 12,
    flex: 1,
  },
  lastScanLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  lastScanCode: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  inventorySection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  inventoryList: {
    flex: 1,
  },
  inventoryListContent: {
    paddingBottom: 100, // Space for floating button
  },
  inventoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inventoryProductInfo: {
    flex: 1,
    marginRight: 12,
  },
  inventoryProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 20,
  },
  inventoryMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inventoryLocation: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },
  inventoryBarcode: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  validateButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  inventoryContent: {
    gap: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  itemSeparator: {
    height: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
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
    paddingVertical: 48,
  },
  emptyIcon: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#df9e1d',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#df9e1d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  productDetails: {
    gap: 8,
  },
  productDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  productDetailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  modalInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#FFFBEB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 2,
    backgroundColor: '#df401d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalAddText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  validateAllButton: {
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  validateAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});