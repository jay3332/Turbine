import type { NextPage } from "next";
import Head from "next/head";
import PasteInterface from "../components/PasteInterface";

const NewPaste: NextPage = () => {
  return (
    <>
      <Head>
        <title>Turbine: New Paste</title>
        <meta property="og:title" content="Turbine: Create New Paste" />
      </Head>
      <PasteInterface callback={async (params) => {

      }} />
    </>
  )
}

export default NewPaste
