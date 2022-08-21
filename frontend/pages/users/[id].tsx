import {GetServerSideProps} from "next";
import {getUser} from "../../api/api";
import {getIp} from "../[id]";
import {DEFAULT_AVATAR, User} from "../../components/NavBar";
import Head from "next/head";
import Image from "next/future/image";
import styled from "styled-components";

import FileIcon from '../../public/icon-file.svg';
import StarIcon from '../../public/icon-star.svg';
import GithubIcon from '../../public/icon-github.svg';
import CalendarIcon from '../../public/icon-calendar.svg';
import CopyIcon from '../../public/icon-copy.svg';
import {useEffect, useState} from "react";
import {humanizeDuration} from "../../components/PasteInterface";
import {toast} from "react-toastify";

export const getServerSideProps: GetServerSideProps = async ({ params, req: { connection, cookies, headers } }) => {
  const { id } = params! as { id: string };
  const ip = getIp(connection, headers);
  // @ts-ignore
  const [ status, data ] = await getUser(id, { cookies, headers: { 'x-real-ip': ip } });

  if (status === 404) {
    return { notFound: true }
  }

  if (status === 500) {
    // @ts-ignore
    throw new Error(`HTTP Internal Server Error encountered! Message: ${data.message}`)
  }

  return {
    props: { data },
  }
}

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const UserInfoSection = styled.div`
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  width: min(40vw, 400px);
  
  @media (max-width: 768px) {
    width: 85vw;
    align-items: center;
  }
`;

const UserInfoHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
`;

const UserName = styled.span`
  font-size: 36px;
  font-weight: 600;
  margin-left: 16px;
`;

const UserAvatar = styled.img`
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: 4px solid var(--color-bg-1);
  transition: all 0.4s ease;
  
  &:hover {
    border-radius: 25%;
    border: 4px solid var(--color-primary);
  }
`;

const UserMiniStat = styled.div`
  display: flex;
  margin: 6px 0;
`;

const UserMiniStatIcon = styled(Image)`
  width: 24px;
  height: 24px;
  margin-right: 6px;
  user-select: none;
  filter: var(--color-text-filter);
  opacity: 0.5;
`;

const UserMiniStatValue = styled.span`
  color: var(--color-text-secondary);
  font-size: 20px;
  font-weight: 600;
`;

const UserMiniStatLabel = styled.span`
  color: var(--color-text-secondary);
  font-size: 20px;
`;

const Connection = styled.button<{ color: string, borderColor: string, background: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: ${props => props.borderColor} 2px solid;
  border-radius: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: ${props => props.background};
  
  span {
    color: ${props => props.color};
  }
  
  &:hover {
    border-color: var(--color-primary);
  }
`;

const CopyLinkButton = styled(Connection)`
  border: none;
  background: linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) 50%, var(--color-primary-gradient) 100%);
  background-size: 200%;
  padding: 14px;
  
  &:hover {
    background-position: right center;
  }
`;

const ConnectionIcon = styled(Image)`
  width: 18px;
  height: 18px;
  margin-right: 8px;
`;

const ConnectionLabel = styled.span`
  font-size: 16px;
  font-weight: 500;
`;


export default function ViewUser({ data }: { data: User }) {
  let [githubData, setGithubData] = useState<any>();

  useEffect(() => {
    (async () => {
      if (data.github_id) {
        let response = await fetch(`https://api.github.com/user/${data.github_id}`);

        if (response.status === 200) {
          setGithubData(await response.json());
        }
      }
    })()
  }, [data])

  return (
    <>
      <Head>
        <title>{`Turbine User: ${data.username}`}</title>
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:title" content={`${data.username} on Turbine`} />
        <meta property="og:description" content={`View the profile of ${data.username} on Turbine Paste`} />
        <meta property="og:image" content={data.avatar_url} />
      </Head>
      <Container>
        <UserInfoSection>
          <UserInfoHeader>
            <UserAvatar src={data.avatar_url ?? DEFAULT_AVATAR} alt={data.username} />
            <UserName>{data.username}</UserName>
          </UserInfoHeader>
          <UserMiniStat>
            <UserMiniStatIcon src={CalendarIcon} alt="Creation Date" />
            <UserMiniStatLabel>Joined&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{humanizeDuration(Date.now() / 1000 - data.created_at)}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;ago</UserMiniStatLabel>
          </UserMiniStat>
          <UserMiniStat>
            <UserMiniStatIcon src={FileIcon} alt="Pastes" />
            <UserMiniStatValue>{data.paste_count}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;pastes</UserMiniStatLabel>
          </UserMiniStat>
          <UserMiniStat>
            <UserMiniStatIcon src={StarIcon} alt="Stars" />
            <UserMiniStatLabel>Received&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{data.stars_received}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;stars,&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{data.stars_given}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;given</UserMiniStatLabel>
          </UserMiniStat>
          <br />
          {/* TODO: add GitHub connection from this UI */}
          {githubData && (
            <Connection
              borderColor={'var(--color-text)'}
              background={'transparent'}
              color={'var(--color-text)'}
              onClick={() => window.open(githubData.html_url, '_blank')}
            >
              <ConnectionIcon src={GithubIcon} alt="GitHub account" style={{ filter: 'var(--color-text-filter)' }} />
              <ConnectionLabel>{githubData.login}</ConnectionLabel>
            </Connection>
          )}
          <CopyLinkButton
            borderColor={'var(--color-primary)'}
            background={'var(--color-primary)'}
            color={'var(--color-text)'}
            onClick={async () => {
              await window.navigator.clipboard.writeText(window.location.origin + window.location.pathname);
              toast.success('Copied link to clipboard!');
            }}
          >
            <ConnectionIcon src={CopyIcon} alt="Copy Link" style={{ filter: 'var(--color-text-filter)' }} />
            <ConnectionLabel>Copy Link to Profile</ConnectionLabel>
          </CopyLinkButton>
        </UserInfoSection>
      </Container>
    </>
  )
}
