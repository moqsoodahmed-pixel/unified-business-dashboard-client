import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, connected: false });
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ socket: null, connected: false });
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const s = io(import.meta.env?.VITE_SOCKET_URL || undefined, {
      // Function form: always sends the newest access token on (re)connect.
      auth: (cb) => cb({ token: tokenStore.get() }),
      transports: ['websocket', 'polling'], reconnectionDelayMax: 8000,
    });
    ref.current = s;
    s.on('connect', () => setState({ socket: s, connected: true }));
    s.on('disconnect', () => setState({ socket: s, connected: false }));
    s.on('connect_error', () => setState({ socket: s, connected: false }));
    setState({ socket: s, connected: false });
    return () => { s.close(); ref.current = null; setState({ socket: null, connected: false }); };
  }, [user?.id]);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

/** Subscribe to a server event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => saved.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
