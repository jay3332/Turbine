import Cookies from 'js-cookie';
import {useCallback, useEffect, useState} from 'react';

const identity = (value: any) => value;

type CookieRecord = {[name: string]: string};

export function useAllCookies(): [CookieRecord, (cookie: CookieRecord) => void] {
  let [cookies, setCookies] = useState<CookieRecord>();

  useEffect(() => {
    setCookies(Cookies.get());
  }, []);

  return [cookies!, setCookies];
}

function useCookie<T = string>(
  name: string,
  serialize: (value: T) => string = identity,
  deserialize: (value: string) => T = identity,
): [T | undefined, (value?: T) => void] {
  const [cookie, setCookie] = useState<T>();

  useEffect(() => {
    let value = Cookies.get(name);
    setCookie(value != null ? deserialize(value) : undefined);
  }, [deserialize, name]);

  let edit = useCallback((value?: T) => {
    if (value != null) {
      Cookies.set(name, serialize(value));
    } else {
      Cookies.remove(name);
    }
  }, [name, serialize]);

  return [cookie, edit];
}

export default useCookie
