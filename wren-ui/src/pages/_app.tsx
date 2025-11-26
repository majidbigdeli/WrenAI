import { AppProps } from 'next/app';
import Head from 'next/head';
import { Spin } from 'antd';
import posthog from 'posthog-js';
import apolloClient from '@/apollo/client';
import { GlobalConfigProvider } from '@/hooks/useGlobalConfig';
import { PostHogProvider } from 'posthog-js/react';
import { ApolloProvider } from '@apollo/client';
import { defaultIndicator } from '@/components/PageLoading';
import { useEffect } from 'react';
import { checkAuthentication } from '@/utils/checkAuthentication';

require('../styles/index.less');

Spin.setDefaultIndicator(defaultIndicator);

function App({ Component, pageProps }: AppProps) {

  useEffect(() => {
    // checkAuthentication()
  }, [])

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
