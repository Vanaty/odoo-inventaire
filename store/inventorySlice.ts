import { odooService } from '@/services/odoo';
import { InventoryLine, InventoryState } from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: InventoryState = {
  products: [],
  inventoryLines: [],
  currentLocation: null,
  loading: false,
  error: null,
  scanMode: false,
};

// Async thunks
export const searchProducts = createAsyncThunk(
  'inventory/searchProducts',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const domain = searchTerm 
        ? [['name', 'ilike', searchTerm]]
        : [];
      return await odooService.searchProducts(domain);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de recherche');
    }
  }
);

export const searchProductByBarcode = createAsyncThunk(
  'inventory/searchProductByBarcode',
  async (barcode: string, { rejectWithValue }) => {
    try {
      return await odooService.searchProductByBarcode(barcode);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de scan');
    }
  }
);

export const addInventoryLine = createAsyncThunk(
  'inventory/addInventoryLine',
  async (lineData: Omit<InventoryLine, 'id'>, { rejectWithValue }) => {
    try {
      return await odooService.createInventoryLine(lineData);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur d\'ajout');
    }
  }
);

export const updateInventoryLine = createAsyncThunk(
  'inventory/updateInventoryLine',
  async ({ id, updates }: { id: number; updates: Partial<InventoryLine> }, { rejectWithValue }) => {
    try {
      await odooService.updateInventoryLine(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de mise à jour');
    }
  }
);

export const loadInventoryLines = createAsyncThunk(
  'inventory/loadInventoryLines',
  async (locationId: number, { rejectWithValue }) => {
    try {
      return await odooService.getInventoryLines(locationId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de chargement des lignes d\'inventaire');
    }
  }
);

export const loadLocations = createAsyncThunk(
  'inventory/loadLocations',
  async (_, { rejectWithValue }) => {
    try {
      return await odooService.getLocations();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de chargement des emplacements');
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setScanMode: (state, action: PayloadAction<boolean>) => {
      state.scanMode = action.payload;
    },
    setCurrentLocation: (state, action: PayloadAction<{ id: number; name: string } | null>) => {
      state.currentLocation = action.payload;
    },
    removeInventoryLine: (state, action: PayloadAction<number>) => {
      state.inventoryLines = state.inventoryLines.filter(line => line.id !== action.payload);
    },
    clearInventoryLines: (state) => {
      state.inventoryLines = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Search products
      .addCase(searchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Search product by barcode
      .addCase(searchProductByBarcode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProductByBarcode.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // Add to products if not already present
          const exists = state.products.find(p => p.id === action.payload!.id);
          if (!exists) {
            state.products.unshift(action.payload);
          }
        }
      })
      .addCase(searchProductByBarcode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add inventory line
      .addCase(addInventoryLine.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addInventoryLine.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryLines.push(action.payload);
      })
      .addCase(addInventoryLine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update inventory line
      .addCase(updateInventoryLine.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.inventoryLines.findIndex(line => line.id === id);
        if (index !== -1) {
          state.inventoryLines[index] = { ...state.inventoryLines[index], ...updates };
        }
      })
      .addCase(updateInventoryLine.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Load inventory lines
      .addCase(loadInventoryLines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInventoryLines.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryLines = action.payload;
      })
      .addCase(loadInventoryLines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setScanMode, 
  setCurrentLocation, 
  removeInventoryLine, 
  clearInventoryLines 
} = inventorySlice.actions;
export default inventorySlice.reducer;
