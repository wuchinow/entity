import { redirect } from 'next/navigation';

export default function HomePage() {
  // Server-side redirect to avoid hydration issues
  redirect('/gallery');
}
