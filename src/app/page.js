import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import LandingPage from '@/components/LandingPage';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'admin') redirect('/admin');
  return <LandingPage />;
}
