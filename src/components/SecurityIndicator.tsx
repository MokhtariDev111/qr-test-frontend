import { motion } from "framer-motion";
import { MapPin, Smartphone, Shield } from "lucide-react";

interface SecurityIndicatorProps {
  type: "gps" | "device" | "shield";
  active: boolean;
  label: string;
}

const icons = {
  gps: MapPin,
  device: Smartphone,
  shield: Shield,
};

const SecurityIndicator = ({ type, active, label }: SecurityIndicatorProps) => {
  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="security-indicator"
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`indicator-live ${
            active ? "bg-success" : "bg-destructive"
          }`}
        />
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={`ml-auto text-xs font-semibold ${
          active ? "text-success" : "text-destructive"
        }`}
      >
        {active ? "Active" : "Off"}
      </span>
    </motion.div>
  );
};

export default SecurityIndicator;
