/**
 * BMS Integration Module - Core Types
 * 
 * Vendor-agnostic types for BMS/EMS integration.
 * All protocol-specific details are abstracted away.
 * 
 * @see EVERWATT_AI_CORE_VISION.md - Must remain vendor-agnostic
 */

/**
 * Data quality indicator
 */
export type DataQuality = 'good' | 'bad' | 'uncertain' | 'not-available';

/**
 * Supported protocols
 */
export type Protocol = 'bacnet' | 'modbus' | 'rest' | 'opcua';

/**
 * Unified data point - vendor-agnostic representation
 * 
 * This is the ONLY data format the rest of EverWatt.AI should use.
 * Protocol-specific formats are converted to this.
 */
export interface UnifiedDataPoint {
  /** Unique identifier for this point */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Current value */
  value: number | boolean | string;
  
  /** Unit of measurement */
  unit: string; // '°F', 'kW', 'cfm', '%', 'on/off', etc.
  
  /** Timestamp of the reading */
  timestamp: Date;
  
  /** Data quality indicator */
  quality: DataQuality;
  
  /** Optional metadata for context */
  metadata?: {
    building?: string;
    system?: string; // 'HVAC', 'Lighting', 'Battery', etc.
    equipment?: string; // Asset ID from audit module
    location?: string;
    description?: string;
  };
  
  /** Protocol-specific reference (for internal use) */
  _ref?: DataPointReference;
}

/**
 * Data point reference - how to access a point in a specific protocol
 * 
 * This is stored internally to map unified points back to protocol-specific addresses.
 */
export interface DataPointReference {
  /** Protocol used */
  protocol: Protocol;
  
  /** Connection ID (which BMS) */
  connectionId: string;
  
  /** Protocol-specific point identifier */
  pointId: string;
  
  /** Protocol-specific metadata (stored by adapter) */
  protocolData?: Record<string, any>;
}

/**
 * Command to write a value to a point
 */
export interface WriteCommand {
  /** Point to write to */
  point: DataPointReference;
  
  /** Value to write */
  value: number | boolean | string;
  
  /** Optional timestamp (defaults to now) */
  timestamp?: Date;
  
  /** Reason for change (for audit trail) */
  reason?: string;
  
  /** User/process that initiated the change */
  initiatedBy?: string;
  
  /** Safety constraints to check before writing */
  constraints?: {
    min?: number;
    max?: number;
    allowedValues?: (number | boolean | string)[];
  };
}

/**
 * Subscription for real-time updates
 */
export interface Subscription {
  /** Unique subscription ID */
  id: string;
  
  /** Points to subscribe to */
  points: DataPointReference[];
  
  /** Callback when data updates */
  callback: (data: UnifiedDataPoint[]) => void;
  
  /** Polling interval in milliseconds (if polling) */
  interval?: number;
  
  /** Whether to use push notifications (if protocol supports) */
  usePush?: boolean;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connectionId: string;
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  errorCount: number;
  protocol: Protocol;
}

/**
 * Connection configuration
 */
export interface BMSConnection {
  /** Unique connection ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Protocol to use */
  protocol: Protocol;
  
  /** Protocol-specific configuration */
  config: BACnetConfig | ModbusConfig | RESTConfig | OPCUAConfig;
  
  /** Whether connection is enabled */
  enabled: boolean;
  
  /** Last successful connection */
  lastConnected?: Date;
  
  /** Metadata */
  metadata?: {
    building?: string;
    description?: string;
  };
}

/**
 * BACnet connection configuration
 */
export interface BACnetConfig {
  /** BACnet device ID */
  deviceId: number;
  
  /** IP address */
  address: string;
  
  /** Port (default 47808) */
  port?: number;
  
  /** Network number (optional) */
  networkNumber?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Modbus connection configuration
 */
export interface ModbusConfig {
  /** Connection type */
  type: 'tcp' | 'rtu';
  
  /** IP address (TCP) or serial port path (RTU) */
  address: string;
  
  /** TCP port (default 502) */
  port?: number;
  
  /** Modbus unit ID */
  unitId: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Serial port settings (for RTU) */
  serialConfig?: {
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
  };
}

/**
 * REST API connection configuration
 */
export interface RESTConfig {
  /** Base URL */
  baseUrl: string;
  
  /** Adapter type (determines API format) */
  adapter: 'ignition' | 'niagara' | 'generic';
  
  /** API key (if required) */
  apiKey?: string;
  
  /** Authentication */
  auth?: {
    type: 'basic' | 'bearer' | 'oauth2';
    credentials: {
      username?: string;
      password?: string;
      token?: string;
      clientId?: string;
      clientSecret?: string;
    };
  };
  
  /** Request timeout */
  timeout?: number;
}

/**
 * OPC-UA connection configuration (future)
 */
export interface OPCUAConfig {
  endpointUrl: string;
  securityMode?: string;
  securityPolicy?: string;
  username?: string;
  password?: string;
}

/**
 * Discovery filter for finding points
 */
export interface DiscoveryFilter {
  /** Filter by object type (protocol-specific) */
  objectType?: string;
  
  /** Filter by name pattern */
  namePattern?: string;
  
  /** Filter by system */
  system?: string;
  
  /** Limit number of results */
  limit?: number;
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  connectionId: string;
  points: UnifiedDataPoint[];
  totalFound: number;
  duration: number; // milliseconds
}

/**
 * Error types
 */
export class BMSIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public connectionId?: string,
    public pointId?: string
  ) {
    super(message);
    this.name = 'BMSIntegrationError';
  }
}

export class ConnectionError extends BMSIntegrationError {
  constructor(message: string, connectionId: string) {
    super(message, 'CONNECTION_ERROR', connectionId);
    this.name = 'ConnectionError';
  }
}

export class ReadError extends BMSIntegrationError {
  constructor(message: string, connectionId: string, pointId: string) {
    super(message, 'READ_ERROR', connectionId, pointId);
    this.name = 'ReadError';
  }
}

export class WriteError extends BMSIntegrationError {
  constructor(message: string, connectionId: string, pointId: string) {
    super(message, 'WRITE_ERROR', connectionId, pointId);
    this.name = 'WriteError';
  }
}

export class ValidationError extends BMSIntegrationError {
  constructor(message: string, connectionId?: string, pointId?: string) {
    super(message, 'VALIDATION_ERROR', connectionId, pointId);
    this.name = 'ValidationError';
  }
}

