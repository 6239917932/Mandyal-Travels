import { permanentRedirect } from 'next/navigation';

export default function PartnersPage() {
  permanentRedirect('/login#partner');
}
