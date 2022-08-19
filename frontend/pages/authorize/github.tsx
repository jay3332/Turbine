import { useRouter } from 'next/router';
import useCookie from "../../hooks/useCookie";
import {getMe, loginGithub} from "../../api/api";
import {type User} from "../../components/NavBar";
import {useEffect} from "react";

export default function AuthorizeGitHub() {
  let router = useRouter();
  let [stored, setStored] = useCookie('_github_oauth_state');
  let [token, setToken] = useCookie('token');
  let [userData, setUserData] = useCookie<User>('user', JSON.stringify, JSON.parse);

  useEffect(() => {
    (async () => {
      let { state, code } = router.query as { state: string, code: string };
      if (state == null || code == null) {
        return;
      }

      let [action, secret, redirect, ...args] = state.split('@');

      if (action === 'login') {
        if (secret !== stored) {
          throw new Error('State does not match, possible CSRF attack');
        }

        setStored("");
        let compound = await loginGithub(code);

        if (compound[0] === 200) {
          let { token } = compound[1];
          let userCompound = await getMe({ cookies: { token } });

          if (userCompound[0] === 200) {
            let user = userCompound[1];
            setUserData(user);
            setToken(token);
            window.location.href = redirect;
          } else {
            await router.push('/500');
          }
          window.location.href = redirect;
        }
      }
    })()
  }, [router, setStored, setToken, setUserData, stored]);
}
