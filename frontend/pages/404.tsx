// noinspection CssInvalidPropertyValue

import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import styled, { keyframes } from 'styled-components';

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  user-select: none;
`;

const Animation = keyframes`
  to {
    background-position: 200% center;
  }
`;

type MainProps = { background: string };

export const Main = styled.div<MainProps>`
  font-size: min(200px, 32vw);
  font-weight: 800;
  animation: ${Animation} 2s ease-in-out;
  background: ${props => props.background};
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  text-fill-color: transparent;
  -webkit-text-fill-color: transparent;
`;

export const BottomText = styled.div`
  font-size: 36px;
  font-weight: 600;
  opacity: 0.5;
  padding: 16px;
`;

export const BackToHome = styled.button`
  border: var(--color-text) 2px solid;
  border-radius: 6px;
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text);
  opacity: 0.4;
  background-color: transparent;
  padding: 10px;
  margin: 18px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
    color: var(--color-bg-3);
    background-color: var(--color-text);
  }
`;

const NotFound: NextPage = () => {
  return (
    <>
      <Head>
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:title" content="404 Not Found!" />
        <meta property="og:description" content="Turbine is a modern and open-source pastebin service." />
        <title>Turbine: Page Not Found</title>
      </Head>
      <Container>
        <Main background={
          "linear-gradient(to right, #7cff79 0%, #00ffcd 25%, #00a8ff 50%, #00ffcd 75%, #7cff79 100%)"
        }>
          404
        </Main>
        <BottomText>Not Found!</BottomText>
        <Link href="/">
          <BackToHome>Back to Home</BackToHome>
        </Link>
      </Container>
    </>
  )
}

export default NotFound
