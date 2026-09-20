import { permanentRedirect } from 'next/navigation';

export default function BusinessTravelPage() {
  permanentRedirect('/login#business');
}
