import apolloClient from '@/apollo/client';
import { defaultIndicator } from '@/components/PageLoading';
import { GlobalConfigProvider } from '@/hooks/useGlobalConfig';
import { checkAuthentication } from '@/utils/checkAuthentication';
import { ApolloProvider } from '@apollo/client';
import { Spin } from 'antd';
import { AppProps } from 'next/app';
import Head from 'next/head';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

require('../styles/index.less');

Spin.setDefaultIndicator(defaultIndicator);

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    checkAuthentication();
  }, []);

  return (
    <>
      <Head>
        <title>دستیار مدیر</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <GlobalConfigProvider>
        <ApolloProvider client={apolloClient}>
          <PostHogProvider client={posthog}>
            <main className="app">
              <Component {...pageProps} />
            </main>
          </PostHogProvider>
        </ApolloProvider>
      </GlobalConfigProvider>
    </>
  );
}

export default App;
