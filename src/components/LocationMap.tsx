import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for missing default markers in bundled environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface StudentLocation {
  student_name: string;
  student_id: string | null;
  latitude: number;
  longitude: number;
  marked_at: string;
  distance_meters?: number;
  location_accuracy_meters?: number | null;
}

interface Props {
  teacherLat?: number | null;
  teacherLng?: number | null;
  students: StudentLocation[];
}

const teacherIcon = L.divIcon({
  className: '',
  html: `<div style="background:#6366f1;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🎓</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

const studentIcon = (name: string, accuracy?: number | null) => {
  // Color based on GPS accuracy: green = precise, yellow = medium, red = poor
  let bgColor = '#22c55e'; // green (good)
  if (accuracy && accuracy > 100) bgColor = '#eab308'; // yellow (medium)
  if (accuracy && accuracy > 500) bgColor = '#ef4444'; // red (poor/IP)
  
  return L.divIcon({
    className: '',
    html: `<div title="${name}" style="background:${bgColor};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">👤</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

export default function LocationMap({ teacherLat, teacherLng, students }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Init map
    const center: [number, number] =
      teacherLat && teacherLng
        ? [teacherLat, teacherLng]
        : students.length > 0
        ? [students[0].latitude, students[0].longitude]
        : [36.7528, 3.0420]; // Algiers default

    if (leafletMap.current) {
      leafletMap.current.remove();
    }

    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 17);
    leafletMap.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);

    // Teacher marker
    if (teacherLat && teacherLng) {
      L.marker([teacherLat, teacherLng], { icon: teacherIcon })
        .addTo(map)
        .bindPopup('<b>📍 Teacher (Classroom)</b><br>QR was issued from this location')
        .openPopup();

      // 50m radius circle
      L.circle([teacherLat, teacherLng], {
        radius: 50,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);
    }

    // Student markers
    students.forEach(s => {
      const time = s.marked_at ? new Date(s.marked_at).toLocaleTimeString([], { timeStyle: 'short' }) : '–';
      const distStr = s.distance_meters !== undefined ? `<br>Distance: <b>${s.distance_meters}m</b>` : '';
      const accStr = s.location_accuracy_meters ? `<br>GPS Accuracy: <b>${s.location_accuracy_meters}m</b>` : '';
      const accLabel = s.location_accuracy_meters 
        ? (s.location_accuracy_meters <= 50 ? '🟢 Precise' : s.location_accuracy_meters <= 200 ? '🟡 Medium' : '🔴 Poor')
        : '';
      
      L.marker([s.latitude, s.longitude], { icon: studentIcon(s.student_name, s.location_accuracy_meters) })
        .addTo(map)
        .bindPopup(
          `<b>${s.student_name}</b> ${accLabel}<br>ID: ${s.student_id || 'N/A'}<br>Marked at: ${time}${distStr}${accStr}`
        );
      
      // Draw accuracy circle if available
      if (s.location_accuracy_meters && s.location_accuracy_meters < 500) {
        L.circle([s.latitude, s.longitude], {
          radius: s.location_accuracy_meters,
          color: s.location_accuracy_meters <= 50 ? '#22c55e' : '#eab308',
          fillColor: s.location_accuracy_meters <= 50 ? '#22c55e' : '#eab308',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }
    });

    // Fit all markers
    const allPoints: [number, number][] = [];
    if (teacherLat && teacherLng) allPoints.push([teacherLat, teacherLng]);
    students.forEach(s => allPoints.push([s.latitude, s.longitude]));
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [teacherLat, teacherLng, students]);

  return (
    <div
      ref={mapRef}
      style={{ height: '360px', width: '100%', borderRadius: '1rem', overflow: 'hidden', zIndex: 0 }}
    />
  );
}
