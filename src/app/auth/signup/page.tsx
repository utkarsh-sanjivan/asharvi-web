import SignupPage from '@/components/pages/SignupPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Asharvi',
  description: 'Join Asharvi and start your parenting journey with expert-led courses',
};

export default function Signup() {
  return <SignupPage />;
}
