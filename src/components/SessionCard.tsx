import { motion } from "framer-motion";
import { Clock, Users, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SessionCardProps {
  id: number;
  title: string;
  course: string;
  time: string;
  students: number;
  totalStudents: number;
  isActive: boolean;
  gpsEnabled: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SessionCard = ({
  id: _id,
  title,
  course,
  time,
  students,
  totalStudents,
  isActive,
  gpsEnabled,
  onStart,
  onEnd,
  onEdit,
  onDelete,
}: SessionCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={`glass-card p-5 ${isActive ? "pulse-glow" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{course}</p>
        </div>
        <Badge
          variant={isActive ? "default" : "secondary"}
          className="rounded-full text-xs"
        >
          {isActive ? "Live" : "Scheduled"}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        {isActive ? (
          <Button variant="destructive" size="sm" onClick={onEnd} className="w-full">
            End Wait
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={onStart} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            Start Live Attendance
          </Button>
        )}
        {!isActive && onEdit && (
          <Button variant="outline" size="icon" onClick={onEdit} className="shrink-0">
             <span className="sr-only">Edit</span>
             ✏️
          </Button>
        )}
        {!isActive && onDelete && (
          <Button variant="outline" size="icon" onClick={onDelete} className="shrink-0 text-destructive hover:bg-destructive/10">
             <span className="sr-only">Delete</span>
             🗑️
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default SessionCard;
