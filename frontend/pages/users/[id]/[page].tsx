import {GetServerSideProps} from "next";
import {getPastes, getStarredPastes, getUser, type PastePreview as PastePreviewType, type PastePreviewWithStar} from "../../../api/api";
import {getIp} from "../../[id]";
import {DEFAULT_AVATAR, User} from "../../../components/NavBar";
import Head from "next/head";
import Image from "next/future/image";
import styled from "styled-components";

import FileIcon from '../../../public/icon-file.svg';
import StarIcon from '../../../public/icon-star.svg';
import GithubIcon from '../../../public/icon-github.svg';
import CalendarIcon from '../../../public/icon-calendar.svg';
import CopyIcon from '../../../public/icon-copy.svg';
import {useCallback, useEffect, useState} from "react";
import {humanizeDuration} from "../../../components/PasteInterface";
import {toast} from "react-toastify";
import {useRouter} from "next/router";
import PastePreview from "../../../components/PastePreview";

export const getServerSideProps: GetServerSideProps = async ({ params, req: { connection, cookies, headers } }) => {
  const { id, page } = params! as { id: string, page?: string };
  const ip = getIp(connection, headers);
  const options = { cookies, headers: { 'x-real-ip': ip } };
  const [ userStatus, userData ] = await getUser(id, options);

  if (userStatus === 404) {
    return { notFound: true }
  }

  if (userStatus === 500) {
    // @ts-ignore
    throw new Error(`HTTP Internal Server Error encountered! Message: ${userData.message}`)
  }

  const [ status, pastesData ] = page === 'stars'
    ? await getStarredPastes(id, options)
    : await getPastes(id, options);

  if (status === 404) {
    return { notFound: true }
  }
  
  if (status === 500) {
    // @ts-ignore
    throw new Error(`HTTP Internal Server Error encountered! Message: ${pastesData.message}`)
  }
  
  return {
    props: { userData, pastesData },
  }
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 36px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const UserInfoSection = styled.div`
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  width: min(35vw, 400px);
  
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
  width: 22px;
  height: 22px;
  margin-right: 6px;
  user-select: none;
  filter: var(--color-text-filter);
  opacity: 0.5;
`;

const UserMiniStatValue = styled.span`
  color: var(--color-text-secondary);
  font-size: 18px;
  font-weight: 600;
`;

const UserMiniStatLabel = styled.span`
  color: var(--color-text-secondary);
  font-size: 18px;
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

const UserPastesSection = styled.div`
  display: flex;
  flex-direction: column;
  width: min(55vw, 750px);
  margin-left: 32px;
  
  @media (max-width: 768px) {
    width: 85vw;
    margin-left: 0;
  }
`;

const UserPastesHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SwitchPageButtons = styled.div`
  display: flex;
  margin: 8px 0;
`;

const SwitchPageButton = styled.button<{ active: boolean }>`
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  background: ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  cursor: pointer;
  font-size: 16px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? 'var(--color-primary)' : 'none'};
    border-color: var(--color-primary);
  }
`;

const SortBySelect = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
  background: none;
  border: 2px solid var(--color-bg-3);
  display: grid;
  grid-template-areas: "select";
  align-items: center;
  position: relative;
  margin-left: 4px;
  
  select,
  &::after {
    grid-area: select;
  }

  min-width: 15ch;
  max-width: 30ch;
  border-radius: 0.25em;
  padding: 0.25em 0.5em;
  cursor: pointer;
  line-height: 1.1;

  // Custom arrow
  &:not(.select--multiple)::after {
    content: "";
    justify-self: end;
    width: 0.8em;
    height: 0.5em;
    background-color: var(--color-bg-3);
    clip-path: polygon(100% 0%, 0 0%, 50% 100%);
  }
  
  select {
    transition: all 0.3s ease;
    appearance: none;
    background-color: transparent;
    border: none;
    padding: 0 1em 0 0;
    margin: 0;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
    cursor: inherit;
    line-height: inherit;
    z-index: 1;
    outline: none;
    
    &::-ms-expand {
      display: none;
    }
  }
  
  select:focus + .focus {
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border: 2px solid var(--color-primary);
    border-radius: inherit;
  }
`;

const PastesArea = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  
  @media (min-width: 768px) {
    overflow-y: auto;
  }
`;

type AnyPaste = PastePreviewType | PastePreviewWithStar;

export default function ViewUser({ userData, pastesData }: { userData: User, pastesData: AnyPaste[] }) {
  let [githubData, setGithubData] = useState<any>();
  let router = useRouter();
  let page = router.query.page as string || 'pastes';
  let [sortBy, setSortBy]= useState('last_modified');
  
  let sortFunction = useCallback(() => {
    if (sortBy === 'stars') {
      return (a: AnyPaste, b: AnyPaste) => {
        return b.stars - a.stars;
      }
    } else if (sortBy === 'views') {
      return (a: AnyPaste, b: AnyPaste) => {
        return b.views - a.views;
      }
    } else if (sortBy === 'alphabetical') {
      return (a: AnyPaste, b: AnyPaste) => {
        return a.name.localeCompare(b.name);
      }
    }
    return (a: AnyPaste, b: AnyPaste) => {
      return b.created_at - a.created_at;
    }
  }, [sortBy]);

  useEffect(() => {
    if (userData.github_id) {
      (async () => {
        let response = await fetch(`https://api.github.com/user/${userData.github_id}`);

        if (response.status === 200) {
          setGithubData(await response.json());
        }
      })();
    }
  }, [userData, router.query.id])

  return (
    <>
      <Head>
        <title>{`Turbine User: ${userData.username}`}</title>
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:title" content={`${userData.username} on Turbine`} />
        <meta property="og:description" content={`View the profile of ${userData.username} on Turbine Paste`} />
        <meta property="og:image" content={userData.avatar_url} />
      </Head>
      <Container>
        <UserInfoSection>
          <UserInfoHeader>
            <UserAvatar src={userData.avatar_url ?? DEFAULT_AVATAR} alt={userData.username} />
            <UserName>{userData.username}</UserName>
          </UserInfoHeader>
          <UserMiniStat>
            <UserMiniStatIcon src={CalendarIcon} alt="Creation Date" />
            <UserMiniStatLabel>Joined&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{humanizeDuration(Date.now() / 1000 - userData.created_at)}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;ago</UserMiniStatLabel>
          </UserMiniStat>
          <UserMiniStat>
            <UserMiniStatIcon src={FileIcon} alt="Pastes" />
            <UserMiniStatValue>{userData.paste_count}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;pastes</UserMiniStatLabel>
          </UserMiniStat>
          <UserMiniStat>
            <UserMiniStatIcon src={StarIcon} alt="Stars" />
            <UserMiniStatLabel>Received&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{userData.stars_received}</UserMiniStatValue>
            <UserMiniStatLabel>&nbsp;stars,&nbsp;</UserMiniStatLabel>
            <UserMiniStatValue>{userData.stars_given}</UserMiniStatValue>
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
        <UserPastesSection>
          <UserPastesHeader>
            <SwitchPageButtons>
              <SwitchPageButton active={page === 'pastes'} onClick={async () => await router.push(`/users/${userData.id}/pastes`)}>
                Pastes
              </SwitchPageButton>
              <SwitchPageButton active={page === 'stars'} onClick={async () => await router.push(`/users/${userData.id}/stars`)}>
                Stars
              </SwitchPageButton>
            </SwitchPageButtons>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                fontWeight: '600',
                color: 'var(--color-text-tertiary)',
              }}>
                Sort By:
              </span>
              <SortBySelect>
                <select onChange={(e) => setSortBy(e.currentTarget.value)}>
                  <option value="last_modified">Last Modified</option>
                  <option value="created_at">Creation Date</option>
                  <option value="stars">Stars</option>
                  <option value="views">Views</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
                <span className="focus" />
              </SortBySelect>
            </div>
          </UserPastesHeader>
          <PastesArea>
            {/* TODO: paginate this. definitely not scalable with many pastes */}
            {pastesData
              .sort(sortFunction())
              .map(paste => (
                <PastePreview data={paste} showAuthor={page === 'stars'} key={paste.id} />
              ))
            }
          </PastesArea>
        </UserPastesSection>
      </Container>
    </>
  )
}
