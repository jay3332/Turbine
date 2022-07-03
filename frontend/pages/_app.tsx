import { createGlobalStyle } from 'styled-components';
import type { AppProps } from 'next/app'

const GlobalStyle = createGlobalStyle`
  :root {
    --font-sans-serif: -apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, Oxygen,
      Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    --font-monospace: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
      Bitstream Vera Sans Mono, 'Courier New', monospace;
    
    --color-text: #ffffff;
    --color-link: #0dc2ff;
    --color-link-hover: #0df3ff;
    --color-bg-0: #0f0f0f;
    --color-bg-1: #1f1f20;
    --color-bg-2: #2e3034;
    --color-bg-3: #3f4044;
    --color-primary: #0d6aff;
    --color-primary-blend: #1f59b6;
    --color-secondary: #d87a27;
    --color-secondary-blend: #c16617;
    --color-success: #2fe747;
    --color-error: #f53c45;
  }
  
  * {
    font-family: var(--font-sans-serif);
    color: var(--color-text);
  }
  
  code {
    font-family: var(--font-monospace);
  }
  
  body {
    background-color: var(--color-bg-0);
    width: 100vw;
    margin: 0;
    /* There should be no horizontal overflow, if there is then it is probably a bug. */
    overflow-x: hidden;
  }
  
  a {
    color: var(--color-link);
    transition: color 0.3s ease;
    cursor: pointer;
    text-decoration: none;
  }
  
  a:hover {
    color: var(--color-link-hover);
  }
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
      <>
        <GlobalStyle />
        <Component {...pageProps} />
      </>
  )
}
