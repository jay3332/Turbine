import Image from 'next/future/image';
import Link from 'next/link';
import styled from 'styled-components';
import {InputHTMLAttributes, useRef, useState} from 'react';

import useMediaQuery from "../hooks/useMediaQuery";
import useCookie from "../hooks/useCookie";
import TurbineLogo from '../public/turbine_logo.png';
import TurbineBanner from '../public/turbine_banner_adjusted.png';
import {getMe, login, register} from "../api/api";
import Modal from "./Modal";
import GithubIcon from '../public/icon-github.svg';
import Cookies from 'js-cookie';

const GITHUB_OAUTH_URL = process.env.NODE_ENV === 'production'
  ? 'https://github.com/login/oauth/authorize?client_id=a621caa00eb332598d2f&redirect_uri=https://paste.bobobot.cf/authorize/github&scope=read:user+user:email'
  : 'https://github.com/login/oauth/authorize?client_id=88043268409739ef49c6&redirect_uri=http://localhost:3000/authorize/github&scope=read:user+user:email';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  user-select: none;
  background-color: var(--color-bg-1);
`;

const TurbineBannerStyle = styled(Image)`
  width: auto;
  height: 42px;
  padding-left: 8px;
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  background-color: var(--color-bg-2);
  border: none;
  border-radius: 4px;
  padding: 12px 16px;
  margin-right: 12px;
  font-size: 16px;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  
  &:hover {
    background-color: var(--color-bg-3);
  }
`;

const ModalHeader = styled.h1`
  text-align: center;
`;

const ModalContainer = styled.div`
  box-sizing: border-box;
  width: min(85vw, 400px);
`;

const FormInputStyle = styled.input`
  font-weight: 500;
  background-color: var(--color-bg-2);
  border: var(--color-bg-2) 2px solid;
  border-radius: 4px;
  padding: 12px;
  font-size: 16px;
  margin: 6px 0;
  box-sizing: border-box;
  width: 100%;
  transition: all 0.4s ease-in-out;
  
  &:hover {
    border-color: var(--color-bg-3);
  }
  
  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }
  
  &::placeholder {
    opacity: 0.3;
  }
`;

const FormLabel = styled.label<{ active: boolean }>`
  font-size: 16px;
  font-weight: 600;
  padding: 6px 0;
  text-align: center;
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text-tertiary)'};
  transition: all 0.4s ease-in-out;
  display: inline-grid;
  box-sizing: border-box;
  width: 100%;
`;

const SubmitButton = styled.input<{ valid: boolean }>`
  font-weight: 500;
  background: ${props => props.valid
    ? 'linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) 50%, var(--color-primary-gradient) 100%)'
    : 'var(--color-primary-blend)'};
  background-size: 200% auto;
  border: none;
  border-radius: 4px;
  padding: 12px 16px;
  margin-top: 12px;
  font-size: 16px;
  transition: all ${props => props.valid ? "1s cubic-bezier(.07, .91, .41, .95)" : "0.4s ease"};
  cursor: ${props => props.valid ? "pointer" : "not-allowed"};
  box-sizing: border-box;
  width: 100%;
  opacity: ${props => props.valid ? 1 : 0.5};

  &:hover, &:focus {
    background: ${props => props.valid ? '' : 'var(--color-primary)'};
    // noinspection CssReplaceWithShorthandSafely
    background-position: right center;
  }
`;

const ErrorMessage = styled.div`
  display: grid;
  padding: 8px 0;
  font-size: 16px;
  color: var(--color-error);
  text-align: center;
`;

const SignInWithButton = styled.button<{ color: string, borderColor: string, background: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0;
  border: ${props => props.borderColor} 2px solid;
  border-radius: 4px;
  box-sizing: border-box;
  width: 100%;
  padding: 12px;
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

const SignInWithButtonIcon = styled(Image)`
  width: 18px;
  height: 18px;
  margin-right: 8px;
`;

const SignInWithButtonText = styled.span`
  font-size: 16px;
  font-weight: 500;
`;

const UserMenu = styled.div`
  display: none;
  position: absolute;
  background-color: var(--color-bg-1);
  box-sizing: border-box;
  min-width: 100%;
  z-index: 1;
`;

const UserInfoContainer = styled.div`
  box-sizing: border-box;
  height: 100%;
  float: right;
  overflow: hidden;
  
  &:hover ${UserMenu} {
    display: block;
  }
`;

const UserMenuItem = styled.div<{ color?: string }>`
  float: none;
  padding: 12px 16px;
  display: block;
  text-align: left;
  transition: all 0.3s ease-in-out;
  cursor: pointer;
  color: ${props => props.color ? props.color : 'var(--color-text)'};
  
  &:hover {
    background-color: var(--color-bg-2);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  box-sizing: border-box;
  cursor: pointer;
  height: 100%;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: var(--color-bg-2);
  }
`;

const UserAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transition: all 0.3s ease;
  
  &:hover {
    border-radius: 25%;
  }
`;

const UserName = styled.span`
  font-size: 18px;
  font-weight: 500;
  margin-left: 8px;
  color: var(--color-text-secondary);
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
  avatar_url?: string;
  github_id?: number;
}

export function FormInput({ label, name, ...props }: InputHTMLAttributes<any> & { label: string }) {
  let [active, setActive] = useState(false);

  return (
    <>
      <FormLabel htmlFor={name} active={active}>{label}</FormLabel>
      <FormInputStyle
        name={name}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        {...props}
      />
    </>
  )
}

type Page = 'login' | 'register' | 'register/github';

type LoginProps = {
  setUserData: (userData: User) => void,
  setToken: (token: string) => void,
  setPage: (page: Page) => void,
};

export function LoginModal({ setUserData, setToken, setPage }: LoginProps) {
  let [error, setError] = useState<string>();
  let [valid, setValid] = useState(false);
  let form = useRef<HTMLFormElement>(null);

  return (
    <ModalContainer>
      <ModalHeader>Sign In</ModalHeader>
      <form ref={form} onSubmit={async (e) => {
        e.preventDefault();
        let state = form.current!;
        // @ts-ignore
        let email: string = state.children.namedItem("email")!.value;
        // @ts-ignore
        let password: string = state.children.namedItem("password")!.value;

        let payload;
        if (email.includes('@')) {
          payload = { email, password };
        } else {
          payload = { username: email, password };
        }

        let compound = await login(payload);
        if (compound[0] === 200) {
          let { token } = compound[1];
          let userCompound = await getMe({ cookies: { token } });

          if (userCompound[0] === 200) {
            let user = userCompound[1];
            setUserData(user);
            setToken(token);
            window.location.reload();
          } else {
            setError((userCompound[1] as { message: string }).message);
          }
        } else {
          setError((compound[1] as { message: string }).message);
        }
      }}>
        <FormInput
          label="Username or Email"
          name="email"
          type="text"
          placeholder="Enter your username or email..."
          minLength={3}
          maxLength={255}
          required
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        <FormInput
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password..."
          minLength={6}
          maxLength={64}
          required
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <SubmitButton type="submit" value="Sign In" valid={valid} />
      </form>
      <div style={{
        display: 'grid',
        padding: '8px 0',
        fontSize: '16px',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        or...
      </div>
      <SignInWithButton
        borderColor={'var(--color-text)'}
        background={'transparent'}
        color={'var(--color-text)'}
        onClick={(e) => {
          let url = window.location.origin + window.location.pathname;
          e.currentTarget.querySelector('span')!.innerText = "Redirecting...";

          let state = Math.random().toString(36).substring(7);
          Cookies.set('_github_oauth_state', state);
          window.location.href = GITHUB_OAUTH_URL + `&state=login@${state}@${url}`;
        }}
      >
        <SignInWithButtonIcon src={GithubIcon} alt="GitHub" style={{ filter: 'var(--color-text-filter)' }} />
        <SignInWithButtonText>Sign In with GitHub</SignInWithButtonText>
      </SignInWithButton>
      <p style={{
        padding: '8px 0',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        Don&apos;t have an account? <a onClick={() => setPage('register')}>Sign Up</a>
      </p>
    </ModalContainer>
  )
}

export function RegisterWithGitHubModal({ setPage }: { setPage: (page: Page) => void }) {
  let [valid, setValid] = useState(false);
  let form = useRef<HTMLFormElement>(null);

  return (
    <ModalContainer>
      <ModalHeader>Sign Up with GitHub</ModalHeader>
      <form ref={form} onSubmit={(e) => {
        let url = window.location.origin + window.location.pathname;
        e.preventDefault();

        // @ts-ignore
        let username: string = form.current!.children.namedItem("username")!.value;

        let state = Math.random().toString(36).substring(7);
        Cookies.set('_github_oauth_state', state);
        window.location.href = GITHUB_OAUTH_URL + `&state=register@${state}@${url}@${username}`;
      }}>
        <FormInput
          label="Enter a username for your Turbine account"
          name="username"
          type="text"
          placeholder="Enter a username..."
          minLength={3}
          maxLength={32}
          required
          pattern={'^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9_]$'}
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        <SubmitButton valid={valid} type="submit" value="Sign Up with GitHub" />
      </form>
      <p style={{
        padding: '8px 0',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        Want to use a different method? <a onClick={() => setPage('register')}>Go Back</a>
      </p>
    </ModalContainer>
  )
}

export function RegisterModal({ setUserData, setToken, setPage }: LoginProps) {
  let [error, setError] = useState<string>();
  let [valid, setValid] = useState(false);
  let form = useRef<HTMLFormElement>(null);

  return (
    <ModalContainer>
      <ModalHeader>Sign Up</ModalHeader>
      <form ref={form} onSubmit={async (e) => {
        e.preventDefault();
        let state = form.current!;
        // @ts-ignore
        let email: string = state.children.namedItem("email")!.value;
        // @ts-ignore
        let username: string = state.children.namedItem("username")!.value;
        // @ts-ignore
        let password: string = state.children.namedItem("password")!.value;

        let payload = { email, username, password };
        let [status, response] = await register(payload);

        if (status === 201) {
          let [loginStatus, loginResponse] = await login({ email, password });

          if (loginStatus === 200) {
            let { token } = loginResponse as { token: string };
            let userCompound = await getMe({ cookies: { token } });

            if (userCompound[0] === 200) {
              let user = userCompound[1];
              setUserData(user);
              setToken(token);
              window.location.reload();
            } else {
              setError((userCompound[1] as { message: string }).message);
            }
          } else {
            setError((loginResponse as { message: string }).message);
          }
        } else {
          let { message } = response as { message: string };
          setError(message);
        }
      }}>
        <FormInput
          label="Email"
          name="email"
          type="email"
          placeholder="Enter an email..."
          required
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        <FormInput
          label="Username"
          name="username"
          type="text"
          placeholder="Enter a username..."
          minLength={3}
          maxLength={32}
          required
          pattern={'^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9_]$'}
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        <FormInput
          label="Password"
          name="password"
          type="password"
          placeholder="Enter a password..."
          minLength={6}
          maxLength={64}
          required
          onInput={() => setValid(form!.current!.checkValidity())}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <SubmitButton type="submit" value="Sign Up" valid={valid} />
      </form>
      <div style={{
        display: 'grid',
        padding: '8px 0',
        fontSize: '16px',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        or...
      </div>
      <SignInWithButton
        borderColor={'var(--color-text)'}
        background={'transparent'}
        color={'var(--color-text)'}
        onClick={() => setPage('register/github')}
      >
        <SignInWithButtonIcon src={GithubIcon} alt="GitHub" style={{ filter: 'var(--color-text-filter)' }} />
        <SignInWithButtonText>Sign Up with GitHub</SignInWithButtonText>
      </SignInWithButton>
      <p style={{
        padding: '8px 0',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        Already have an account? <a onClick={() => setPage('login')}>Sign In</a>
      </p>
    </ModalContainer>
  )
}

export default function NavBar() {
  let isBreakpoint = useMediaQuery(768);
  let [userData, setUserData] = useCookie<User>('user', JSON.stringify, JSON.parse);
  let [_, setToken] = useCookie('token');
  let [page, setPage] = useState<Page>();

  return (
    <>
      <Modal isOpen={page != null} onRequestClose={() => setPage(undefined)}>
        {page === 'login'
          ? <LoginModal setUserData={setUserData} setToken={setToken} setPage={setPage} />
          : page === 'register'
          ? <RegisterModal setUserData={setUserData} setToken={setToken} setPage={setPage} />
          : page === 'register/github'
          ? <RegisterWithGitHubModal setPage={setPage} />
          : undefined
        }
      </Modal>
      <Container>
        <Link href="/">
          <a tabIndex={-1}>
            <TurbineBannerStyle src={isBreakpoint ? TurbineLogo : TurbineBanner} alt="Turbine" priority />
          </a>
        </Link>
        {userData ? (
          <UserInfoContainer>
            <UserInfo>
              <UserAvatar
                src={userData.avatar_url ?? 'https://cdn.lambdabot.cf/uploads/turbine_default_avatar.png'}
                alt={userData.username}
              />
              <UserName>{userData.username}</UserName>
            </UserInfo>
            <UserMenu>
              <UserMenuItem color={'var(--color-error)'} onClick={() => {
                setToken();
                setUserData();
                window.location.reload();
              }}>
                Log Out
              </UserMenuItem>
            </UserMenu>
          </UserInfoContainer>
        ) : (
          <LoginButton id="global_login" onClick={() => setPage('login')}>Log In</LoginButton>
        )}
      </Container>
    </>
  )
}
