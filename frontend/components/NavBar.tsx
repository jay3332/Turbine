import Image from 'next/future/image';
import Link from 'next/link';
import styled from 'styled-components';

import useMediaQuery from "../hooks/useMediaQuery";
import TurbineLogo from '../public/turbine_logo.png';
import TurbineBanner from '../public/turbine_banner_adjusted.png';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  user-select: none;
  background-color: var(--color-bg-1);
  
  img {
    width: auto;
    height: 42px;
    padding-left: 8px;
  }
`;

export default function NavBar() {
  let isBreakpoint = useMediaQuery(768);

  return (
    <Container>
      <Link href="/">
        <a tabIndex={-1}>
          <Image src={isBreakpoint ? TurbineLogo : TurbineBanner} alt="Turbine" priority />
        </a>
      </Link>
    </Container>
  )
}
