import { listenSession } from './auth.js';

listenSession((session) => {
  const isAdmin = Boolean(session?.isActive) && session?.role === 'admin';
  if (!isAdmin) {
    window.location.replace('./index.html');
  }
});
