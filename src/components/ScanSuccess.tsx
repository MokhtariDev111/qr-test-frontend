import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ScanSuccessProps {
  visible: boolean;
  onDone: () => void;
  courseName?: string;
  distance?: number | null;
}

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 200 - 100,
  y: Math.random() * -150 - 50,
  rotate: Math.random() * 360,
  scale: Math.random() * 0.5 + 0.5,
  color: ["bg-success", "bg-primary", "bg-warning"][i % 3],
}));

const ScanSuccess = ({ visible, onDone, courseName = "Session", distance = null }: ScanSuccessProps) => {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (visible) {
      const timer = setTimeout(() => {
        setShow(false);
        onDone();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: p.x,
                y: p.y,
                scale: p.scale,
                rotate: p.rotate,
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`absolute h-2.5 w-2.5 rounded-full ${p.color}`}
              style={{ top: "50%", left: "50%" }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="confetti-glow glass-card flex flex-col items-center gap-4 rounded-3xl p-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CheckCircle2 className="h-20 w-20 text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">
              Attendance Recorded!
            </h2>
            <p className="text-muted-foreground">{courseName}</p>
            {distance !== null && distance !== undefined && (
              <p className="bg-primary/10 text-primary font-mono px-3 py-1 rounded-full text-xs animate-pulse">
                Distance: {distance} meters away
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScanSuccess;
