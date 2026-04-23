// Alpaca Markets API v2 Client for CYRUS Trading Module

interface AlpacaConfig {
  apiKey: string;
  secretKey: string;
  paper: boolean;
}

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  crypto_status: string;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
}

interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

interface AlpacaQuote {
  ap: number;
  as: number;
  bp: number;
  bs: number;
  t: string;
}

interface AlpacaTrade {
  t: string;
  x: string;
  p: number;
  s: number;
  c: string[];
  i: number;
  z: string;
}

export class AlpacaClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private dataUrl: string;

  constructor(config: AlpacaConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    
    if (config.paper) {
      this.baseUrl = 'https://paper-api.alpaca.markets';
    } else {
      this.baseUrl = 'https://api.alpaca.markets';
    }
    this.dataUrl = 'https://data.alpaca.markets';
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, useDataUrl: boolean = false): Promise<T> {
    const baseUrl = useDataUrl ? this.dataUrl : this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as Record<string, string>)
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(`Alpaca API Error: ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Account Endpoints
  async getAccount(): Promise<AlpacaAccount> {
    return this.request('/v2/account');
  }

  // Position Endpoints
  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request('/v2/positions');
  }

  async getPosition(symbol: string): Promise<AlpacaPosition> {
    return this.request(`/v2/positions/${symbol}`);
  }

  async closePosition(symbol: string, qty?: number, percentage?: number): Promise<AlpacaOrder> {
    const params = new URLSearchParams();
    if (qty) params.append('qty', qty.toString());
    if (percentage) params.append('percentage', percentage.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/v2/positions/${symbol}${query}`, { method: 'DELETE' });
  }

  async closeAllPositions(cancel_orders: boolean = true): Promise<AlpacaOrder[]> {
    return this.request(`/v2/positions?cancel_orders=${cancel_orders}`, { method: 'DELETE' });
  }

  // Order Endpoints
  async getOrders(options: { status?: string; limit?: number; after?: string; until?: string; direction?: string } = {}): Promise<AlpacaOrder[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.after) params.append('after', options.after);
    if (options.until) params.append('until', options.until);
    if (options.direction) params.append('direction', options.direction);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/v2/orders${query}`);
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    return this.request(`/v2/orders/${orderId}`);
  }

  async createOrder(order: {
    symbol: string;
    qty?: number;
    notional?: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    trail_price?: number;
    trail_percent?: number;
    extended_hours?: boolean;
    client_order_id?: string;
    order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
    take_profit?: { limit_price: number };
    stop_loss?: { stop_price: number; limit_price?: number };
  }): Promise<AlpacaOrder> {
    return this.request('/v2/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/v2/orders/${orderId}`, { method: 'DELETE' });
  }

  async cancelAllOrders(): Promise<{ id: string; status: number; body: any }[]> {
    return this.request('/v2/orders', { method: 'DELETE' });
  }

  // Market Data - Stocks
  async getStockBars(symbol: string, options: { timeframe?: string; start?: string; end?: string; limit?: number } = {}): Promise<{ bars: { [symbol: string]: AlpacaBar[] } }> {
    const params = new URLSearchParams();
    params.append('symbols', symbol);
    params.append('timeframe', options.timeframe || '1Hour');
    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.limit) params.append('limit', options.limit.toString());
    
    return this.request(`/v2/stocks/bars?${params.toString()}`, {}, true);
  }

  async getStockQuotes(symbols: string[]): Promise<{ quotes: { [symbol: string]: AlpacaQuote } }> {
    const params = new URLSearchParams();
    params.append('symbols', symbols.join(','));
    
    return this.request(`/v2/stocks/quotes/latest?${params.toString()}`, {}, true);
  }

  async getStockTrades(symbol: string, options: { start?: string; end?: string; limit?: number } = {}): Promise<{ trades: { [symbol: string]: AlpacaTrade[] } }> {
    const params = new URLSearchParams();
    params.append('symbols', symbol);
    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.limit) params.append('limit', options.limit.toString());
    
    return this.request(`/v2/stocks/trades?${params.toString()}`, {}, true);
  }

  // Market Data - Crypto
  async getCryptoBars(symbol: string, options: { timeframe?: string; start?: string; end?: string; limit?: number } = {}): Promise<{ bars: { [symbol: string]: AlpacaBar[] } }> {
    const params = new URLSearchParams();
    params.append('symbols', symbol);
    params.append('timeframe', options.timeframe || '1Hour');
    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.limit) params.append('limit', options.limit.toString());
    
    return this.request(`/v1beta3/crypto/us/bars?${params.toString()}`, {}, true);
  }

  async getCryptoQuotes(symbols: string[]): Promise<{ quotes: { [symbol: string]: AlpacaQuote } }> {
    const params = new URLSearchParams();
    params.append('symbols', symbols.join(','));
    
    return this.request(`/v1beta3/crypto/us/latest/quotes?${params.toString()}`, {}, true);
  }

  // Assets
  async getAssets(options: { status?: string; asset_class?: string } = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.asset_class) params.append('asset_class', options.asset_class);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/v2/assets${query}`);
  }

  async getAsset(symbol: string): Promise<any> {
    return this.request(`/v2/assets/${symbol}`);
  }

  // Utility Methods
  signalToOrder(signal: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Parameters<AlpacaClient['createOrder']>[0] {
    const order: Parameters<AlpacaClient['createOrder']>[0] = {
      symbol: signal.symbol,
      qty: signal.quantity,
      side: signal.action,
      type: 'market',
      time_in_force: 'gtc'
    };

    if (signal.stopLoss && signal.takeProfit) {
      order.order_class = 'bracket';
      order.take_profit = { limit_price: signal.takeProfit };
      order.stop_loss = { stop_price: signal.stopLoss };
    }

    return order;
  }
}

// Factory function to create Alpaca client
export function createAlpacaClient(): AlpacaClient | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = (process.env.ALPACA_ENVIRONMENT || 'paper') === 'paper';

  if (!apiKey || !secretKey) {
    console.warn('[Alpaca] Missing API credentials. Set ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables.');
    return null;
  }

  return new AlpacaClient({
    apiKey,
    secretKey,
    paper
  });
}

export type { AlpacaConfig, AlpacaAccount, AlpacaPosition, AlpacaOrder, AlpacaBar, AlpacaQuote };
