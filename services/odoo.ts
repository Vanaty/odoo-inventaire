import { InventoryLine, OdooConfig, Product, User } from '@/types';

class OdooService {
  private config: OdooConfig | null = null;
  private uid: number | null = null;
  private sessionId: string | null = null;

  setConfig(config: OdooConfig) {
    this.config = config;
  }

  async authenticate(config: OdooConfig): Promise<User> {
    this.config = config;
    
    try {
      // Authenticate via JSON-RPC
      const authResponse = await this.jsonRpcCall('/web/session/authenticate', {
        'db': config.database,
        'login': config.username,
        'password': config.password,
      })

      // Get user info via JSON-RPC
      const userInfo = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'res.users',
        method: 'read',
        id: this.uid,
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
      throw error;
    }
  }

  async jsonRpcCall(endpoint: string, params: any): Promise<any> {
    if (!this.config) {
      throw new Error('Configuration Odoo non définie');
    }
    const response = await fetch(`${this.config.url}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: params,
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Erreur JSON-RPC');
    }

    return data.result;
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
        args: [productIds, ['name', 'default_code', 'barcode', 'qty_available', 'uom_id', 'categ_id']],
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
        categ_name: product.categ_id ? product.categ_id[1] : 'No Category'
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
      const lineId = await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.inventory.line',
        method: 'create',
        args: [{
          product_id: inventoryLine.product_id,
          theoretical_qty: inventoryLine.theoretical_qty,
          product_qty: inventoryLine.product_qty,
          location_id: inventoryLine.location_id
        }],
        kwargs: {}
      });

      return {
        ...inventoryLine,
        id: lineId
      };
    } catch (error) {
      console.error('Error creating inventory line:', error);
      throw error;
    }
  }

  async updateInventoryLine(id: number, updates: Partial<InventoryLine>): Promise<void> {
    try {
      await this.jsonRpcCall('/web/dataset/call_kw', {
        model: 'stock.inventory.line',
        method: 'write',
        args: [[id], updates],
        kwargs: {}
      });
    } catch (error) {
      console.error('Error updating inventory line:', error);
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