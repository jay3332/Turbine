import styled from 'styled-components'

export interface PasteInterfaceCallbackParams {
  title: string;
  description: string;
  files: {
    filename: string,
    content: string,
  }[];
}

export interface PasteInterfaceProps {
  callback?(params: PasteInterfaceCallbackParams): Promise<any>;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export default function PasteInterface(props: PasteInterfaceProps) {
  const editing = props.callback != null;

  return (
    <Container>

    </Container>
  )
}
