import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { clearPersistedGeometry, resetGeometry } from './store';

function Reset() {
  useEffect(() => {
    clearPersistedGeometry();
    resetGeometry();
  }, []);

  return <Navigate to="/" replace />;
}

export default Reset;