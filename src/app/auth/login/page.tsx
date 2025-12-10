import LoginPage from '@/components/pages/LoginPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Asharvi',
  description: 'Login to access your parenting courses and track your progress',
};

export default function Login() {
  return <LoginPage />;
}
