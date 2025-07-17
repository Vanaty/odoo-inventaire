export interface User {
  id: number;
  name: string;
  login: string;
  email: string;
  company_id: number;
  company_name: string;
}

export interface Product {
  id: number;
  name: string;
  default_code: string;
  barcode: string;
  qty_available: number;
  uom_name: string;
  categ_id: number;
  categ_name: string;
  image_url?: string;
}

export interface InventoryLine {
  id?: number;
  product_id: number;
  product_name: string;
  product_barcode: string;
  theoretical_qty: number;
  product_qty: number;
  difference_qty: number;
  location_id: number;
  location_name: string;
}

export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  config: OdooConfig | null;
}

export interface InventoryState {
  products: Product[];
  inventoryLines: InventoryLine[];
  currentLocation: { id: number; name: string } | null;
  loading: boolean;
  error: string | null;
  scanMode: boolean;
}