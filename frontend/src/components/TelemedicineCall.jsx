import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SimplePeer from 'simple-peer';

const TelemedicineCall = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Validate the appointment
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`/api/telemedicine/validate/${appointmentId}`, config);
        const { role: userRole } = response.data;
        setRole(userRole);

        // Get user media (video and audio)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localVideoRef.current.srcObject = stream;

        // Connect to WebSocket server for signaling
        const ws = new WebSocket(`ws://localhost:5000`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          ws.send(JSON.stringify({
            type: 'join',
            appointmentId,
            userId: localStorage.getItem('userId'),
          }));
        };

        ws.onmessage = (message) => {
          const data = JSON.parse(message.data);

          if (data.type === 'role') {
            setRole(data.role);
            if (data.role === 'doctor') {
              setCallStatus('Waiting for patient to join...');
            } else {
              setCallStatus('Connecting to doctor...');
            }
          } else if (data.type === 'user-joined') {
            if (data.role === 'patient' && userRole === 'doctor') {
              setCallStatus('Patient joined. Starting call...');
              initiateCall(stream);
            } else if (data.role === 'doctor' && userRole === 'patient') {
              setCallStatus('Doctor joined. Starting call...');
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
      endCall();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [appointmentId]);

  const initiateCall = (stream) => {
    const peer = new SimplePeer({
      initiator: role === 'doctor',
      stream,
      trickle: false,
    });

    peerRef.current = peer;

    peer.on('signal', (signal) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          appointmentId,
          userId: localStorage.getItem('userId'),
          signal,
        }));
      }
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      setCallStatus('Call in progress');
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError('Failed to establish call');
      setCallStatus('Error');
      endCall();
    });

    peer.on('close', () => {
      setCallStatus('Call ended');
      endCall();
    });
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleEndCall = () => {
    endCall();
    navigate('/doctor-dashboard');
  };

  if (error) {
    return (
      <div className="telemedicine-error">
        <div className="alert alert-danger">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/doctor-dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="telemedicine-call">
      <h1>Telemedicine Call</h1>
      <p>Status: {callStatus}</p>
      <div className="video-container">
        <div className="video-box">
          <h3>{role === 'doctor' ? 'You (Doctor)' : 'You (Patient)'}</h3>
          <video ref={localVideoRef} autoPlay muted playsInline className="local-video" />
        </div>
        <div className="video-box">
          <h3>{role === 'doctor' ? 'Patient' : 'Doctor'}</h3>
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
        </div>
      </div>
      <div className="call-controls">
        <button onClick={handleEndCall} className="btn btn-danger">
          End Call
        </button>
      </div>
    </div>
  );
};

export default TelemedicineCall;