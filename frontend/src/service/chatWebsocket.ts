export interface WebSocketMessage {
  type: 'message' | 'user_status' | 'typing' | 'messages_read' | 'call_incoming' | 'call_accepted' | 'call_rejected' | 'call_ended' | 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate';

  message_id?: string;
  message?: string;
  sender_id?: string;
  sender_username?: string;
  sender_profile_picture?: string;
  timestamp?: string;
  is_read?: boolean;
  user_id?: string;
  username?: string;
  status?: 'online' | 'offline';
  is_typing?: boolean;
  message_ids?: string[];
  reader_id?: string;

  call_id?: string;
  call_type?: 'video' | 'audio';
  caller_id?: string;
  caller_username?: string;
  caller_profile_picture?: string;
  acceptor_id?: string;
  acceptor_username?: string;
  rejector_id?: string;
  ended_by?: string;

  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

class ChatWebSocketService {
  private socket: WebSocket | null = null;
  private conversationId: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageCallbacks: ((data: WebSocketMessage) => void)[] = [];
  private isConnecting: boolean = false;

  connect(conversationId: string) {
    if (this.isConnecting && this.conversationId === conversationId) {
      return;
    }

    this.conversationId = conversationId;
    this.isConnecting = true;

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.conversationId !== conversationId) {
      this.disconnect();
    }

    const wsUrl = `ws://localhost:8000/ws/chat/${conversationId}/`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        setTimeout(() => {
          this.requestStatus();
        }, 1000);
      };

      this.socket.onclose = (event) => {
        this.isConnecting = false;

        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.notifyMessageCallbacks(data);
        } catch (error) {
        }
      };

    } catch (error) {
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      setTimeout(() => {
        if (this.conversationId) this.connect(this.conversationId);
      }, delay);
    }
  }


// Message handling methods
  private notifyMessageCallbacks(data: WebSocketMessage) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
      }
    });
  }
  
  sendMessage(content: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'message',
        message: content
      }));
    }
  }

  sendTyping(isTyping: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'typing',
        is_typing: isTyping
      }));
    }
  }

  requestStatus() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'request_status'
      }));
    }
  }

  markAsRead(messageIds: string[]) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'mark_read',
        message_ids: messageIds
      }));
    }
  }

// Call management methods
  initiateCall(callType: 'video' | 'audio' = 'video') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'call_initiate',
        call_type: callType
      }));
    }
  }

  // - Accept call
  acceptCall(callId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'call_accept',
        call_id: callId
      }));
    }
  }

  // - Reject call
  rejectCall(callId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'call_reject',
        call_id: callId
      }));
    }
  }

  // - End call
  endCall(callId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'call_end',
        call_id: callId
      }));
    }
  }

// Signaling methods
  sendCallSignal(action: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action,
        ...data
      }));
    }
  }

  onMessage(callback: (data: WebSocketMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  removeMessageCallback(callback: (data: WebSocketMessage) => void) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Normal closure');
      this.socket = null;
    }
    this.messageCallbacks = [];
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConversationId(): string {
    return this.conversationId;
  }
}

export const createChatWebSocketService = () => new ChatWebSocketService();

export default new ChatWebSocketService();