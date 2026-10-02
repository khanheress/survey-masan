import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import AdminShell from '@/components/AdminShell';

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') redirect('/login');
  return <AdminShell>{children}</AdminShell>;
}
