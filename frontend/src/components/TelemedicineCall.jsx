import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SimplePeer from 'simple-peer';

// Expand your process polyfill to include nextTick
window.process = {
  env: {
    NODE_ENV: 'development'
  },
  nextTick: function(callback) {
    setTimeout(callback, 0);
  }
};

const TelemedicineCall = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [role, setRole] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null); // Add ref for audio element
  const wsRef = useRef(null);
  const peerRef = useRef(null);
  const isMountedRef = useRef(false); // Track if component is mounted

  // Visual placeholder for when video is not available
  const VideoPlaceholder = ({ type }) => {
    return (
      <div style={{
        height: '225px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '5px',
        backgroundImage: 'linear-gradient(to bottom right, #f0f0f0, #e0e0e0)'
      }}>
        <div style={{ textAlign: 'center' }}>
          {type === 'audio' ? (
            <div>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15.5C14.21 15.5 16 13.71 16 11.5V6C16 3.79 14.21 2 12 2C9.79 2 8 3.79 8 6V11.5C8 13.71 9.79 15.5 12 15.5Z" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.34961 9.65039V11.3504C4.34961 15.5704 7.77961 19.0004 11.9996 19.0004C16.2196 19.0004 19.6496 15.5704 19.6496 11.3504V9.65039" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 19V22" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 22H16" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{marginTop: '10px', color: '#555'}}>Audio Only</p>
            </div>
          ) : (
            <div>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12Z" stroke="#555" strokeWidth="2"/>
                <path d="M12 8V12L14.5 14.5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{marginTop: '10px', color: '#555'}}>Connecting...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const initiateCall = (stream, isInitiator) => {
    console.log(`Initiating call as ${isInitiator ? 'initiator' : 'non-initiator'}`);
    const peer = new SimplePeer({
      initiator: isInitiator,
      stream,
      trickle: false,
    });

    peerRef.current = peer;

    peer.on('signal', (signal) => {
      console.log('Generated signal:', signal);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          appointmentId,
          userId: localStorage.getItem('userId'),
          signal,
          audioOnly: isAudioOnly
        }));
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream:', remoteStream);
      console.log('Remote audio tracks:', remoteStream.getAudioTracks());
      console.log('Remote video tracks:', remoteStream.getVideoTracks());
      setRemoteStream(remoteStream);
      
      const hasRemoteVideo = remoteStream.getVideoTracks().length > 0;
      
      if (hasRemoteVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (remoteAudioRef.current) {
        // Use audio element for audio-only streams
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(err => {
          console.error('Error playing remote audio:', err);
        });
        setWarning(warning => warning || "Remote user is in audio-only mode.");
      }
      
      setCallStatus('Call in progress');
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError('Failed to establish call: ' + err.message);
      setCallStatus('Error');
      endCall();
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      setCallStatus('Call ended');
      endCall();
    });
  };

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    const initializeCall = async () => {
      try {
        // Validate the appointment
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        console.log('Frontend - User ID:', userId, 'Token:', token);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`/telemedicine/validate/${appointmentId}`, config);
        console.log('Validate Response:', response.data);
        const { role: userRole } = response.data;
        console.log('Frontend - Assigned Role:', userRole);
        setRole(userRole);

        // Check available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
        const hasAudioDevice = devices.some(device => device.kind === 'audioinput');
        
        if (!hasVideoDevice && !hasAudioDevice) {
          setError('No camera or microphone detected. Please connect devices and try again.');
          setCallStatus('Error');
          return;
        }
        
        // Get user media based on available devices
        let stream;
        try {
          if (hasVideoDevice && hasAudioDevice) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } else if (hasAudioDevice && !hasVideoDevice) {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setIsAudioOnly(true);
            setWarning('No camera detected. Proceeding with audio-only call.');
          } else if (hasVideoDevice && !hasAudioDevice) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setWarning('No microphone detected. Proceeding with video-only call.');
          }
          
          setLocalStream(stream);
          console.log('Local stream tracks:', stream.getTracks());
          
          if (hasVideoDevice && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (mediaError) {
          console.error('Media access error:', mediaError);
          
          if (mediaError.name === 'NotFoundError' || mediaError.name === 'NotAllowedError') {
            try {
              setWarning('Could not access camera. Attempting audio-only call.');
              stream = await navigator.mediaDevices.getUserMedia({ video: role === 'doctor', audio: true });
              setLocalStream(stream);
              setIsAudioOnly(true);
            } catch (audioError) {
              console.error('Audio fallback error:', audioError);
              setError('Could not access camera or microphone. Please check your device permissions.');
              setCallStatus('Error');
              return;
            }
          } else {
            setError('Media access error: ' + mediaError.message);
            setCallStatus('Error');
            return;
          }
        }

        // Connect to WebSocket server for signaling
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('WebSocket already connected, skipping new connection');
          return;
        }

        const ws = new WebSocket(`ws://localhost:5000`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          console.log('Sending join message with audioOnly:', isAudioOnly);
          ws.send(JSON.stringify({
            type: 'join',
            appointmentId,
            userId: localStorage.getItem('userId'),
            audioOnly: isAudioOnly
          }));
        };

        ws.onmessage = (message) => {
          const data = JSON.parse(message.data);
          console.log('WebSocket Message:', data);

          if (data.type === 'role') {
            setRole(data.role);
            // Create SimplePeer instance as soon as role is assigned
            initiateCall(stream, data.role === 'doctor');
            if (data.role === 'doctor') {
              setCallStatus('Waiting for patient to join...');
            } else {
              setCallStatus('Connecting to doctor...');
            }
          } else if (data.type === 'user-joined') {
            if (data.role === 'patient' && userRole === 'doctor') {
              setCallStatus('Patient joined. Starting call...');
              if (data.audioOnly) {
                setWarning('Patient is using audio-only mode.');
              }
            } else if (data.role === 'doctor' && userRole === 'patient') {
              setCallStatus('Doctor joined. Starting call...');
              if (data.audioOnly) {
                setWarning('Doctor is using audio-only mode.');
              }
            }
          } else if (data.type === 'signal') {
            if (peerRef.current) {
              console.log('Processing signal:', data.signal);
              peerRef.current.signal(data.signal);
            } else {
              console.error('Received signal but peerRef is not initialized');
            }
          } else if (data.type === 'user-left') {
            setCallStatus(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} has left the call.`);
            endCall();
          } else if (data.type === 'error') {
            setError(data.message);
            setCallStatus('Error');
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setCallStatus('Disconnected');
          endCall();
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Failed to connect to the call server');
          setCallStatus('Error');
        };
      } catch (err) {
        console.error('Error initializing call:', err);
        setError(err.response?.data?.message || 'Failed to initialize call');
        setCallStatus('Error');
      }
    };

    initializeCall();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'leave',
            appointmentId,
            userId: localStorage.getItem('userId')
          }));
          wsRef.current.close();
        }
        wsRef.current = null;
      }
      endCall();
    };
  }, [appointmentId]);

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
  };

  const handleEndCall = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        appointmentId,
        userId: localStorage.getItem('userId')
      }));
    }
    endCall();
    navigate(role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
  };

  const attemptAudioOnly = async () => {
    try {
      endCall();
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setLocalStream(stream);
      setIsAudioOnly(true);
      
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`/telemedicine/validate/${appointmentId}`, config);
      setRole(response.data.role);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected, skipping new connection');
        return;
      }

      const ws = new WebSocket(`ws://localhost:5000`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket reconnected for audio-only');
        console.log('Sending join message with audioOnly:', true);
        ws.send(JSON.stringify({
          type: 'join',
          appointmentId,
          userId: localStorage.getItem('userId'),
          audioOnly: true
        }));
      };

      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);
        console.log('WebSocket Message (Audio-Only):', data);
        if (data.type === 'role') {
          setRole(data.role);
          initiateCall(stream, data.role === 'doctor');
          if (data.role === 'doctor') {
            setCallStatus('Waiting for patient to join...');
          } else {
            setCallStatus('Connecting to doctor...');
          }
        } else if (data.type === 'signal') {
          if (peerRef.current) {
            peerRef.current.signal(data.signal);
          }
        } else if (data.type === 'user-left') {
          setCallStatus(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} has left the call.`);
          endCall();
        } else if (data.type === 'error') {
          setError(data.message);
          setCallStatus('Error');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setCallStatus('Disconnected');
        endCall();
      };

      ws.onerror = (wsError) => {
        console.error('WebSocket error:', wsError);
        setError('Failed to connect to the call server');
        setCallStatus('Error');
      };
      
      setWarning('Using audio-only mode.');
      setError(null);
      setCallStatus('Reconnecting...');
    } catch (err) {
      console.error('Error switching to audio-only mode:', err);
      setError('Failed to switch to audio-only mode. ' + err.message);
    }
  };

  if (error) {
    return (
      <div className="telemedicine-error" style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <div className="alert alert-danger" style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>Error</h3>
          <p>{error}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button 
              onClick={() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard')} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
            <button 
              onClick={attemptAudioOnly} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Try Audio Only
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="telemedicine-call" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 16.9401V19.9401C22 20.4705 21.7893 20.9792 21.4142 21.3543C21.0391 21.7294 20.5304 21.9401 20 21.9401C17.4073 21.8894 14.8736 21.1331 12.671 19.7501C10.6284 18.5041 8.88488 16.7606 7.63899 14.7181C6.25002 12.5016 5.49298 9.95471 5.44999 7.35011C5.44972 6.82039 5.65974 6.31233 6.03398 5.93719C6.40823 5.56206 6.91568 5.35077 7.44499 5.35011H10.445C11.4016 5.34069 12.2199 6.04131 12.345 6.98511C12.456 7.85811 12.6545 8.71621 12.937 9.54011C13.158 10.1773 13.0012 10.8863 12.52 11.3701L11.318 12.5721C12.4678 14.6975 14.2428 16.4724 16.368 17.6221L17.57 16.4201C18.0537 15.9389 18.7628 15.7822 19.4 16.0031C20.2239 16.2856 21.082 16.4841 21.955 16.5951C22.9107 16.7216 23.6143 17.5576 22 16.9401Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 7.00012C16.0609 7.00012 17.0783 7.42155 17.8284 8.17169C18.5786 8.92184 19 9.93926 19 11.0001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 3C17.1217 3 19.1566 3.84286 20.6569 5.34315C22.1571 6.84344 23 8.87827 23 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Telemedicine Call
      </h1>
      <p style={{
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '6px 12px',
        background: callStatus.includes('Error') ? '#fee2e2' : callStatus.includes('progress') ? '#d1fae5' : '#f3f4f6',
        borderRadius: '4px',
        width: 'fit-content'
      }}>
        {callStatus.includes('Error') ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 22 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : callStatus.includes('progress') ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4372C2.43727 15.6281 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 22 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16V12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8H12.01" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span style={{fontWeight: '500'}}>{callStatus}</span>
      </p>
      
      {warning && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '12px 16px',
          borderRadius: '5px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 22 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{warning}</span>
        </div>
      )}
      
      <div className="video-container" style={{ 
        display: 'flex', 
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        gap: '20px' 
      }}>
        <div className="video-box" style={{ 
          flex: 1, 
          minWidth: '300px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            backgroundColor: '#2c3e50',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 style={{margin: 0}}>{role === 'doctor' ? 'You (Doctor)' : 'You (Patient)'}</h3>
          </div>
          {isAudioOnly ? (
            <VideoPlaceholder type="audio" />
          ) : (
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ width: '100%', height: '225px', objectFit: 'cover', backgroundColor: '#000' }} 
            />
          )}
        </div>
        
        <div className="video-box" style={{ 
          flex: 1, 
          minWidth: '300px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            backgroundColor: '#2c3e50',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 style={{margin: 0}}>{role === 'doctor' ? 'Patient' : 'Doctor'}</h3>
          </div>
          {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '225px', objectFit: 'cover', backgroundColor: '#000' }} 
            />
          ) : (
            <VideoPlaceholder type={remoteStream ? "audio" : "waiting"} />
          )}
          {/* Add audio element for playing remote audio-only streams */}
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
        </div>
      </div>
      
      <div className="call-controls" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '15px', 
        marginTop: '25px' 
      }}>
        <button 
          onClick={handleEndCall} 
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(220, 53, 69, 0.3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 9C10.5 8.60444 10.6582 8.21776 10.9393 7.93934C11.2204 7.66071 11.6049 7.5 12 7.5C12.3951 7.5 12.7796 7.65804 13.0607 7.93934C13.3419 8.22064 13.5 8.60444 13.5 9C13.5 9.41333 13.3413 9.71333 13.0607 9.93934C12.78 10.1653 12.395 10.5 12 10.5C11.605 10.5 11.22 10.1653 10.9393 9.93934C10.6587 9.71333 10.5 9.41333 10.5 9Z" fill="white"/>
            <path d="M3 5C3 4.46957 3.21072 3.96086 3.58579 3.58579C3.96087 3.21071 4.46957 3 5 3H19C19.5304 3 20.0392 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0392 20.7893 19.5304 21 19 21H5C4.46957 21 3.96087 20.7893 3.58579 20.4142C3.21072 20.0391 3 19.5304 3 19V5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 5C3 4.46957 3.21072 3.96086 3.58579 3.58579C3.96087 3.21071 4.46957 3 5 3H19C19.5304 3 20.0392 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0392 20.7893 19.5304 21 19 21H5C4.46957 21 3.96087 20.7893 3.58579 20.4142C3.21072 20.0391 3 19.5304 3 19V5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 15.75L15 9.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 15.75L9 9.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          End Call
        </button>
        
        {!isAudioOnly && (
          <button 
            onClick={attemptAudioOnly} 
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(108, 117, 125, 0.3)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15.5C14.21 15.5 16 13.71 16 11.5V6C16 3.79 14.21 2 12 2C9.79 2 8 3.79 8 6V11.5C8 13.71 9.79 15.5 12 15.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.34961 9.64999V11.35C4.34961 15.57 7.77961 19 11.9996 19C16.2196 19 19.6496 15.57 19.6496 11.35V9.64999" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 22H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Switch to Audio Only
          </button>
        )}
      </div>
    </div>
  );
};

export default TelemedicineCall;