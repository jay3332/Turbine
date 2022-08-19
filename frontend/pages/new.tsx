import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from 'next/router'

import { createPaste } from "../api/api";
import PasteInterface from "../components/PasteInterface";
import {useAllCookies} from "../hooks/useCookie";

const NewPaste: NextPage = () => {
  const router = useRouter();
  const [cookies, _] = useAllCookies();

  return (
    <>
      <Head>
        <title>Turbine: New Paste</title>
        <meta property="og:title" content="Create New Paste" />
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:description" content="Turbine is a modern and open-source pastebin service." />
      </Head>
      <PasteInterface callback={async (payload) => {
        const [ status, data ] = await createPaste(payload, { cookies });

        await router.push(status === 201 ? `/${data.id}` : '/500');
      }} />
    </>
  )
}

export default NewPaste
