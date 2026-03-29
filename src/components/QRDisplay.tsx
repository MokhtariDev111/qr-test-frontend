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
        width: 400,
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
      <div className="flex flex-col items-center py-8">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-[2rem] shadow-2xl">
          <div className="bg-white p-8 rounded-[1.8rem]">
            <div className="text-center mb-6">
              <Smartphone className="h-14 w-14 mx-auto text-blue-500 mb-3" />
              <h3 className="text-2xl font-bold text-gray-800">Step 1: Set Classroom Location</h3>
              <p className="text-base text-gray-500 mt-1">Scan this QR with your phone</p>
            </div>
            {teacherQr && (
              <img src={teacherQr} alt="Teacher QR" className="w-[350px] h-[350px] mx-auto" />
            )}
          </div>
        </div>

        <p className="mt-6 text-base text-white/70">Or copy the link:</p>
        <Button
          variant="outline"
          className="mt-3 w-80 h-14 rounded-2xl border-white/30 text-white hover:bg-white/10 gap-2 text-lg"
          onClick={() => copyLink(getTeacherLink())}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? 'Link Copied!' : 'Copy Link'}
        </Button>

        <div className="mt-8 p-5 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl text-center w-80">
          <p className="text-base text-yellow-200">⏳ Waiting for you to scan...</p>
          <p className="text-sm text-yellow-200/70 mt-2">This screen will automatically update.</p>
        </div>

        <Button variant="ghost" className="mt-6 text-sm text-white/40" onClick={() => setLocationSet(true)}>
          Skip (Testing only)
        </Button>

        <Button variant="destructive" size="lg" onClick={end} className="mt-10 w-80 h-16 rounded-2xl shadow-xl font-bold text-lg">
          <XCircle className="h-6 w-6 mr-2" /> Cancel Session
        </Button>
      </div>
    );
  }

  // STAGE 2: Location set - Show student QR + Map side by side
  return (
    <div className="p-4">
      {/* Success badge */}
      <div className="mb-8 px-8 py-4 bg-green-500/20 text-green-300 rounded-full text-lg font-semibold text-center mx-auto w-fit">
        ✅ Classroom location set!
      </div>

      {/* QR + Map side by side */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left: QR Code Section */}
        <div className="flex flex-col items-center lg:w-1/2">
          {studentQr && (
            <div className="bg-white p-8 rounded-3xl shadow-2xl">
              <img 
                src={`data:image/png;base64,${studentQr}`} 
                alt="Student QR" 
                className="w-[300px] h-[300px] lg:w-[350px] lg:h-[350px] select-none pointer-events-none" 
              />
            </div>
          )}

          {/* Timer */}
          <div className="mt-6 flex items-center gap-3 px-8 py-4 bg-white/10 rounded-full">
            <Timer className={`h-6 w-6 ${time <= 5 ? 'text-red-400 animate-pulse' : 'text-white/70'}`} />
            <span className={`text-xl font-bold font-mono ${time <= 5 ? 'text-red-400' : 'text-white'}`}>
              Refresh in {time}s
            </span>
          </div>

          {/* Copy Link */}
          {qrText && (
            <Button
              variant="outline"
              className="mt-5 w-72 h-14 rounded-xl border-white/30 text-white hover:bg-white/10 gap-2 text-lg"
              onClick={() => copyLink(getShareLink())}
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? 'Copied!' : 'Copy Student Link'}
            </Button>
          )}

          {/* Stats */}
          <div className="mt-6 flex gap-4">
            <div className="bg-white/10 px-8 py-5 rounded-2xl flex items-center gap-4">
              <Users className="h-8 w-8 text-green-400" />
              <div>
                <span className="text-4xl font-bold text-white">{count}</span>
                <p className="text-sm text-white/60 uppercase">Present</p>
              </div>
            </div>
            <div className="bg-white/10 px-6 py-5 rounded-2xl flex items-center justify-center">
              <Button variant="ghost" onClick={loadQR} className="text-white/80 hover:text-white hover:bg-white/10 text-lg">
                <RefreshCw className="h-6 w-6 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Map Section */}
        <div className="flex flex-col lg:w-1/2">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-semibold text-white">Live Location Map</span>
            <span className="ml-auto text-base text-white/60">
              🎓 Teacher • 👤 Students ({locations.length})
            </span>
          </div>
          <div className="flex-1 h-[400px] lg:h-[500px] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
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
        className="mt-10 w-full max-w-lg mx-auto h-16 rounded-2xl shadow-xl font-bold text-xl flex"
      >
        <XCircle className="h-7 w-7 mr-3" /> Stop Recording
      </Button>
    </div>
  );
}