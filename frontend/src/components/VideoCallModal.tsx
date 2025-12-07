import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'incoming' | 'outgoing';
  otherUser: {
    username: string;
    profile_picture?: string;
  };
  onAccept?: () => void;
  onReject?: () => void;
  webSocketService: any;
  callId?: string;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  callType,
  otherUser,
  onAccept,
  onReject,
  webSocketService,
  callId,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    // Initialize WebRTC when modal opens
    if (callType === 'outgoing') {
      initializeOutgoingCall();
    } else {
      // For incoming calls, wait for user to accept
      setCallStatus('ringing');
    }
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const initializeOutgoingCall = async () => {
    try {
      setCallStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setTimeout(() => {
          localVideoRef.current?.play().catch(() => {});
        }, 50);
      }
      await createPeerConnection();
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });
      
      // Create offer (SDP)
      const offer = await peerConnectionRef.current?.createOffer();
      await peerConnectionRef.current?.setLocalDescription(offer);
      
      webSocketService.sendCallSignal('webrtc_offer', { offer });
      
    } catch (err) {
      // console.error('Error initializing call:', err);
      setError('Failed to access camera/microphone');
    }
  };

  const handleAcceptCall = async () => {
    if (onAccept) onAccept();
    
    try {
      setCallStatus('connecting');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setTimeout(() => {
          localVideoRef.current?.play().catch(() => {});
        }, 50);
      }
      
      // Create peer connection
      await createPeerConnection();
      
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });
      
      // If there was a pending offer, process it now
      if (pendingOfferRef.current) {
        const offerToProcess = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await handleOffer(offerToProcess);
      }
      
    } catch (err) {
      // console.error('Error accepting call:', err);
      setError('Failed to access camera/microphone');
    }
  };

  const createPeerConnection = async () => {
    // ICE servers help establish connection
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;
    
    // Handle ICE candidates
    // These are network addresses that can be used to connect
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        webSocketService.sendCallSignal('webrtc_ice_candidate', {
          candidate: event.candidate,
        });
      }
    };
    
    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          const stream = event.streams[0];
          remoteVideoRef.current.srcObject = stream;
          
          // Update status when we get video track
          if (event.track.kind === 'video') {
            setCallStatus('connected');
          }
          
          // Ensure the stream is playing
          remoteVideoRef.current.onloadedmetadata = () => {
            remoteVideoRef.current?.play().catch(() => {});
          };
          
          // Handle errors silently
          remoteVideoRef.current.onerror = () => {};
        }
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      
      if (state === 'connected') {
        setCallStatus('connected');
      } else if (state === 'failed' || state === 'closed') {
        setCallStatus('ended');
        handleEndCall();
      }
    };
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      if (!offer || !offer.type) {
        return;
      }
      
      if (!peerConnectionRef.current) {
        pendingOfferRef.current = offer;
        return;
      }
      
      const currentState = peerConnectionRef.current.signalingState;
      
      if (currentState === 'stable' && peerConnectionRef.current.currentRemoteDescription) {
        return;
      }
      
      // Set remote description
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // Send answer back through WebSocket
      webSocketService.sendCallSignal('webrtc_answer', { answer });
      
    } catch (err) {
      // Silently catch timing issues
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (!answer || !answer.type) {
        return;
      }
      
      if (!peerConnectionRef.current) {
        return;
      }
      
      const currentState = peerConnectionRef.current.signalingState;
      
      // Only process if we're expecting an answer
      if (currentState !== 'have-local-offer') {
        return;
      }
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (!candidate) {
        return;
      }
      
      if (!peerConnectionRef.current) {
        return;
      }
      
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // console.error('Error adding ICE candidate:', err);
    }
  };

  // Listen for WebRTC signaling messages
  useEffect(() => {
    if (!webSocketService || !isOpen) return;

    const handleSignaling = (data: any) => {
      switch (data.type) {
        case 'webrtc_offer':
          handleOffer(data.offer);
          break;
        case 'webrtc_answer':
          handleAnswer(data.answer);
          break;
        case 'webrtc_ice_candidate':
          handleIceCandidate(data.candidate);
          break;
      }
    };

    webSocketService.onMessage(handleSignaling);

    return () => {
      webSocketService.removeMessageCallback(handleSignaling);
    };
  }, [webSocketService, isOpen]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    localStreamRef.current = null;
    peerConnectionRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full h-full relative">
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onError={(e) => {
            e.preventDefault();
          }}
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
            onError={(e) => {
              e.preventDefault();
            }}
          />
        </div>

        {/* User Info Overlay (shown when ringing) */}
        {callStatus === 'ringing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
            <img
              src={otherUser.profile_picture || '/default.webp'}
              alt={otherUser.username}
              className="w-32 h-32 rounded-full mb-4 border-4 border-white"
            />
            <h2 className="text-white text-3xl font-bold mb-2">{otherUser.username}</h2>
            <p className="text-gray-300 text-lg">
              {callType === 'incoming' ? 'Incoming call...' : 'Calling...'}
            </p>
            
            {callType === 'incoming' && (
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={onReject}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>
                <button
                  onClick={handleAcceptCall}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition"
                >
                  <Phone className="w-8 h-8 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Call Controls */}
        {callStatus === 'connected' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            <button
              onClick={handleEndCall}
              className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={handleEndCall}
          className="absolute top-4 left-4 w-10 h-10 bg-gray-800 bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;