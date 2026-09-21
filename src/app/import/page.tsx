import { redirect } from 'next/navigation';

/** Everything moved into the one drop box on /upload. */
export default function ImportPage() {
  redirect('/upload');
}
