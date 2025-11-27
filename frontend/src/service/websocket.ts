import { LikeUpdateData, NewCommentData, Comment } from '@/types/post';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private postId: string = '';
  private messageCallbacks: ((data: any) => void)[] = [];
  private isConnecting: boolean = false;

  connect(postId: string) {
    if (this.isConnecting && this.postId === postId) {
      return;
    }

    this.postId = postId;
    this.isConnecting = true;

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.postId !== postId) {
      this.disconnect();
    }

    const wsUrl = `ws://localhost:8000/ws/posts/${postId}/`;

    // console.log(`Connecting to WebSocket for post ${postId}:`, wsUrl);
    
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // console.log(`WebSocket connected successfully for post: ${postId}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyMessageCallbacks({
          type: 'connection_established',
          status: 'connected',
          message: 'WebSocket connected successfully',
          post_id: postId
        });
      };

      this.socket.onclose = (event) => {
        // console.log(`WebSocket disconnected for post ${postId}. Code:`, event.code, 'Reason:', event.reason);
        this.isConnecting = false;
        
        this.notifyMessageCallbacks({
          type: 'connection_status',
          status: 'disconnected',
          code: event.code,
          reason: event.reason,
          post_id: postId
        });
        
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        // console.log(`WebSocket error for post ${postId}:`, error);
        this.isConnecting = false;
        
        this.notifyMessageCallbacks({
          type: 'connection_status',
          status: 'error',
          error: 'Connection error occurred',
          post_id: postId
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // console.log(`WebSocket message received for post ${postId}:`, data);
          
          if (data.post_id === this.postId || !data.post_id) {
            this.notifyMessageCallbacks(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };

    } catch (error) {
      // console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      // console.log(`Attempting to reconnect post ${this.postId} in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.notifyMessageCallbacks({
        type: 'connection_status',
        status: 'reconnecting',
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        post_id: this.postId
      });
      
      setTimeout(() => {
        if (this.postId) {
          this.connect(this.postId);
        }
      }, delay);
    } else {
      this.notifyMessageCallbacks({
        type: 'connection_status',
        status: 'failed',
        message: 'Failed to connect after multiple attempts',
        post_id: this.postId
      });
    }
  }

  private notifyMessageCallbacks(data: any) {
    const messageWithPostId = {
      ...data,
      post_id: data.post_id || this.postId
    };

    this.messageCallbacks.forEach(callback => {
      try {
        callback(messageWithPostId);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  sendLike() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'like'
      }));
      // console.log(`Like action sent for post ${this.postId}`);
    } else {
      console.warn(`WebSocket not connected for post ${this.postId}. ReadyState:`, this.socket?.readyState);
    }
  }

  sendComment(content: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'comment',
        content: content
      }));
      // console.log(`Comment action sent for post ${this.postId}:`, content.substring(0, 50) + '...');
    } else {
      console.warn(`WebSocket not connected for post ${this.postId}. ReadyState:`, this.socket?.readyState);
    }
  }

  onMessage(callback: (data: any) => void) {
    this.messageCallbacks.push(callback);
  }

  removeMessageCallback(callback: (data: any) => void) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  disconnect() {
    if (this.socket) {
      // console.log(`Disconnecting WebSocket for post ${this.postId}`);
      this.socket.close(1000, 'Normal closure');
      this.socket = null;
    }
    this.messageCallbacks = [];
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  getReadyState(): number {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getPostId(): string {
    return this.postId;
  }
}

export const createWebSocketService = () => new WebSocketService();

export default new WebSocketService();