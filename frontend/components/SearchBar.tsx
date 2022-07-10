import Image from 'next/future/image';
import { useState, type InputHTMLAttributes } from 'react';
import styled from 'styled-components';

import Icon from '../public/icon-search.svg'

const Input = styled.input`
  border: var(--color-bg-2) 2px solid;
  border-radius: 4px;
  padding: 8px 8px 8px calc(1.9em + 4px);
  font-size: 1em;
  transition: all 0.3s ease;
  background-color: transparent;

  &:hover {
    border-color: var(--color-bg-3);
  }
  
  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }
  
  &::placeholder {
    font-weight: 600;
  }
`;

const SearchIcon = styled(Image)<{ active: boolean }>`
  user-select: none;
  filter: ${props => props.active 
    ? 'invert(29%) sepia(90%) saturate(2980%) hue-rotate(211deg) brightness(100%) contrast(104%)'
    : 'invert(100%) brightness(100%)'};
  transition: all 0.3s ease;
  width: 1em;
  height: auto;
  opacity: ${props => props.active ? 1 : 0.5};
  position: absolute;
  padding-top: calc(4px + 0.5em);
  padding-left: calc(4px + 0.5em);
`;

export default function SearchBar(props: InputHTMLAttributes<any>) {
  const [active, setActive] = useState(false);

  return (
    <div>
      <SearchIcon src={Icon} alt="Search" active={active} />
      <Input
        type="text"
        placeholder="Search..."
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        {...props}
      />
    </div>
  )
}
