import type { GetServerSideProps } from 'next';
import Head from 'next/head'

import { getPaste } from '../api/api'
import PasteInterface, { type InboundPasteData } from '../components/PasteInterface';
import {type Socket} from "net";

export function getIp(connection: Socket, headers: { [key: string]: string | string[] | undefined }): string {
  const forwarded = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];
  const ip = forwarded ? (forwarded as string).split(',')[0].trim() : (realIp || connection.remoteAddress);

  return ip as string;
}

export const getServerSideProps: GetServerSideProps = async ({ params, req: { connection, cookies, headers } }) => {
  const { id } = params! as { id: string };
  const ip = getIp(connection, headers);
  // @ts-ignore
  const [ status, data ] = await getPaste(id, { cookies, headers: { 'x-real-ip': ip } });

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

export default function ViewPaste({ data }: { data: InboundPasteData }) {
  return (
    <>
      <Head>
        <title>{`Turbine: ${data.name}`}</title>
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:title" content={`${data.name}` + (data.author_name ? ` by ${data.author_name}` : '')} />
        {data.description && <meta property="og:description" content={data.description.substring(0, 64)} />}
      </Head>
      <PasteInterface data={data} />
    </>
  )
}
