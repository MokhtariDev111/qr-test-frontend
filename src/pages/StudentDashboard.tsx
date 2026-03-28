import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  QrCode, CheckCircle2, Clock, BookOpen, AlertCircle,
  Satellite, Wifi, RefreshCw, Info
} from "lucide-react";
import SecurityIndicator from "@/components/SecurityIndicator";
import ScanSuccess from "@/components/ScanSuccess";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { attendance } from "../services/api";
import { useSearchParams } from "react-router-dom";
import QRScanner from "../components/QRScanner";
import { getHighAccuracyLocation, checkGpsAvailability } from "../lib/geo";

const listItem = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

type GpsStatus = 'loading' | 'gps' | 'ip' | 'none' | 'acquiring';

const GPS_LABEL: Record<GpsStatus, string> = {
  loading:   'Finding your location…',
  acquiring: 'Acquiring precise GPS…',
  gps:       'GPS Locked (Precise)',
  ip:        'IP Location Active (Approximate)',
  none:      'Location Unavailable',
};

const GPS_COLOR: Record<GpsStatus, string> = {
  loading:   'text-warning',
  acquiring: 'text-blue-400',
  gps:       'text-success',
  ip:        'text-warning',
  none:      'text-destructive',
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCourse, setLastCourse] = useState("");
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('loading');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [showGpsInfo, setShowGpsInfo] = useState(false);
  const scanningRef = useRef(false);

  const [deviceId] = useState(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', id);
    }
    return id;
  });

  useEffect(() => {
    loadHistory();
    refreshGps();

    const token = searchParams.get('token');
    if (token && !scanningRef.current) {
      scanningRef.current = true;
      onScan(token);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle token from QR code link (phone camera opens the URL)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !scanningRef.current) {
      scanningRef.current = true;
      onScan(token);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadHistory = async () => {
    try {
      const res = await attendance.history();
      setHistory(res.data);
    } catch {}
  };

  const refreshGps = async () => {
    setGpsStatus('loading');
    const status = await checkGpsAvailability();
    setGpsStatus(status);
  };

  const onScan = async (data: string) => {
    // Explicitly ask the student for location consent
    if (!window.confirm("Do you accept sharing your exact location for attendance verification? Your precise distance in meters from the teacher will be extracted and recorded.")) {
      scanningRef.current = false;
      setScanning(false);
      return;
    }

    setScanning(false);
    setMsg("");
    setGpsStatus('acquiring');
    setGpsAccuracy(null);

    // Get HIGH-ACCURACY location with progress updates
    const loc = await getHighAccuracyLocation({
      maxAccuracy: 50,  // Wait for 50m accuracy or better
      timeout: 25000,   // 25 seconds max
      onProgress: ({ accuracy, status }) => {
        setGpsAccuracy(accuracy);
        if (status === 'good') {
          setGpsStatus('gps');
        }
      }
    });

    // Check if accuracy is acceptable
    if (loc && loc.accuracy > 500) {
      setMsg(`GPS accuracy too poor (${Math.round(loc.accuracy)}m). Please enable GPS or go outside.`);
      setGpsStatus(loc.method === 'ip' ? 'ip' : 'none');
      scanningRef.current = false;
      return;
    }

    if (loc) {
      setGpsStatus(loc.method);
      setGpsAccuracy(loc.accuracy);
    }

    try {
      const r = await attendance.scan(
        data,
        loc?.lat ?? null,
        loc?.lng ?? null,
        loc?.accuracy ?? null,  // NEW: Send accuracy!
        deviceId
      );
      setLastCourse(r.data.course || "Attendance Marked");
      setLastDistance(r.data.distance_meters !== undefined ? r.data.distance_meters : null);
      setShowSuccess(true);
      loadHistory();
    } catch (e: any) {
      setMsg(e.response?.data?.detail || "Scan failed");
    } finally {
      scanningRef.current = false;
    }
  };

  const handleSuccessDone = useCallback(() => {
    setShowSuccess(false);
  }, []);

  if (scanning) return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold">Scanning QR Code</h2>
        <Button variant="ghost" onClick={() => setScanning(false)}>Cancel</Button>
      </header>
      <div className="glass-card p-4 rounded-3xl overflow-hidden shadow-2xl">
        <QRScanner onScan={onScan} />
      </div>
      <p className="text-center text-muted-foreground mt-8 animate-pulse text-sm">
        Position the code in the center of the frame
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ScanSuccess visible={showSuccess} onDone={handleSuccessDone} courseName={lastCourse} distance={lastDistance} />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground truncate max-w-[120px]">{user?.full_name}</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-tight font-semibold">
                ID: {user?.student_id}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            Log out
          </Button>
        </div>
      </header>

      <main className="container max-w-lg mx-auto py-6 space-y-6 px-4">

        {/* Scan Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card flex flex-col items-center gap-5 p-8 rounded-3xl"
        >
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Mark Presence</h2>
            <p className="text-sm text-muted-foreground">Scan your room's secure QR tag</p>
          </div>

          <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
            <Button
              variant="default"
              size="lg"
              onClick={() => setScanning(true)}
              className="h-24 w-24 rounded-full p-0 shadow-2xl bg-primary hover:bg-primary/90"
            >
              <QrCode className="h-10 w-10" />
            </Button>
          </motion.div>

          {msg && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-xl text-sm w-full">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {msg}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Instant-Scan · Geo-Fence Active
          </p>
        </motion.div>

        {/* GPS Status Panel */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setShowGpsInfo(v => !v)}
          >
            <div className="flex items-center gap-2">
              {gpsStatus === 'gps' && <Satellite className="h-4 w-4 text-success" />}
              {gpsStatus === 'acquiring' && <Satellite className="h-4 w-4 text-blue-400 animate-pulse" />}
              {gpsStatus === 'ip'  && <Wifi className="h-4 w-4 text-warning" />}
              {gpsStatus === 'none' && <AlertCircle className="h-4 w-4 text-destructive" />}
              {gpsStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              <span className={`text-sm font-semibold ${GPS_COLOR[gpsStatus]}`}>
                {GPS_LABEL[gpsStatus]}
                {gpsAccuracy !== null && gpsStatus !== 'ip' && (
                  <span className="ml-1 font-mono text-xs">
                    ({Math.round(gpsAccuracy)}m)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {showGpsInfo && (
            <div className="border-t border-border/50 px-4 py-3 space-y-3 text-xs text-muted-foreground bg-muted/20">
              {gpsStatus === 'gps' && (
                <p className="text-success font-semibold">
                  ✅ Precise GPS is working. Accuracy: {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : 'N/A'}
                </p>
              )}
              {gpsStatus === 'acquiring' && (
                <div className="space-y-1">
                  <p className="text-blue-400 font-semibold">📡 Acquiring GPS signal...</p>
                  <p>Current accuracy: {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : 'Searching...'}</p>
                  <p className="text-xs">Please wait while GPS locks onto satellites. Stand near a window or go outside for best results.</p>
                </div>
              )}
              {gpsStatus === 'ip' && (
                <div className="space-y-1">
                  <p className="text-warning font-semibold">⚠️ Using approximate IP location.</p>
                  <p>Precise GPS is blocked because this page is not on HTTPS. Your location will be roughly accurate (city-level) but the teacher's geo-fence check may still pass if you're nearby.</p>
                  <p className="mt-1">To get precise GPS: open this app via the <span className="font-mono font-bold text-foreground">https://</span> tunnel link provided by your teacher.</p>
                </div>
              )}
              {gpsStatus === 'none' && (
                <div className="space-y-1">
                  <p className="text-destructive font-semibold">❌ No location available.</p>
                  <p>Both GPS and IP geolocation failed. Attendance can still be marked, but the geo-fence check will be skipped.</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 rounded-xl text-xs"
                onClick={e => { e.stopPropagation(); refreshGps(); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry Location
              </Button>
            </div>
          )}
        </div>

        {/* Security Indicators */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Live Security Guard
          </h2>
          <div className="space-y-2">
            <SecurityIndicator
              type="gps"
              active={gpsStatus === 'gps' || gpsStatus === 'ip'}
              label={GPS_LABEL[gpsStatus]}
            />
            <SecurityIndicator type="device" active={true} label="Hardware ID Verified" />
            <SecurityIndicator type="shield" active={true} label="Anti-Cheat Profile Active" />
          </div>
        </div>

        {/* Attendance History */}
        <div className="space-y-3">
          <div className="flex justify-between items-end pl-1">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Recent Check-ins
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">COUNT: {history.length}</span>
          </div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="space-y-2"
          >
            {history.length === 0 ? (
              <div className="text-center py-10 opacity-30 select-none">
                <Clock className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : history.map((item) => (
              <motion.div
                key={item.id}
                variants={listItem}
                className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:bg-white/50 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.course_name || "Course Session"}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {item.marked_at
                      ? new Date(item.marked_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </p>
                </div>
                <span className="text-xs font-bold text-success uppercase">Present</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
