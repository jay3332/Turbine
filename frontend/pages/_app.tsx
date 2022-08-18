import styled, { createGlobalStyle } from 'styled-components';
import type { AppProps } from 'next/app'
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Head from "next/head";
import Modal from "react-modal";
import { ToastContainer } from 'react-toastify';
import { useEffect } from "react";
import 'react-toastify/dist/ReactToastify.css';

const GlobalStyle = createGlobalStyle`
  :root {
    --font-sans-serif: -apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    --font-monospace: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
    Bitstream Vera Sans Mono, 'Courier New', monospace;

    --color-text: #ffffff;
    --color-text-filter: invert(100%) brightness(100%);
    --color-text-secondary: #858585;
    --color-text-tertiary: #666666;
    --color-link: #0dc2ff;
    --color-link-hover: #0df3ff;
    --color-bg-0: #0f0f0f;
    --color-bg-1: #1f1f20;
    --color-bg-2: #2e3034;
    --color-bg-3: #3f4044;
    --color-primary: #0d6aff;
    --color-primary-filter: invert(28%) sepia(94%) saturate(1641%) hue-rotate(206deg) brightness(101%) contrast(114%);
    --color-primary-blend: #1f59b6;
    --color-secondary: #d87a27;
    --color-secondary-blend: #c16617;
    --color-success: #54e868;
    --color-success-filter: invert(73%) sepia(77%) saturate(415%) hue-rotate(68deg) brightness(97%) contrast(87%);
    --color-success-blend: #43ba52;
    --color-error: #f53c45;
    --color-error-filter: invert(27%) sepia(95%) saturate(1768%) hue-rotate(337deg) brightness(100%) contrast(92%);
    --color-star: #fcb603;
    --color-star-filter: invert(59%) sepia(95%) saturate(900%) hue-rotate(3deg) brightness(108%) contrast(98%);
    --color-star-background: #e6a500;
  }

  .theme_light {
    --color-text: #000000;
    --color-text-filter: brightness(0%);
    --color-text-secondary: #858585;
    --color-text-tertiary: #b9b9b9;
    --color-link: #2288ff;
    --color-link-hover: #3cadff;
    --color-bg-0: #ffffff;
    --color-bg-1: #d3d3d3;
    --color-bg-2: #aaaaaa;
    --color-bg-3: #939393;
    --color-primary: #0d6aff;
    --color-primary-filter: invert(28%) sepia(94%) saturate(1641%) hue-rotate(206deg) brightness(101%) contrast(114%);
    --color-primary-blend: #5895f6;
    --color-secondary: #d87a27;
    --color-secondary-blend: #ed9f5b;
    --color-success: #2cc842;
    --color-success-filter: invert(78%) sepia(51%) saturate(3643%) hue-rotate(74deg) brightness(91%) contrast(82%);
    --color-success-blend: #43ba52;
    --color-error: #f53c45;
    --color-error-filter: invert(30%) sepia(89%) saturate(1236%) hue-rotate(328deg) brightness(98%) contrast(103%);
  }

  * {
    font-family: var(--font-sans-serif);
    color: var(--color-text);
  }

  code {
    font-family: var(--font-monospace);
  }

  html {
    position: relative;
    min-height: 100%;
  }

  body {
    background-color: var(--color-bg-0);
    width: 100vw;
    /* Leave room for the footer */
    padding-bottom: 70px;
    margin: 0;
    /* There should be no horizontal overflow, if there is then it is probably a bug. */
    overflow-x: hidden;

    @media screen and (max-width: 767px) {
      padding-bottom: 110px;
    }
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

const Toast = styled(ToastContainer).attrs({
  className: 'toast-container',
  toastClassName: 'toast',
})`
  .toast {
    background-color: var(--color-bg-1);
    color: var(--color-text);
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
          <meta property="og:image" content="https://cdn.lambdabot.cf/uploads/turbine_logo.png" />
          <meta property="theme-color" content="#0d6aff" />
          <link rel="icon" type="image/png" href="https://cdn.lambdabot.cf/uploads/turbine_logo.png" />
        </Head>
        <NavBar />
        <Component {...pageProps} />
        <Toast
          position="bottom-left"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Footer />
      </>
  )
}
