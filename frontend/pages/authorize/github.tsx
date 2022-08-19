import { useRouter } from 'next/router';
import useCookie from "../../hooks/useCookie";
import {getMe, login, loginGithub, registerGithub} from "../../api/api";
import {type User} from "../../components/NavBar";
import {useEffect, useState} from "react";
import {toast} from "react-toastify";

export default function AuthorizeGitHub() {
  let router = useRouter();
  let [stored, setStored] = useCookie('_github_oauth_state');
  let [_token, setToken] = useCookie('token');
  let [_userData, setUserData] = useCookie<User>('user', JSON.stringify, JSON.parse);
  let [url, setUrl] = useState<string>();
  let [failed, setFailed] = useState<string>();

  useEffect(() => {
    (async () => {
      let { state, code } = router.query as { state: string, code: string };
      if (state == null || code == null) {
        return;
      }

      let [action, secret, redirect, ...args] = state.split('@');
      if (secret !== stored) {
        setUrl(redirect);
        setFailed('State invalidated, please try authenticating again.');
        toast.error('State does not match! This may be a CSRF attack, please try authenticating again.')
        throw new Error('State does not match, possible CSRF attack');
      }
      setStored("");

      if (action === 'login') {
        let compound = await loginGithub(code);

        if (compound[0] === 200) {
          let { token } = compound[1];
          let userCompound = await getMe({ cookies: { token } });

          if (userCompound[0] === 200) {
            let user = userCompound[1];
            setUserData(user);
            setToken(token);
            setUrl(redirect);
            // @ts-ignore
            window.location = redirect;
          } else {
            setUrl(redirect);
            setFailed((userCompound[1] as { message: string }).message);
          }
        } else {
          setUrl(redirect);
          setFailed((compound[1] as { message: string }).message);
        }
      } else if (action === 'register') {
        let [username] = args as [string];
        let [status, response] = await registerGithub({ username, access_code: code });

        if (status === 201) {
          let { token } = response as { token: string };
          let userCompound = await getMe({ cookies: { token } });

          if (userCompound[0] === 200) {
            let user = userCompound[1];
            setUserData(user);
            setToken(token);
            setUrl(redirect);
            // @ts-ignore
            window.location = redirect;
          } else {
            setUrl(redirect);
            setFailed((userCompound[1] as { message: string }).message);
          }
        } else {
          setUrl(redirect);
          setFailed((response as { message: string }).message);
        }
      }
    })()
  }, [router, setStored, setToken, setUserData, stored]);

  if (failed) {
    return (
      <>
        <h1 style={{ textAlign: 'center' }}>Failed to Authenticate!</h1>
        <p style={{ textAlign: 'center' }}>
          Something went wrong while authenticating with GitHub. <a href={url}>Click here</a> to try again.
        </p>
        <p style={{
          textAlign: 'center',
          color: 'var(--color-error)',
        }}>
          {failed}
        </p>
      </>
    )
  }

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Authorizing...</h1>
      <p style={{ textAlign: 'center' }}>You should be redirected soon.</p>
      <br />
      <p style={{
        textAlign: 'center',
        fontSize: '0.8rem',
      }}>
        <b style={{ color: 'var(--color-text-secondary)' }}>Not redirected?</b> <a href={url}>Click here</a>
      </p>
    </>
  )
}
