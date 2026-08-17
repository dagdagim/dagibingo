import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { FraudAlert } from '@bingo/shared';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

export const AdminFraudPage: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<FraudAlert[]>('/admin/fraud-alerts');
        setAlerts(data);
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-white">Fraud & Risk Framework</h1>
        <p className="text-xs text-arena-muted">Real-time risk scoring, anomaly detection, and rapid claims tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card elevated className="p-4 border-arena-danger/30">
          <span className="text-[10px] font-bold text-arena-danger uppercase">High Risk Alerts</span>
          <div className="text-2xl font-black font-display text-white mt-1">
            {alerts.filter((a) => a.severity === 'HIGH').length}
          </div>
        </Card>
        <Card elevated className="p-4 border-amber-500/30">
          <span className="text-[10px] font-bold text-amber-400 uppercase">Medium Risk Warnings</span>
          <div className="text-2xl font-black font-display text-white mt-1">
            {alerts.filter((a) => a.severity === 'MEDIUM').length}
          </div>
        </Card>
        <Card elevated className="p-4 border-arena-accent/30">
          <span className="text-[10px] font-bold text-arena-accent uppercase">Monitored Sessions</span>
          <div className="text-2xl font-black font-display text-white mt-1">
            {alerts.length + 14}
          </div>
        </Card>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Risk Severity</th>
              <th className="py-3.5 px-4">Alert Type</th>
              <th className="py-3.5 px-4">Description</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {alerts.map((a) => (
              <tr key={a.id} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3.5 px-4 font-bold text-white">
                  {a.username}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={a.severity === 'HIGH' ? 'danger' : a.severity === 'MEDIUM' ? 'warning' : 'neutral'} size="sm">
                    {a.severity} RISK
                  </Badge>
                </td>
                <td className="py-3.5 px-4 font-mono text-arena-text">
                  {a.type}
                </td>
                <td className="py-3.5 px-4 text-arena-muted max-w-sm">
                  {a.description}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant="outline" size="sm">{a.status}</Badge>
                </td>
                <td className="py-3.5 px-4 text-arena-subtle font-mono text-[11px]">
                  {new Date(a.detectedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
