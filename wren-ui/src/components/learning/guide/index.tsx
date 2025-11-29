import { useGetSettingsQuery } from '@/apollo/client/graphql/settings.generated';
import { useRouter } from 'next/router';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Dispatcher, DriverObj } from './utils';

import 'driver.js/dist/driver.css';

interface Props {}

interface Attributes {
  play: (id: string, dispatcher: Dispatcher) => void;
}
//TODOSH
export default forwardRef<Attributes, Props>(function Guide(_props, ref) {
  const router = useRouter();
  const $driver = useRef<DriverObj>(null);

  const { data: settingsResult } = useGetSettingsQuery();
  const storyPayload = useMemo(() => {
    return {
      sampleDataset: settingsResult?.settings?.dataSource.sampleDataset,
      language: settingsResult?.settings?.language,
    };
  }, [settingsResult?.settings]);

  // useEffect(() => {
  //   if ($driver.current !== null) return;
  //   $driver.current = driver();
  //   return () => {
  //     $driver.current.destroy();
  //     $driver.current = null;
  //   };
  // }, []);

  const play = (_: string, __: Dispatcher) => {
    //id: string, dispatcher: Dispatcher
    // const playStoryWithId = makeStoriesPlayer(
    //   $driver.current,
    //   router,
    //   storyPayload,
    // );
    // playStoryWithId(id, dispatcher);
  };

  useImperativeHandle(ref, () => ({ play }), [
    $driver.current,
    storyPayload,
    router,
  ]);

  return null;
});
