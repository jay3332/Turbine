import Image from 'next/future/image';
import ReactModal, { type Props } from 'react-modal';
import styled from 'styled-components';

import ExitButton from '../public/icon-exit.svg';

const Exit = styled(Image)`
  cursor: pointer;
  width: 0.8em;
  height: auto;
  position: absolute;
  top: 1em;
  right: 1em;
  filter: invert(100%) brightness(100%);
  user-select: none;
  transition: all 0.3s ease;
  opacity: 0.6;
  
  &:hover {
    opacity: 1;
  }
`;

export default function Modal({ children, onRequestClose, ...props }: Props) {
  return (
    <ReactModal {...props} onRequestClose={onRequestClose} >
      <Exit src={ExitButton} alt="Exit Modal" onClick={onRequestClose} />
      {children}
    </ReactModal>
  )
}
