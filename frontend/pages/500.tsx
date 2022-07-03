import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { Container, Main, BottomText, BackToHome } from "./404";

const InternalServerError: NextPage = () => {
  return (
    <Container>
      <Head>
        <meta property="og:title" content="Turbine: 500 Internal Server Error" />
        <title>Turbine: Internal Server Error</title>
      </Head>
      <Main background={
        "linear-gradient(to right, #ff00a4 0%, #ff0000 25%, #ff9e00 50%, #ff0000 75%, #ff00a4 100%)"
      }>
        500
      </Main>
      <BottomText>Internal Server Error</BottomText>
      <Link href="/">
        <BackToHome>Back to Home</BackToHome>
      </Link>
    </Container>
  )
}

export default InternalServerError
