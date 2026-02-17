import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { Button, Input, Select, Badge, Modal, ConfirmDialog, Pagination, LoadingSpinner } from '../components/ui';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const roleColors: Record<string, 'blue' | 'green' | 'purple'> = {
  ADMIN: 'blue', FLEET_MANAGER: 'green', SERVICE_COMPANY: 'purple',
};

const defaultForm = { email: '', password: '', firstName: '', lastName: '', role: 'FLEET_MANAGER' };

export default function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useUsers({ page, limit: 20 });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Button onClick={() => setShowCreate(true)}><HiPlus className="mr-1" /> Add User</Button>
      </div>

      {isLoading ? <LoadingSpinner size="lg" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3"><Badge color={roleColors[u.role]}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setEditUser(u)} className="text-primary-600 hover:text-primary-800"><HiPencil /></button>
                      <button onClick={() => setDeleteId(u.id)} className="text-red-500 hover:text-red-700"><HiTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
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
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[{ value: 'ADMIN', label: 'Admin' }, { value: 'FLEET_MANAGER', label: 'Fleet Manager' }, { value: 'SERVICE_COMPANY', label: 'Service Company' }]} />
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
          <Select label="Role" value={editUser?.role || ''} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
            options={[{ value: 'ADMIN', label: 'Admin' }, { value: 'FLEET_MANAGER', label: 'Fleet Manager' }, { value: 'SERVICE_COMPANY', label: 'Service Company' }]} />
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
