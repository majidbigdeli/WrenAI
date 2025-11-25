import { useWithOnboarding } from '@/hooks/useCheckOnboarding';
import PageLoading from '@/components/PageLoading';
import { useEffect } from 'react';

export default function Index() {
  useWithOnboarding();//TODOSH

  return <PageLoading visible />;
}
