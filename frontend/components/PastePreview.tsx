import type { PastePreview as PastePreviewType, PastePreviewWithStar } from "../api/api";
import styled from "styled-components";
import {useRouter} from "next/router";
import Link from "next/link";
import {humanizeDuration} from "./PasteInterface";
import Image from 'next/future/image';
import EyeIcon from '../public/icon-eye.svg';
import StarIcon from '../public/icon-star.svg';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-bottom: 8px;
  padding: 16px;
  border-radius: 4px;
  border: 2px solid var(--color-bg-3);
  transition: all 0.4s ease;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;
  
  &:hover {
    border: 2px solid var(--color-primary);
  }
`

const PasteTop = styled.div`
  display: flex;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100%;
`;

const PasteHeader = styled.div`
  display: flex;
  font-size: 22px;
  margin-bottom: 8px;
`;

const PasteTitle = styled.a`
  font-weight: 500;
`;

const PasteStats = styled.div`
  display: flex;
`;

const PasteStatsItem = styled.div`
  display: flex;
  justify-content: center;
  padding: 0 6px;
`;

const PasteStatsItemIcon = styled(Image)`
  width: 16px;
  height: 16px;
  margin-right: 6px;
  filter: var(--color-text-filter);
  opacity: 0.5;
  user-select: none;
`;

const PasteStatsItemText = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
`;

const PasteCreation = styled.div`
  font-weight: 500;
  font-size: 14px;
  margin-top: 2px;
  color: var(--color-text-secondary);
  box-sizing: border-box;
  width: 100%;
`;

const PasteDescription = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: var(--color-text-secondary);
  box-sizing: border-box;
  width: 100%;
  margin-top: 6px;
`;

export interface Props {
  data: PastePreviewType | PastePreviewWithStar;
  showAuthor: boolean;
}

export default function PastePreview({ data, showAuthor }: Props) {
  const router = useRouter();

  if (!data.available) {
    return <></>
  }

  // TODO: more paste information such as publicity
  return (
    <Container onClick={async () => await router.push(`/${data.id}`)}>
      <PasteTop>
        <PasteHeader>
          <Link href={`/${data.id}`}>
            <PasteTitle>{data.name}</PasteTitle>
          </Link>
          {showAuthor && (
            <>
              <span style={{
                color: 'var(--color-text-tertiary)',
                padding: '0 2px' ,
                fontWeight: '600',
              }}>
                &nbsp;by&nbsp;
              </span>
              <Link href={`/users/${data.author_id}`}>
                <PasteTitle>{data.author_name}</PasteTitle>
              </Link>
            </>
          )}
        </PasteHeader>
        <PasteStats>
          <PasteStatsItem>
            <PasteStatsItemIcon src={EyeIcon} alt="Views" />
            <PasteStatsItemText>{data.views}</PasteStatsItemText>
          </PasteStatsItem>
          <PasteStatsItem>
            <PasteStatsItemIcon src={StarIcon} alt="Stars" />
            <PasteStatsItemText>{data.stars}</PasteStatsItemText>
          </PasteStatsItem>
        </PasteStats>
      </PasteTop>
      <PasteCreation>Created {humanizeDuration(Date.now() / 1000 - data.created_at)} ago</PasteCreation>
      {data.description && (
        <PasteDescription>{data.description}</PasteDescription>
      )}
    </Container>
  )
}
