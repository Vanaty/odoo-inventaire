import { odooService } from '@/services/odoo';
import { AuthState, OdooConfig } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  config: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (config: OdooConfig, { rejectWithValue }) => {
    try {
      const user = await odooService.authenticate(config);
      return { user, config };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de connexion');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    // Clear any stored credentials
    return;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.config = action.payload.config;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.config = null;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.config = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;