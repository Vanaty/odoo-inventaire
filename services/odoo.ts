import { InventoryLine, OdooConfig, Product, User } from '@/types';
import { storageService } from './storage';

class OdooService {
  private config: OdooConfig | null = null;
  private uid: number | null = null;
  private sessionId: string | null = null;
  private sessionCookie: string | null = null;

  async initializeFromStorage(): Promise<boolean> {
    try {
      const [storedUid, storedSessionId, storedCookie, storedConfig] = await Promise.all([
        storageService.getUid(),
        storageService.getSessionId(),
        storageService.getSessionCookie(),
        storageService.getUserConfig(),
      ]);

      if (storedUid && storedCookie && storedConfig) {
        this.uid = storedUid;
        this.sessionId = storedSessionId;
        this.sessionCookie = storedCookie;
        this.config = storedConfig;
        if (this.config) {
          this.authenticate(this.config);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing from storage:', error);
      return false;
    }
  }

  setConfig(config: OdooConfig) {
    this.config = config;
  }

  async getDatabase(): Promise<string | null> {
    const database = await this.xmlRpcCall('/xmlrpc/db', 'list', []);
    return database
  }

  async authenticate(config: OdooConfig): Promise<User> {
    this.config = config;
    
    try {
      // Authenticate via JSON-RPC
      const authResponse = await this.jsonRpcCall('/web/session/authenticate', {
        'db': config.database,
        'login': config.username,
        'password': config.password,
      });

      // Extract uid and session info from auth response
      if (authResponse && authResponse.uid) {
        this.uid = authResponse.uid;
        this.sessionId = authResponse.session_id;
        
        // Store session data
        await Promise.all([
          storageService.setUid(this.uid? this.uid : 0),
          storageService.setSessionId(this.sessionId || ''),
          storageService.setUserConfig(config),
        ]);
      } else {
        throw new Error('Échec de l\'authentification');
      }

      // Get user info via JSON-RPC
      const userInfo = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'res.users',
        method: 'read',
        args: [[this.uid], ['name', 'login', 'email', 'company_id']],
        kwargs: {}
      });

      if (!userInfo || userInfo.length === 0) {
        throw new Error('Impossible de récupérer les informations utilisateur');
      }

      const user = userInfo[0];
      return {
        id: user.id,
        name: user.name,
        login: user.login,
        email: user.email,
        company_id: user.company_id[0],
        company_name: user.company_id[1]
      };
    } catch (error) {
      console.error('Authentication error:', error);
      await this.clearSession();
      throw error;
    }
  }

  async jsonRpcCall(endpoint: string, params: any): Promise<any> {
    if (!this.config) {
      throw new Error('Configuration Odoo non définie');
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);


    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add session cookie if available
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }
    let response: Response;
    try {
      response = await fetch(`${this.config.url}${endpoint}`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: params,
          id: Date.now(),
        }),
      });
      clearTimeout(id);
    } catch (error) {
      console.error('Network error:', error);
      throw new Error('Network error, please check your connection or Odoo server status');
    }

    // Extract and store cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.sessionCookie = setCookieHeader;
      await storageService.setSessionCookie(setCookieHeader);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      if (data.error.data && data.error.data.message && data.error.data.message.includes('Session expired')) {
        await this.clearSession();
        throw new Error('Session expired, please log in again');
      }
      throw new Error(JSON.stringify(data) || 'Erreur JSON-RPC');
    }

    return data.result;
  }

  async clearSession(): Promise<void> {
    this.uid = null;
    this.sessionId = null;
    this.sessionCookie = null;
    await storageService.clearSession();
  }

  async logout(): Promise<void> {
    try {
      if (this.config) {
        await this.jsonRpcCall('/web/session/destroy', {});
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await this.clearSession();
    }
  }

  // XML-RPC calls for authentication
  async xmlRpcCall(endpoint: string, method: string, params: any[]): Promise<any> {
    if (!this.config) {
      throw new Error('Configuration Odoo non définie');
    }

    const xmlBody = this.buildXmlRpcRequest(method, params);
    
    const response = await fetch(`${this.config.url}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: xmlBody,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    return this.parseXmlRpcResponse(xmlText);
  }

  private buildXmlRpcRequest(method: string, params: any[]): string {
    const paramXml = params.map(param => {
      if (typeof param === 'string') {
        return `<param><value><string>${param}</string></value></param>`;
      } else if (typeof param === 'number') {
        return `<param><value><int>${param}</int></value></param>`;
      } else if (typeof param === 'object') {
        return `<param><value><struct>${this.objectToXmlStruct(param)}</struct></value></param>`;
      }
      return `<param><value><string>${param}</string></value></param>`;
    }).join('');

    return `<?xml version="1.0"?>
    <methodCall>
      <methodName>${method}</methodName>
      <params>${paramXml}</params>
    </methodCall>`;
  }

  private objectToXmlStruct(obj: any): string {
    return Object.keys(obj).map(key => {
      const value = obj[key];
      let valueXml = '';
      
      if (typeof value === 'string') {
        valueXml = `<string>${value}</string>`;
      } else if (typeof value === 'number') {
        valueXml = `<int>${value}</int>`;
      } else {
        valueXml = `<string>${value}</string>`;
      }
      
      return `<member><name>${key}</name><value>${valueXml}</value></member>`;
    }).join('');
  }

  private parseXmlRpcResponse(xmlText: string): any {
    // Simple regex-based XML parsing for methodResponse
    const faultMatch = xmlText.match(/<fault>/);
    if (faultMatch) {
      throw new Error('XML-RPC Fault');
    }

    // Handle array responses for database list
    const arrayMatch = xmlText.match(/<array><data>(.*?)<\/data><\/array>/);
    if (arrayMatch) {
      const valueMatches = arrayMatch[1].match(/<value><string>(.*?)<\/string><\/value>/g);
      if (valueMatches && valueMatches.length > 0) {
        return valueMatches.map(match => match.replace(/<value><string>(.*?)<\/string><\/value>/, '$1'));
      }
      return [];
    }

    const intMatch = xmlText.match(/<int>(\d+)<\/int>/);
    if (intMatch) {
      return parseInt(intMatch[1], 10);
    }

    const stringMatch = xmlText.match(/<string>(.*?)<\/string>/);
    if (stringMatch) {
      return stringMatch[1];
    }

    return null;
  }

  // Product operations
  async searchProducts(domain: any[] = []): Promise<Product[]> {
    try {
      const productIds = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'product.product',
        method: 'search',
        args: [domain],
        kwargs: { limit: 100 }
      });

      if (productIds.length === 0) {
        return [];
      }

      const products = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'product.product',
        method: 'read',
        args: [productIds, ['name', 'default_code', 'barcode', 'qty_available', 'uom_id', 'categ_id', 'image_1920']],
        kwargs: {}
      });

      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        default_code: product.default_code || '',
        barcode: product.barcode || '',
        qty_available: product.qty_available || 0,
        uom_name: product.uom_id ? product.uom_id[1] : 'Unit',
        categ_id: product.categ_id ? product.categ_id[0] : 0,
        categ_name: product.categ_id ? product.categ_id[1] : 'No Category',
        image_url: product.image_1920 ? `data:image/png;base64,${product.image_1920}` : undefined
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  async searchProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const products = await this.searchProducts([['barcode', '=', barcode]]);
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.error('Error searching product by barcode:', error);
      throw error;
    }
  }

  // Inventory operations
  
  async createInventoryLine(inventoryLine: Omit<InventoryLine, 'id'>): Promise<InventoryLine> {
    try {
      // Search for existing quant
      const quantIds = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'search',
        args: [[
          ['product_id', '=', inventoryLine.product_id],
          ['location_id', '=', inventoryLine.location_id]
        ]],
        kwargs: { limit: 1 }
      });
      console.log('Quant IDs found:', quantIds);
      let quantId;
      if (quantIds.length > 0) {
        // Update existing quant
        quantId = quantIds[0];
        await this.jsonRpcCall('/web/dataset/call_kw', {
          model: 'stock.quant',
          method: 'write',
          args: [[quantId], {
            quantity: inventoryLine.theoretical_qty,
            inventory_quantity: inventoryLine.product_qty
          }],
          kwargs: {}
        });
      } else {
        // Create new quant
        quantId = await this.jsonRpcCall('/web/dataset/call_kw', {
          model: 'stock.quant',
          method: 'create',
          args: [{
            product_id: inventoryLine.product_id,
            location_id: inventoryLine.location_id,
            quantity: 0,
            inventory_quantity: inventoryLine.product_qty,
          }],
          kwargs: {
          }
        });
      }

      return {
        ...inventoryLine,
        id: quantId
      };
    } catch (error) {
      console.error('Error creating inventory line:', error);
      throw error;
    }
  }

  async getInventoryLines(locationId: number): Promise<InventoryLine[]> {
    try {
      const quantIds = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'search',
        args: [[['location_id', '=', locationId], ["inventory_quantity_set", "=", true]]],
        kwargs: { limit: 100 }
      });

      if (quantIds.length === 0) {
        return [];
      }

      const quants = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'read',
        args: [quantIds, ['product_id', 'quantity', 'inventory_diff_quantity','inventory_quantity', 'location_id']],
        kwargs: {}
      });

      // Get product details for each quant
      const productIds = quants.map((quant: any) => quant.product_id[0]);
      const products = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'product.product',
        method: 'read',
        args: [productIds, ['name', 'barcode']],
        kwargs: {}
      });

      // Get location details
      const locationData = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.location',
        method: 'read',
        args: [[locationId], ['name']],
        kwargs: {}
      });

      const locationName = locationData.length > 0 ? locationData[0].name : 'Unknown Location';

      // Combine data
      return quants.map((quant: any) => {
        const product = products.find((p: any) => p.id === quant.product_id[0]);
        const productQty = quant.inventory_quantity || 0;
        const theoreticalQty = quant.quantity || 0;
        const diffQty = quant.inventory_diff_quantity || 0;
        
        return {
          id: quant.id,
          product_id: quant.product_id[0],
          product_name: quant.product_id[1],
          product_barcode: product?.barcode || '',
          product_qty: productQty,
          theoretical_qty: theoreticalQty,
          difference_qty: diffQty,
          location_id: locationId,
          location_name: locationName
        };
      });
    } catch (error) {
      console.error('Error getting inventory lines:', error);
      throw error;
    }
  }

  async updateInventoryLine(id: number, updates: Partial<InventoryLine>): Promise<void> {
    try {
      const quantUpdates: any = {};
      
      if (updates.product_qty !== undefined) {
        quantUpdates.quantity = updates.theoretical_qty;
        quantUpdates.inventory_quantity = updates.product_qty;
      }

      if (Object.keys(quantUpdates).length > 0) {
        await this.jsonRpcCall('/web/dataset/call_kw', {
          model: 'stock.quant',
          method: 'write',
          args: [[id], quantUpdates],
          kwargs: {}
        });
      }
    } catch (error) {
      console.error('Error updating inventory line:', error);
      throw error;
    }
  }

  async deleteInventoryLine(id: number): Promise<void> {
    try {
      // Set inventory_quantity to 0 uniquement
      await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'write',
        args: [[id], { inventory_quantity: 0,inventory_quantity_set: false }],
        kwargs: {}
      });
    } catch (error) {
      console.error('Error deleting inventory line:', error);
      throw error;
    }
  }

  async fixInventoryConflict(IDsQuant: number[]): Promise<void> {
    try {
      if (IDsQuant.length === 0) return;
      const data = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'read',
        args: [IDsQuant,["inventory_quantity","quantity","inventory_diff_quantity"]],
        kwargs: {}
      });
      data.forEach((quant: any) => {
        this.updateInventoryLine(quant.id, {
          product_qty: quant.quantity + quant.inventory_diff_quantity,
          theoretical_qty: quant.quantity
        })
      });
    } catch (error) {
      console.error('Error fixing inventory conflicts:', error);
      throw error;
    }
  }

  async validerInventoryLine(IDs : number[]): Promise<void> {
    try {
      if (IDs.length === 0) return;

      // Call the Odoo method to validate inventory lines
      const data = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.quant',
        method: 'action_apply_inventory',
        args: [IDs],
        kwargs: {}
      });
      if (data && typeof data === 'object' && data.res_model === 'stock.inventory.conflict') {
        const context = data.context || {};
        if (context.default_quant_to_fix_ids && context.default_quant_to_fix_ids.length > 0) {
          await this.fixInventoryConflict(context.default_quant_to_fix_ids);
        }
        return await this.validerInventoryLine(IDs);
      }
    } catch (error) {
      console.error('Error validating inventory lines:', error);
      throw error;
    }
  }

  async createInventoryName(name: string, quant_ids: number[]): Promise<number> {
    try {
      const inventoryId = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.inventory.adjustment.name',
        method: 'create',
        args: [{
          inventory_adjustment_name: name,
          show_info: true,
          quant_ids: quant_ids,
        }],
        kwargs: {}
      });
      return inventoryId;
    } catch (error) {
      console.error('Error creating inventory name:', error);
      throw error;
    }
  }

  async validateAllInventory(name: string, quant_ids: number[]): Promise<void> {
    try {
      const inventoryId = await this.createInventoryName(name, quant_ids);
      if (inventoryId) {
        const response = await this.jsonRpcCall('/web/dataset/call_kw', {
          model: 'stock.inventory.adjustment.name',
          method: 'action_apply',
          args: [inventoryId],
          kwargs: {}
        });
        if (response && response.res_model === 'stock.inventory.conflict') {
          const context = response.context || {};
          if (context.default_quant_to_fix_ids && context.default_quant_to_fix_ids.length > 0) {
            await this.fixInventoryConflict(context.default_quant_to_fix_ids);
          }
          return await this.validateAllInventory(name, quant_ids);
        }
      } else {
        throw new Error('Failed to create inventory name');
      }
    } catch (error) {
      console.error('Error validating all inventory:', error);
      throw error;
    }
  }

  async getLocations(): Promise<Array<{ id: number; name: string }>> {
    try {
      const locationIds = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.location',
        method: 'search',
        args: [[['usage', '=', 'internal']]],
        kwargs: { limit: 50 }
      });

      const locations = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.location',
        method: 'read',
        args: [locationIds, ['name']],
        kwargs: {}
      });

      return locations.map((loc: any) => ({
        id: loc.id,
        name: loc.name
      }));
    } catch (error) {
      console.error('Error getting locations:', error);
      throw error;
    }
  }
}

export const odooService = new OdooService();