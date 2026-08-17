import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { AdminUserListItem } from '@bingo/shared';
import { Search } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ users: AdminUserListItem[]; total: number }>(
        `/admin/users?search=${search}`
      );
      setUsers(res.users);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">User Directory</h1>
          <p className="text-xs text-arena-muted">Inspect user records, KYC status, and security states</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
          <input
            type="text"
            placeholder="Search username, email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-arena-surface border border-arena-border rounded-xl pl-10 pr-4 py-2 text-xs text-arena-text focus:outline-none focus:border-arena-primary"
          />
        </div>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">KYC State</th>
              <th className="py-3.5 px-4">Games (Won / Total)</th>
              <th className="py-3.5 px-4">Risk Level</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">{u.username}</div>
                  <div className="text-[11px] text-arena-subtle">{u.email}</div>
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.role === 'ADMIN' ? 'primary' : 'neutral'} size="sm">
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.kycStatus === 'VERIFIED' ? 'accent' : 'warning'} size="sm">
                    {u.kycStatus}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="text-arena-accent font-bold">{u.gamesWon}</span> / {u.gamesPlayed}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.riskScore === 'HIGH' ? 'danger' : 'neutral'} size="sm">
                    {u.riskScore}
                  </Badge>
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.isActive ? 'accent' : 'danger'} size="sm">
                    {u.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    variant={u.isActive ? 'outline' : 'accent'}
                    size="sm"
                    onClick={() => handleToggleStatus(u.id, u.isActive)}
                  >
                    {u.isActive ? 'Suspend' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
