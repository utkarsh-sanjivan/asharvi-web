import WelcomePage from '@/components/pages/WelcomePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome - Asharvi',
  description: 'Welcome to Asharvi - Start your parenting journey',
};

export default function Welcome() {
  return <WelcomePage />;
}
