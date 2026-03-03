import { currentSession } from './auth.js';

const session = currentSession();
if (!session || session.role !== 'admin') {
  window.location.replace('./index.html');
}
