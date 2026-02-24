import React from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Visit } from '@/api/visits';
import { Clock, User } from 'lucide-react';

interface VisitCardProps {
  visit: Visit;
  onClick?: () => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{visit.visit_tracking_id}</h3>
          <Badge
            style={{
              backgroundColor: visit.current_stage.color,
              color: 'white'
            }}
          >
            {visit.current_stage.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {visit.patient.first_name} {visit.patient.last_name}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          MRN: {visit.patient.mrn}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(visit.created_at)}
        </div>
      </CardContent>
    </Card>
  );
};
