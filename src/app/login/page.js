import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'admin') redirect('/admin');
  return <LoginForm />;
}
