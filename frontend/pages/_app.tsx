import { createGlobalStyle } from 'styled-components';
import type { AppProps } from 'next/app'
import NavBar from "../components/NavBar";
import Head from "next/head";
import Modal from "react-modal";
import {useEffect} from "react";

const GlobalStyle = createGlobalStyle`
  :root {
    --font-sans-serif: -apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, Oxygen,
      Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    --font-monospace: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
      Bitstream Vera Sans Mono, 'Courier New', monospace;

    --color-text: #ffffff;
    --color-text-secondary: #858585;
    --color-text-tertiary: #666666;
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
    --color-success: #54e868;
    --color-success-blend: #43ba52;
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
  
  .ace_autocomplete {
    border-radius: 2px;
    
    * {
      font-family: var(--font-monospace);
    }
    
    .ace_line-hover {
      transition: all 0.2s ease;
    }
    
    span.ace_completion-meta {
      font-weight: 500;
      font-style: italic;
      opacity: 0.3;
      user-select: none;
    }
  }
  
  .ace_tooltip {
    font-family: var(--font-monospace);
    background-color: var(--color-bg-2);
    border: var(--color-bg-3) 2px solid;
    border-radius: 2px;
    padding: 6px;
    font-size: 0.85em;
    transition: all 0.3s ease;
    
    b {
      font-family: var(--font-sans-serif);
      font-weight: 500;
    }
    
    hr {
      opacity: 0.2;
    }
    
    &, * {
      color: var(--color-text);
    }
    
    .ace_search {
      background-color: var(--color-bg-2) !important;
      border: none;
    }
  }
  
  .ReactModal__Content {
    top: 50% !important;
    left: 50% !important;
    right: initial !important;
    bottom: initial !important;
    margin-right: -50%;
    transform: translate(-50%, -50%);
    border-radius: 6px !important;
    padding: 32px !important;
    background-color: var(--color-bg-1) !important;
    z-index: 1000001 !important;
    border: none !important;
    display: flex;
    flex-direction: column;
    max-width: 75vw;
    max-height: 75vh;
    overflow-y: auto;
  }
  
  .ReactModal__Overlay {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    z-index: 1000000 !important;
  }
  
  .ReactModal__Overlay--after-open {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(3px);
  }
  
  .ReactModal__Overlay--before-close {
    opacity: 0;
  }
`;

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    Modal.setAppElement('#__next');
  }, []);

  return (
      <>
        <GlobalStyle />
        <Head>
          <title>Turbine</title>
          <meta property="og:title" content="Turbine" />
          <meta property="og:site_name" content="Turbine" />
          <meta property="og:image" content="https://cdn.lambdabot.cf/uploads/turbine_logo.png" />
          <meta property="og:description" content="A modern and open-source pastebin service." />
          <meta property="theme-color" content="#0d6aff" />
          <link rel="icon" type="image/png" href="https://cdn.lambdabot.cf/uploads/turbine_logo.png" />
        </Head>
        <NavBar />
        <Component {...pageProps} />
      </>
  )
}
