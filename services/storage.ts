import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SESSION_COOKIE: 'odoo_session_cookie',
  USER_CONFIG: 'odoo_user_config',
  SESSION_ID: 'odoo_session_id',
  UID: 'odoo_uid',
} as const;

class StorageService {
  async setSessionCookie(cookie: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COOKIE, cookie);
    } catch (error) {
      console.error('Error storing session cookie:', error);
    }
  }

  async getSessionCookie(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COOKIE);
    } catch (error) {
      console.error('Error retrieving session cookie:', error);
      return null;
    }
  }

  async setUserConfig(config: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error storing user config:', error);
    }
  }

  async getUserConfig(): Promise<any | null> {
    try {
      const config = await AsyncStorage.getItem(STORAGE_KEYS.USER_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('Error retrieving user config:', error);
      return null;
    }
  }

  async setSessionId(sessionId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    } catch (error) {
      console.error('Error storing session ID:', error);
    }
  }

  async getSessionId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.error('Error retrieving session ID:', error);
      return null;
    }
  }

  async setUid(uid: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UID, uid.toString());
    } catch (error) {
      console.error('Error storing UID:', error);
    }
  }

  async getUid(): Promise<number | null> {
    try {
      const uid = await AsyncStorage.getItem(STORAGE_KEYS.UID);
      return uid ? parseInt(uid, 10) : null;
    } catch (error) {
      console.error('Error retrieving UID:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SESSION_COOKIE,
        STORAGE_KEYS.SESSION_ID,
        STORAGE_KEYS.UID,
      ]);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  }
}

export const storageService = new StorageService();
