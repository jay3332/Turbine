import styled from 'styled-components'
import Image from 'next/future/image'
import GitHubIcon from '../public/icon-github.svg'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 18px 18px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  
  @media screen and (max-width: 767px) {
    flex-direction: column;
    justify-content: center;
  }
`;

const CreatedBy = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
  
  @media screen and (max-width: 767px) {
    text-align: center;
    padding-bottom: 8px;
  }
`;

const GrayLink = styled.a`
  font-weight: 700;
  color: var(--color-text-secondary);
  
  &:hover {
    color: var(--color-text);
  }
`;

const RepoLink = styled(Image)`
  width: 28px;
  height: auto;
  user-select: none;
  filter: var(--color-text-filter);
  opacity: 0.75;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
`

export default function Footer() {
  return (
    <Container>
      <CreatedBy>
        Turbine is a project by <GrayLink href="https://github.com/jay3332">jay3332</GrayLink> and contributors.
        <br />
        Licensed under <GrayLink href="https://github.com/jay3332/Turbine/blob/main/LICENSE">AGPL 3.0</GrayLink>.
      </CreatedBy>
      <a href="https://github.com/jay3332/Turbine">
        <RepoLink src={GitHubIcon} alt="View Source Code" />
      </a>
    </Container>
  )
}
