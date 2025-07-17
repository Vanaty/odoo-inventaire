import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector as useSelector } from '@/hooks/useAppSelector';
import {
  addInventoryLine,
  loadLocations,
  searchProducts,
  setCurrentLocation
} from '@/store/inventorySlice';
import { Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


// Memoized ProductItem component
const ProductItem = memo(({ item, onPress }: { item: Product; onPress: (product: Product) => void }) => (
  <TouchableOpacity
    style={styles.productCard}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={styles.productCardContent}>
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.productDetails}>
          <View style={styles.productCodeContainer}>
            <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
            <Text style={styles.productCode}>{item.default_code || 'N/A'}</Text>
          </View>
          <View style={styles.productQtyContainer}>
            <Ionicons name="layers-outline" size={14} color="#10B981" />
            <Text style={styles.productQty}>{item.qty_available} {item.uom_name}</Text>
          </View>
        </View>
        {item.barcode && (
          <View style={styles.barcodeContainer}>
            <Ionicons name="barcode-outline" size={12} color="#9CA3AF" />
            <Text style={styles.productBarcode}>{item.barcode}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
      </View>
    </View>
  </TouchableOpacity>
));

export default function InventoryScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const dispatch = useAppDispatch();
  const { products, currentLocation, loading, error } = useSelector(state => state.inventory);
  const { isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(searchProducts(''));
      loadLocationData();
    }
  }, [isAuthenticated]);

  // Auto-load products on app start
  useEffect(() => {
    const autoLoadProducts = async () => {
      if (isAuthenticated) {
        try {
          await dispatch(searchProducts('')).unwrap();
        } catch (error) {
          console.log('Auto-load products failed:', error);
        }
      }
    };

    autoLoadProducts();
  }, [dispatch, isAuthenticated]);

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

  const handleProductPress = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowAddModal(true);
  }, []);

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductItem item={item} onPress={handleProductPress} />
  ), [handleProductPress]);

  const keyExtractor = useCallback((item: Product) => item.id.toString(), []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 116,
    offset: 128 * index,
    index,
  }), []);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Connexion requise</Text>
          <Text style={styles.emptyStateText}>
            Veuillez vous connecter pour accéder à l'inventaire
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>📦 Inventaire</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons name="location" size={16} color="#3B82F6" />
            <Text style={styles.locationText}>
              {currentLocation?.name || 'Sélectionner'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>
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
            placeholderTextColor="#9CA3AF"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛍️ Catalogue de produits</Text>
            <View style={styles.productCount}>
              <Text style={styles.productCountText}>{products.length}</Text>
            </View>
          </View>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <Ionicons name="refresh" size={24} color="#3B82F6" />
              <Text style={styles.loadingText}>Chargement des produits...</Text>
            </View>
          )}

          {!loading && products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucun produit trouvé</Text>
              <Text style={styles.emptySubtext}>Essayez de modifier votre recherche</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              style={styles.productList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productListContent}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              numColumns={1}
              refreshing={loading}
              onRefresh={() => dispatch(searchProducts(searchTerm))}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={21}
              initialNumToRender={10}
              updateCellsBatchingPeriod={50}
            />
          )}
        </View>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Ajouter à l'inventaire</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {selectedProduct && (
              <>
                <View style={styles.modalProductContainer}>
                  {selectedProduct.image_url ? (
                    <Image
                      source={{ uri: selectedProduct.image_url }}
                      style={styles.modalProductImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.modalProductImagePlaceholder}>
                      <Ionicons name="cube-outline" size={40} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.modalProductDetails}>
                    <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                    <View style={styles.modalProductMeta}>
                      <Text style={styles.modalProductInfo}>
                        📦 Stock: {selectedProduct.qty_available} {selectedProduct.uom_name}
                      </Text>
                      {selectedProduct.default_code && (
                        <Text style={styles.modalProductInfo}>
                          🏷️ Code: {selectedProduct.default_code}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Quantité comptée</Text>
                  <View style={styles.modalInputWrapper}>
                    <TextInput
                      style={styles.modalInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.modalInputUnit}>{selectedProduct.uom_name}</Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalAddButton, !quantity && styles.modalButtonDisabled]}
                    onPress={handleAddToInventory}
                    disabled={!quantity}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Sélectionner un emplacement</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
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
                  <View style={styles.locationItemContent}>
                    <Text style={[
                      styles.locationItemText,
                      currentLocation?.id === item.id && styles.selectedLocationText
                    ]}>
                      {item.name}
                    </Text>
                    {currentLocation?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
            />
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationText: {
    marginHorizontal: 6,
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#1E293B',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    flex: 1,
    marginVertical: 12,
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
  productCount: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  productCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  productList: {
    flex: 1,
  },
  productListContent: {
    paddingBottom: 20,
  },
  productCard: {
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
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCode: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  productQtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productQty: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productBarcode: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  addButton: {
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#64748B',
  },
  quickActionsContainer: {
    paddingVertical: 20,
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  itemSeparator: {
    height: 12,
  },
  emptyState: {
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
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyProducts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  modalProductImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProductDetails: {
    flex: 1,
    marginLeft: 16,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalProductMeta: {
    gap: 4,
  },
  modalProductInfo: {
    fontSize: 14,
    color: '#64748B',
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  modalInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'center',
  },
  modalInputUnit: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedLocationItem: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationItemText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  selectedLocationText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});