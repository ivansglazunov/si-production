import '../styles/globals.css'
import Head from 'next/head'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Science Gothic';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('${basePath}/fonts/ScienceGothic-Regular.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Science Gothic';
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url('${basePath}/fonts/ScienceGothic-Bold.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Izvod';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('${basePath}/fonts/Izvod.otf') format('opentype');
          }
          @font-face {
            font-family: 'Slovic';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('${basePath}/fonts/Slovic_Demo-Serif.otf') format('opentype');
          }
        `}} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

