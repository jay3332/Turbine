import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import styled from "styled-components";

import { Container, Main, BottomText, BackToHome } from "./404";

const SmallText = styled.p`
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 600;
  text-align: center;
`;

const InternalServerError: NextPage = () => {
  return (
    <Container>
      <Head>
        <meta property="og:site_name" content="Turbine" />
        <meta property="og:title" content="500 Internal Server Error" />
        <meta property="og:description" content="Turbine is a modern and open-source pastebin service." />
        <title>Turbine: Internal Server Error</title>
      </Head>
      <Main background={
        "linear-gradient(to right, #ff00a4 0%, #ff0000 25%, #ff9e00 50%, #ff0000 75%, #ff00a4 100%)"
      }>
        500
      </Main>
      <BottomText>Internal Server Error</BottomText>
      <SmallText>
        If this error persists, please let <a href="https://github.com/jay3332">the developer</a> know.
        <br/>
        You can also view the console for more information about the error.
      </SmallText>
      <Link href="/">
        <BackToHome>Back to Home</BackToHome>
      </Link>
    </Container>
  )
}

export default InternalServerError
