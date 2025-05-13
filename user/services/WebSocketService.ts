import { useRef, useEffect } from 'react';
import { Toast } from 'react-native-toast-notifications';

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private role: string = 'user';

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(userId: string): void {
    this.userId = userId;
    
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URI!);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        
        // Gửi tin nhắn kết nối với ID người dùng
        this.send({
          type: 'userConnect',
          userId: this.userId
        });
        
        // Thông báo tất cả listener rằng kết nối đã được thiết lập
        this.notifyListeners('connection', { connected: true });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Thông báo cho tất cả listener quan tâm đến loại tin nhắn này
          this.notifyListeners(data.type, data);
          
          // Thông báo cho tất cả listener quan tâm đến tất cả tin nhắn
          this.notifyListeners('message', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        this.isConnecting = false;
        
        // Thông báo tất cả listener rằng kết nối đã đóng
        this.notifyListeners('connection', { connected: false });
        
        // Kết nối lại sau 5 giây
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            if (this.userId) {
              this.connect(this.userId);
            }
          }, 5000);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.userId = null;
  }

  public send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }
  }

  public addListener(type: string, callback: Function): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);
    
    // Trả về hàm để gỡ bỏ listener
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  private notifyListeners(type: string, data: any): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for type "${type}":`, error);
        }
      });
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public subscribeToDriverLocation(driverId: string, requestId?: string, rideId?: string): void {
    if (!this.userId || !driverId) return;
    
    this.send({
      type: "subscribeToDriverLocation",
      userId: this.userId,
      driverId: driverId,
      requestId: requestId,
      rideId: rideId
    });
  }

  public sendCancelRide(requestId: string, driverId: string, rideId?: string): void {
    if (!this.userId) return;
    
    this.send({
      type: "cancelRide",
      role: "user",
      userId: this.userId,
      driverId: driverId,
      requestId: requestId,
      rideId: rideId
    });
  }
}

// Hook để sử dụng WebSocketService trong các component React
export const useWebSocket = (userId: string | null) => {
  const service = useRef(WebSocketService.getInstance());

  useEffect(() => {
    if (userId) {
      service.current.connect(userId);
    }
    
    return () => {
      // Chỉ ngắt kết nối khi component unmount nếu cần thiết
      // service.current.disconnect();
    };
  }, [userId]);

  const addListener = (type: string, callback: Function) => {
    return service.current.addListener(type, callback);
  };

  const send = (data: any) => {
    console.log("send", data.type);
    return service.current.send(data);
  };

  const isConnected = () => {
    return service.current.isConnected();
  };

  return {
    addListener,
    send,
    isConnected
  };
};

export default WebSocketService; 