import { odooService } from '@/services/odoo';
import { storageService } from '@/services/storage';
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

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const isRestored = await odooService.initializeFromStorage();
      if (!isRestored) {
        throw new Error('No session to restore');
      }

      const config = await storageService.getUserConfig();
      if (!config) {
        throw new Error('No config found');
      }

      // Verify session is still valid by making a test call
      const userInfo = await odooService.jsonRpcCall('/web/dataset/call_kw', {
        model: 'res.users',
        method: 'read',
        args: [[await storageService.getUid()], ['name', 'login', 'email', 'company_id']],
        kwargs: {}
      });

      if (!userInfo || userInfo.length === 0) {
        throw new Error('Session expired');
      }

      const user = userInfo[0];
      return {
        user: {
          id: user.id,
          name: user.name,
          login: user.login,
          email: user.email,
          company_id: user.company_id[0],
          company_name: user.company_id[1]
        },
        config
      };
    } catch (error: any) {
      await odooService.clearSession();
      return rejectWithValue(error.message || 'Failed to restore session');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await odooService.logout();
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
      // Restore session
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.config = action.payload.config;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.loading = false;
        state.error = null; // Don't show error for failed session restore
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