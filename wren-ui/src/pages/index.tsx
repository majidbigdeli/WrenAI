import { useWithOnboarding } from '@/hooks/useCheckOnboarding';
import PageLoading from '@/components/PageLoading';

export default function Index() {
  useWithOnboarding();//TODOSH

  return <PageLoading visible />;
}
