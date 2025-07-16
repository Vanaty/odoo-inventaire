import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import {
  addInventoryLine,
  loadLocations,
  removeInventoryLine,
  searchProducts,
  setCurrentLocation
} from '@/store/inventorySlice';
import { InventoryLine, Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

export default function InventoryScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const dispatch = useAppDispatch();
  const { products, inventoryLines, currentLocation, loading, error } = useSelector(state => state.inventory);
  const { isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(searchProducts(''));
      loadLocationData();
    }
  }, [isAuthenticated]);

  const loadLocationData = async () => {
    try {
      const result = await dispatch(loadLocations()).unwrap();
      setLocations(result);
      if (result.length > 0 && !currentLocation) {
        dispatch(setCurrentLocation(result[0]));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les emplacements');
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      dispatch(searchProducts(searchTerm));
    } else {
      dispatch(searchProducts(''));
    }
  };

  const handleAddToInventory = async () => {
    if (!selectedProduct || !quantity || !currentLocation) {
      Alert.alert('Erreur', 'Veuillez sélectionner un produit et saisir une quantité');
      return;
    }

    try {
      await dispatch(addInventoryLine({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_barcode: selectedProduct.barcode,
        theoretical_qty: selectedProduct.qty_available,
        product_qty: parseFloat(quantity),
        difference_qty: parseFloat(quantity) - selectedProduct.qty_available,
        location_id: currentLocation.id,
        location_name: currentLocation.name,
      })).unwrap();

      setShowAddModal(false);
      setSelectedProduct(null);
      setQuantity('');
      Alert.alert('Succès', 'Produit ajouté à l\'inventaire');
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

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => {
        setSelectedProduct(item);
        setShowAddModal(true);
      }}
    >
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productInfo}>
          <Text style={styles.productCode}>{item.default_code}</Text>
          <Text style={styles.productQty}>{item.qty_available} {item.uom_name}</Text>
        </View>
      </View>
      {item.barcode && (
        <Text style={styles.productBarcode}>Code-barres: {item.barcode}</Text>
      )}
    </TouchableOpacity>
  );

  const renderInventoryLine = ({ item }: { item: InventoryLine }) => (
    <View style={styles.inventoryLine}>
      <View style={styles.inventoryHeader}>
        <Text style={styles.inventoryProductName}>{item.product_name}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => item.id && handleRemoveFromInventory(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
      <View style={styles.inventoryDetails}>
        <Text style={styles.inventoryQty}>
          Théorique: {item.theoretical_qty} | Réel: {item.product_qty}
        </Text>
        <Text style={[
          styles.inventoryDiff,
          { color: item.difference_qty >= 0 ? '#10B981' : '#DC2626' }
        ]}>
          Écart: {item.difference_qty > 0 ? '+' : ''}{item.difference_qty}
        </Text>
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.notAuthenticatedText}>
          Veuillez vous connecter pour accéder à l'inventaire
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventaire</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocationModal(true)}
        >
          <Ionicons name="location-outline" size={16} color="#3B82F6" />
          <Text style={styles.locationText}>
            {currentLocation?.name || 'Sélectionner un emplacement'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Produits disponibles</Text>
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.id.toString()}
          style={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lignes d'inventaire ({inventoryLines.length})</Text>
        <FlatList
          data={inventoryLines}
          renderItem={renderInventoryLine}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          style={styles.inventoryList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter au inventaire</Text>
            
            {selectedProduct && (
              <>
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                <Text style={styles.modalProductInfo}>
                  Stock actuel: {selectedProduct.qty_available} {selectedProduct.uom_name}
                </Text>
                
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Quantité réelle:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalAddButton}
                    onPress={handleAddToInventory}
                  >
                    <Text style={styles.modalAddText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner un emplacement</Text>
            
            <FlatList
              data={locations}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    currentLocation?.id === item.id && styles.selectedLocationItem
                  ]}
                  onPress={() => {
                    dispatch(setCurrentLocation(item));
                    setShowLocationModal(false);
                  }}
                >
                  <Text style={[
                    styles.locationItemText,
                    currentLocation?.id === item.id && styles.selectedLocationText
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id.toString()}
            />

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 4,
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  productList: {
    maxHeight: 200,
  },
  productItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  productInfo: {
    alignItems: 'flex-end',
  },
  productCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  productQty: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  productBarcode: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  inventoryList: {
    flex: 1,
  },
  inventoryLine: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryProductName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  removeButton: {
    padding: 4,
  },
  inventoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inventoryQty: {
    fontSize: 14,
    color: '#6B7280',
  },
  inventoryDiff: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalProductInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInputContainer: {
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
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  notAuthenticatedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 100,
  },
  locationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedLocationItem: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  locationItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedLocationText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});