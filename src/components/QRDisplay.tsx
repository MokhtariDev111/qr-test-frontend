import { useState, useEffect, useRef } from 'react';
import { attendance } from '../services/api';
import { Button } from './ui/button';
import { RefreshCw, Users, XCircle, Timer, MapPin, Copy, Check, Smartphone } from 'lucide-react';
import LocationMap from './LocationMap';
import QRCode from 'qrcode';

interface Props {
  sessionId: number;
  teacherLat?: number | null;
  teacherLng?: number | null;
  onEnd: () => void;
}

export default function QRDisplay({ sessionId, onEnd }: Props) {
  const [studentQr, setStudentQr] = useState('');
  const [teacherQr, setTeacherQr] = useState('');
  const [qrText, setQrText] = useState('');
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(60);
  const [locations, setLocations] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [teacherLat, setTeacherLat] = useState<number | null>(null);
  const [teacherLng, setTeacherLng] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const getTeacherLink = () => {
    return `${window.location.origin}/set-location?session=${sessionId}`;
  };

  const getShareLink = () => {
    return `${window.location.origin}/student?token=${qrText}`;
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Link: ' + link);
    }
  };

  const generateTeacherQR = async () => {
    try {
      const link = `${window.location.origin}/set-location?session=${sessionId}`;
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1e40af', light: '#ffffff' }
      });
      setTeacherQr(qrDataUrl);
    } catch (err) {
      console.error('QR generation failed', err);
    }
  };

  const loadQR = async () => {
    try {
      const r = await attendance.getQR(sessionId, window.location.origin);
      setStudentQr(r.data.qr_image);
      setQrText(r.data.qr_text || '');
      setTime(r.data.expires_in || 60);
    } catch {}
  };

  const loadRecords = async () => {
    try {
      const r = await attendance.getRecords(sessionId);
      setCount(r.data.filter((x: any) => x.is_present).length);
    } catch {}
  };

  const loadLocations = async () => {
    try {
      const r = await attendance.getLocations(sessionId);
      if (r.data.teacher_location_set) {
        setLocationSet(true);
        setTeacherLat(r.data.teacher_lat);
        setTeacherLng(r.data.teacher_lng);
      }
      setLocations(r.data.students || []);
    } catch {}
  };

  const checkLocationStatus = async () => {
    try {
      const r = await attendance.getLocations(sessionId);
      if (r.data.teacher_location_set) {
        setLocationSet(true);
        setTeacherLat(r.data.teacher_lat);
        setTeacherLng(r.data.teacher_lng);
      }
    } catch {}
  };

  useEffect(() => {
    generateTeacherQR();
    loadQR();
    checkLocationStatus();
    
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const wsBase = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '');
    const wsUrl = `${wsBase}/api/attendance/ws/${sessionId}?origin=${encodeURIComponent(window.location.origin)}`;
    
    try {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.type === 'refresh') {
          setStudentQr(d.qr_image);
          setQrText(d.qr_text || '');
          setTime(60);
        } else if (d.type === 'ended') onEnd();
      };
    } catch (e) {
      console.log('WebSocket not available');
    }

    const i = setInterval(() => {
      loadRecords();
      checkLocationStatus();
      loadLocations();
    }, 3000);

    return () => {
      clearInterval(i);
      ws.current?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    if (time > 0 && locationSet) {
      const t = setTimeout(() => setTime(time - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [time, locationSet]);

  const end = async () => {
    if (confirm('Permanently end this attendance session?')) {
      await attendance.endSession(sessionId);
      onEnd();
    }
  };

  // STAGE 1: Teacher needs to scan QR to set location
  if (!locationSet) {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-[2rem] shadow-2xl">
          <div className="bg-white p-6 rounded-[1.8rem]">
            <div className="text-center mb-4">
              <Smartphone className="h-10 w-10 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-bold text-gray-800">Step 1: Set Classroom Location</h3>
              <p className="text-sm text-gray-500">Scan this QR with your phone</p>
            </div>
            {teacherQr && (
              <img src={teacherQr} alt="Teacher QR" className="w-64 h-64 mx-auto" />
            )}
          </div>
        </div>

        <p className="mt-4 text-sm text-white/70">Or copy the link:</p>
        <Button
          variant="outline"
          className="mt-2 w-full h-10 rounded-2xl border-white/30 text-white hover:bg-white/10 gap-2"
          onClick={() => copyLink(getTeacherLink())}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Link Copied!' : 'Copy Link'}
        </Button>

        <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl text-center">
          <p className="text-sm text-yellow-200">⏳ Waiting for you to scan with your phone...</p>
          <p className="text-xs text-yellow-200/70 mt-1">This screen will automatically update.</p>
        </div>

        <Button variant="ghost" className="mt-4 text-xs text-white/40" onClick={() => setLocationSet(true)}>
          Skip (Testing only)
        </Button>

        <Button variant="destructive" size="lg" onClick={end} className="mt-8 w-full h-14 rounded-2xl shadow-xl font-bold">
          <XCircle className="h-5 w-5 mr-2" /> Cancel Session
        </Button>
      </div>
    );
  }

  // STAGE 2: Location set - Show student QR + Map side by side
  return (
    <div className="flex flex-col">
      {/* Success badge */}
      <div className="mb-4 px-4 py-2 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold text-center mx-auto">
        ✅ Classroom location set!
      </div>

      {/* QR + Map side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: QR Code */}
        <div className="flex flex-col items-center">
          {studentQr && (
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <img src={`data:image/png;base64,${studentQr}`} alt="Student QR" className="w-56 h-56 select-none pointer-events-none" />
            </div>
          )}

          {/* Timer */}
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <Timer className={`h-4 w-4 ${time <= 5 ? 'text-red-400 animate-pulse' : 'text-white/70'}`} />
            <span className={`text-sm font-bold font-mono ${time <= 5 ? 'text-red-400' : 'text-white'}`}>
              {time}s
            </span>
          </div>

          {/* Copy Link */}
          {qrText && (
            <Button
              variant="outline"
              className="mt-4 w-full h-10 rounded-xl border-white/30 text-white hover:bg-white/10 gap-2"
              onClick={() => copyLink(getShareLink())}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Student Link'}
            </Button>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 w-full">
            <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3">
              <Users className="h-5 w-5 text-green-400" />
              <div>
                <span className="text-2xl font-bold text-white">{count}</span>
                <p className="text-[10px] text-white/60 uppercase">Present</p>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl flex items-center justify-center">
              <Button variant="ghost" size="sm" onClick={loadQR} className="text-white/80 hover:text-white hover:bg-white/10">
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Live Location Map</span>
            <span className="ml-auto text-xs text-white/60">
              🎓 Teacher • 👤 Students ({locations.length})
            </span>
          </div>
          <div className="flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-white/20">
            <LocationMap
              teacherLat={teacherLat}
              teacherLng={teacherLng}
              students={locations}
            />
          </div>
        </div>
      </div>

      {/* End Session Button */}
      <Button
        variant="destructive"
        size="lg"
        onClick={end}
        className="mt-6 w-full h-12 rounded-2xl shadow-xl font-bold"
      >
        <XCircle className="h-5 w-5 mr-2" /> Stop Recording
      </Button>
    </div>
  );
}