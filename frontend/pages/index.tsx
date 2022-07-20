import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from "next/router";
import styled, { keyframes } from 'styled-components'

import NewIcon from '../public/icon-plus.svg';
import GlobeIcon from '../public/icon-earth.svg';
import {useEffect} from "react";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Banner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: max(24px, 8vh) 0 24px 0;
`;

const Animation = keyframes`
  to {
    background-position: 200% center;
  }
`;

// noinspection CssInvalidPropertyValue
const TurbineText = styled.div`
  text-align: center;
  font-weight: 800;
  font-size: min(22vw, 180px);
  padding: 12px;
  background: linear-gradient(
    to right,
    #0d6aff 0%,
    #0dffe4 25%,
    #ff9e00 65%,
    #ff0d7b 82.5%,
    #0d6aff 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  text-fill-color: transparent;
  -webkit-text-fill-color: transparent;
  animation: ${Animation} 7s cubic-bezier(0.73, 0.04, 0.56, 0.93) infinite;
`;

const Description = styled.div`
  text-align: center;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 18px;
  margin: 0 12px;
`;

const Buttons = styled.div`
  margin: 18px;
  display: flex;
  
  @media screen and (max-width: 767px) {
    flex-direction: column;
    align-items: center;
    
    button {
      width: 60vw;
      margin: 8px;
    }
  }
`;

const Hint = styled.div`
  user-select: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  
  kbd {
    padding: 2px 5px;
    border: var(--color-bg-3) 2px solid;
    border-radius: 4px;
    color: var(--color-text);
    line-height: 1em;
  }
  
  @media screen and (max-width: 767px) {
    display: none;
  }
`;

const BaseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  transition: all 0.3s ease;
  border-radius: 4px;
  margin: 4px 8px;
  font-size: 18px;
  font-weight: 600;
  user-select: none;
  cursor: pointer;
  
  img {
    margin: 6px 8px 6px 4px;
    width: 18px;
    height: 18px;
  }
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const NewPasteButton = styled(BaseButton)`
  background-color: var(--color-primary);
  border: var(--color-primary) 2px solid;
  color: var(--color-text);
  
  img {
    filter: var(--color-text-filter);
  }
  
  &:hover {
    background-color: var(--color-primary-blend);
    border-color: var(--color-primary-blend);
  }
`;

const DiscoverPastesButton = styled(BaseButton)`
  background-color: transparent;
  border: var(--color-success) 2px solid;
  color: var(--color-success);
  
  img {
    filter: var(--color-success-filter);
  }
  
  &:hover {
    color: var(--color-text);
    background-color: var(--color-success-blend);
    border-color: transparent;
    
    img {
      filter: var(--color-text-filter);
    }
  }
`;

const Home: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    document.addEventListener("keydown", async (event) => {
      if (event.key.toLowerCase() === 'n') {
        await router.push("/new");
      }
    })
  }, [router])

  return (
    <Container>
      <Head>
        <title>Turbine: Home</title>
        <meta property="og:title" content="Turbine" />
        <meta property="og:site_name" content="Turbine: Homepage" />
        <meta property="og:description" content="A modern and open-source pastebin service." />
      </Head>
      <Banner>
        <TurbineText>Turbine</TurbineText>
        <Description>
          The modern and open-source pastebin service
        </Description>
      </Banner>
      <Buttons>
        <Link href="/new">
          <a>
            <NewPasteButton tabIndex={-1}>
              <Image src={NewIcon} alt="New" />
              New Paste
            </NewPasteButton>
          </a>
        </Link>
        <Link href="/discover">
          <a>
            <DiscoverPastesButton tabIndex={-1}>
              <Image src={GlobeIcon} alt="Globe" />
              Discover Pastes
            </DiscoverPastesButton>
          </a>
        </Link>
      </Buttons>
      <Hint>
        Alternatively, press <kbd>N</kbd> to create a new paste
      </Hint>
    </Container>
  )
}

export default Home
