import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { Button, Input, Select, Badge, Modal, ConfirmDialog, Pagination, LoadingSpinner, Table } from '../components/ui';
import type { User } from '../api/users';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi2';
import type { Semantic } from '../theme/status';
import toast from 'react-hot-toast';

const roleTone: Record<string, Semantic> = {
  ADMIN: 'info', FLEET_MANAGER: 'success', SERVICE_COMPANY: 'neutral',
};

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FLEET_MANAGER', label: 'Fleet Manager' },
  { value: 'SERVICE_COMPANY', label: 'Service Company' },
];

const defaultForm = { email: '', password: '', firstName: '', lastName: '', role: 'FLEET_MANAGER' };

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: '', className: 'text-right' },
];
const TEMPLATE = 'minmax(160px,1fr) minmax(200px,1.4fr) 150px 120px 80px';

export default function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading, isFetching } = useUsers({ page, limit: 20 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser.mutateAsync(form);
      toast.success('User created');
      setShowCreate(false);
      setForm(defaultForm);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, password, passwordHash, createdAt, updatedAt, lastLoginAt, ...data } = editUser;
      await updateUser.mutateAsync({ id, data });
      toast.success('User updated');
      setEditUser(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUser.mutateAsync(deleteId);
      toast.success('User deactivated');
      setDeleteId(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">User Management</h1>
          <p className="font-mono text-xs text-ink-faint">Accounts, roles &amp; access control</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Updating…</span>}
          <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
            <HiPlus /> Add User
          </Button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <Table<User>
            columns={COLUMNS}
            template={TEMPLATE}
            rows={data?.data ?? []}
            emptyMessage="No users found."
            renderCell={(u, key) => {
              switch (key) {
                case 'name':
                  return <span className="text-sm font-semibold text-ink">{u.firstName} {u.lastName}</span>;
                case 'email':
                  return <span className="font-mono text-xs text-ink-muted">{u.email}</span>;
                case 'role':
                  return <Badge tone={roleTone[u.role] ?? 'neutral'}>{u.role}</Badge>;
                case 'status':
                  return <Badge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>;
                case 'actions':
                  return (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditUser(u)}
                        className="rounded-control p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-primary-600"
                        aria-label="Edit user"
                      >
                        <HiPencil />
                      </button>
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="rounded-control p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-danger"
                        aria-label="Deactivate user"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  );
                default:
                  return null;
              }
            }}
          />
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-ink-faint">{data.pagination.total} users</p>
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={roleOptions} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createUser.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editUser?.firstName || ''} onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })} />
            <Input label="Last Name" value={editUser?.lastName || ''} onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={editUser?.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
          <Select label="Role" value={editUser?.role || ''} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} options={roleOptions} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="submit" isLoading={updateUser.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Deactivate User" message="This will deactivate the user account." variant="danger" />
    </div>
  );
}
