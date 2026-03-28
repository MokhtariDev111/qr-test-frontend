import { useState, useEffect, useRef } from 'react';
import { attendance } from '../services/api';
import { Button } from './ui/button';
import { RefreshCw, Users, XCircle, Timer, MapPin, X, Copy, Check, Smartphone } from 'lucide-react';
import LocationMap from './LocationMap';

interface Props {
  sessionId: number;
  teacherLat?: number | null;
  teacherLng?: number | null;
  onEnd: () => void;
}

export default function QRDisplay({ sessionId, teacherLat, teacherLng, onEnd }: Props) {
  const [qr, setQr] = useState('');
  const [qrText, setQrText] = useState('');
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(60);
  const [showMap, setShowMap] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [actualTeacherLat, setActualTeacherLat] = useState<number | null>(teacherLat || null);
  const [actualTeacherLng, setActualTeacherLng] = useState<number | null>(teacherLng || null);
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

  useEffect(() => {
    // Check if location is already set
    if (teacherLat && teacherLng) {
      setLocationSet(true);
      setActualTeacherLat(teacherLat);
      setActualTeacherLng(teacherLng);
    }
    
    loadQR();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/attendance/ws/${sessionId}?origin=${encodeURIComponent(window.location.origin)}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.type === 'refresh') {
        setQr(d.qr_image);
        setQrText(d.qr_text || '');
        setTime(60);
      } else if (d.type === 'ended') onEnd();
    };

    const i = setInterval(() => {
      loadRecords();
      loadLocations();
      checkLocation();
    }, 5000);
    loadRecords();
    loadLocations();

    return () => {
      clearInterval(i);
      ws.current?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    if (time > 0) {
      const t = setTimeout(() => setTime(time - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [time]);

  const loadQR = async () => {
    const r = await attendance.getQR(sessionId, window.location.origin);
    setQr(r.data.qr_image);
    setQrText(r.data.qr_text || '');
    setTime(r.data.expires_in || 60);
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
      setLocations(r.data);
    } catch {}
  };

  const checkLocation = async () => {
    try {
      const r = await attendance.getLocations(sessionId);
      // If we get locations back without error, the session exists
      // We need to check if teacher location is set by trying to get session info
    } catch {}
  };

  const end = async () => {
    if (confirm('Permanently end this attendance session?')) {
      await attendance.endSession(sessionId);
      onEnd();
    }
  };

  // STAGE 1: Teacher needs to set location
  if (!locationSet) {
    return (
      <div className="flex flex-col items-center">
        {/* Teacher Location QR */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-[2rem] shadow-2xl">
          <div className="bg-white p-6 rounded-[1.8rem]">
            <div className="text-center mb-4">
              <Smartphone className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-bold text-gray-800">Step 1: Set Classroom Location</h3>
              <p className="text-sm text-gray-500">Scan this QR with your phone to set accurate GPS</p>
            </div>
            {qr && (
              <img src={`data:image/png;base64,${qr}`} alt="Teacher QR" className="w-64 h-64 mx-auto" />
            )}
          </div>
        </div>

        {/* Copy Teacher Link */}
        <Button
          variant="outline"
          className="mt-4 w-full h-12 rounded-2xl border-blue-300 text-blue-600 hover:bg-blue-50 gap-2"
          onClick={() => copyLink(getTeacherLink())}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Link Copied!' : 'Copy Link (Open on Phone)'}
        </Button>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
          <p className="text-sm text-yellow-800">
            ⏳ Waiting for you to set location from your phone...
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            After scanning, this screen will automatically update.
          </p>
        </div>

        {/* Manual override for testing */}
        <Button
          variant="ghost"
          className="mt-4 text-xs text-gray-400"
          onClick={() => setLocationSet(true)}
        >
          Skip (for testing only)
        </Button>

        {/* End Session */}
        <Button
          variant="destructive"
          size="lg"
          onClick={end}
          className="mt-8 w-full h-14 rounded-2xl shadow-xl font-bold"
        >
          <XCircle className="h-5 w-5 mr-2" /> Cancel Session
        </Button>
      </div>
    );
  }

  // STAGE 2: Location set - Show student QR
  return (
    <div className="flex flex-col items-center">
      {/* Success badge */}
      <div className="mb-4 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
        ✅ Classroom location set!
      </div>

      {/* QR Code */}
      {qr && (
        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-primary/5 hover:border-primary/20 transition-all duration-500">
          <img src={`data:image/png;base64,${qr}`} alt="QR" className="w-64 h-64 select-none pointer-events-none" />
        </div>
      )}

      {/* Copy Link Button */}
      {qrText && (
        <Button
          variant="outline"
          className="mt-4 w-full h-12 rounded-2xl border-primary/30 text-primary hover:bg-primary/5 gap-2"
          onClick={() => copyLink(getShareLink())}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Link Copied!' : 'Copy Student Link'}
        </Button>
      )}

      {/* Timer */}
      <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border/50">
        <Timer className={`h-4 w-4 ${time <= 5 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
        <span className={`text-sm font-bold font-mono ${time <= 5 ? 'text-destructive' : 'text-foreground'}`}>
          REGENERATING IN {time}s
        </span>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 w-full">
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center border-l-4 border-success">
          <Users className="h-5 w-5 text-success mb-1" />
          <span className="text-2xl font-black text-foreground">{count}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Present</span>
        </div>
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center border-l-4 border-primary">
          <RefreshCw className="h-5 w-5 text-primary mb-1" />
          <Button variant="ghost" size="sm" onClick={loadQR} className="h-auto p-0 font-bold text-[10px] uppercase">
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Live Map Button */}
      <Button
        variant="outline"
        className="mt-4 w-full h-12 rounded-2xl border-primary/30 text-primary hover:bg-primary/5 gap-2"
        onClick={() => { loadLocations(); setShowMap(v => !v); }}
      >
        <MapPin className="h-4 w-4" />
        {showMap ? 'Hide' : 'Show'} Live Location Map
        {locations.length > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
            {locations.length}
          </span>
        )}
      </Button>

      {/* Map Panel */}
      {showMap && (
        <div className="mt-4 w-full rounded-2xl overflow-hidden border border-primary/20 shadow-xl">
          <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Live GPS Map</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-semibold">
              <span>🎓 Teacher</span>
              <span>👤 Student ({locations.length})</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowMap(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <LocationMap
            teacherLat={actualTeacherLat}
            teacherLng={actualTeacherLng}
            students={locations}
          />
        </div>
      )}

      {/* End Session */}
      <Button
        variant="destructive"
        size="lg"
        onClick={end}
        className="mt-8 w-full h-14 rounded-2xl shadow-xl font-bold animate-in slide-in-from-bottom-5"
      >
        <XCircle className="h-5 w-5 mr-2" /> Stop Recording
      </Button>
    </div>
  );
}