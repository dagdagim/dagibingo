import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';
import { AdminAuditLog } from '@bingo/shared';
import { History, Shield, Terminal } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<AdminAuditLog[]>('/admin/audit-logs');
        setLogs(data);
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-white">Immutable Security Audit Trail</h1>
        <p className="text-xs text-arena-muted">Cryptographically tracked system actions, claims, and administrative operations</p>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border font-sans">
            <tr>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Actor</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Resource</th>
              <th className="py-3.5 px-4">IP / User Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50 text-[11px]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3 px-4 text-arena-subtle whitespace-nowrap">
                  {new Date(log.createdAt).toISOString()}
                </td>
                <td className="py-3 px-4 text-white font-bold">
                  {log.actorName}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-arena-primary/15 text-arena-primary-light font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-arena-muted">
                  {log.resource} {log.resourceId ? `(#${log.resourceId.substring(0, 8)})` : ''}
                </td>
                <td className="py-3 px-4 text-arena-subtle truncate max-w-xs">
                  {log.ipAddress || '127.0.0.1'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
