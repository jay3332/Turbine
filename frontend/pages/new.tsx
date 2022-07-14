import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from 'next/router'

import { createPaste } from "../api/api";
import PasteInterface from "../components/PasteInterface";

const NewPaste: NextPage = () => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Turbine: New Paste</title>
        <meta property="og:title" content="Turbine: Create New Paste" />
      </Head>
      <PasteInterface callback={async (payload) => {
        const [ status, data ] = await createPaste(payload);

        await router.push(status === 201 ? `/${data.id}` : '/500');
      }} />
    </>
  )
}

export default NewPaste
