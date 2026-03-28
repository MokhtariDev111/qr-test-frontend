import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { attendance } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { getHighAccuracyLocation } from '@/lib/geo';

export default function SetLocation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionId = searchParams.get('session');
  
  const [status, setStatus] = useState<'checking' | 'acquiring' | 'success' | 'error'>('checking');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState('Checking login...');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('No session ID provided');
      return;
    }

    if (!user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(`/set-location?session=${sessionId}`);
      navigate(`/login?redirect=${returnUrl}`);
      return;
    }

    if (user.role !== 'teacher') {
      setStatus('error');
      setMessage('Only teachers can set classroom location');
      return;
    }

    // Start acquiring location
    acquireLocation();
  }, [sessionId, user]);

  const acquireLocation = async () => {
    setStatus('acquiring');
    setMessage('Acquiring GPS location...');

    try {
      const location = await getHighAccuracyLocation({
        maxAccuracy: 50,
        timeout: 30000,
        onProgress: ({ accuracy }) => {
          setAccuracy(accuracy);
          setMessage(`GPS Accuracy: ${Math.round(accuracy)}m`);
        }
      });

      if (!location) {
        setStatus('error');
        setMessage('Could not get GPS location. Please enable location services.');
        return;
      }

      if (location.accuracy > 100) {
        setStatus('error');
        setMessage(`GPS accuracy too poor (${Math.round(location.accuracy)}m). Please go outside or near a window.`);
        return;
      }

      // Send to backend
      setMessage('Setting classroom location...');
      await attendance.setLocation(parseInt(sessionId!), location.lat, location.lng);

      setStatus('success');
      setMessage(`Classroom location set! Accuracy: ${Math.round(location.accuracy)}m`);

    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || error.message || 'Failed to set location');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
          {status === 'checking' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Checking...</h1>
              <p className="text-gray-500">{message}</p>
            </>
          )}

          {status === 'acquiring' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Setting Location</h1>
              <p className="text-gray-500 mb-4">{message}</p>
              {accuracy && (
                <div className="inline-block px-4 py-2 bg-blue-50 rounded-full">
                  <span className="text-sm text-blue-600 font-semibold">
                    📍 Accuracy: {Math.round(accuracy)}m
                  </span>
                </div>
              )}
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Location Set! ✅</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <div className="p-4 bg-green-50 rounded-2xl mb-6">
                <p className="text-sm text-green-700">
                  You can now close this page and return to your computer.
                  <br /><br />
                  <strong>The PC screen will update automatically.</strong>
                  <br />
                  Students can now scan the QR code!
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <Button onClick={acquireLocation} className="w-full mb-3 h-12 rounded-xl">
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}