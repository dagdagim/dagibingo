import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { FileCheck, Check, X } from 'lucide-react';

interface KycRecordItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  status: string;
  createdAt: string;
}

export const AdminKycPage: React.FC = () => {
  const [records, setRecords] = useState<KycRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKyc = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<KycRecordItem[]>('/admin/kyc');
      setRecords(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, []);

  const handleReview = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    const reason = status === 'REJECTED' ? prompt('Reason for KYC rejection:') : undefined;
    try {
      await api.patch(`/admin/kyc/${id}`, { status, reason });
      fetchKyc();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-white">KYC Verifications</h1>
        <p className="text-xs text-arena-muted">Review submitted identity records for compliance & AML</p>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Document Type</th>
              <th className="py-3.5 px-4">Document #</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">{r.username}</div>
                  <div className="text-[11px] text-arena-subtle">{r.fullName || r.email}</div>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-arena-text">
                  {r.documentType}
                </td>
                <td className="py-3.5 px-4 font-mono text-white">
                  {r.documentNumber}
                </td>
                <td className="py-3.5 px-4 text-arena-subtle font-mono text-[11px]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant={r.status === 'VERIFIED' ? 'accent' : r.status === 'PENDING' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  {r.status === 'PENDING' ? (
                    <>
                      <Button
                        variant="accent"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleReview(r.id, 'VERIFIED')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<X className="w-3.5 h-3.5" />}
                        onClick={() => handleReview(r.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-arena-subtle italic">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
