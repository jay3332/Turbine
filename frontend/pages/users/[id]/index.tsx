import Page, {getServerSideProps as getProps} from './[page]';
import {type User} from "../../../components/NavBar";
import {type GetServerSidePropsContext} from "next";
import {PastePreview} from "../../../api/api";

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return getProps(ctx);
}

export default function DefaultPage(props: { userData: User, pastesData: PastePreview[] }) {
  return (
    <Page {...props} />
  )
}
