import dynamic from "next/dynamic";
import styled from 'styled-components'
import {type FormEvent, useEffect, useState} from "react";

const AceEditor = dynamic(() => import("react-ace"), {
  ssr: false,
})

export interface InboundPasteData {
  title: string;
  description: string;
  files: {
    filename: string,
    content: string,
  }[];
  author_id: string,
  author_name: string,
  visibility: 0 | 1 | 2 | 3,
}

export interface OutboundPasteData {
  title: string;
  description: string;
  files: {
    filename: string,
    content: string,
  }[];
}

export interface PasteInterfaceProps {
  callback?(params: OutboundPasteData): Promise<any>;
  data?: InboundPasteData;
}

const Container = styled.div`
  display: block;
  width: auto;
  margin: 16px 15vw;
  
  @media screen and (max-width: 767px) {
    margin: 14px 14px;
  }
`;

const Title = styled.input`
  font-weight: 600;
  font-size: 22px;
  padding: 6px;
  background-color: transparent;
  border: var(--color-bg-2) 3px dashed;
  border-radius: 4px;
  box-sizing: border-box;
  width: 100%;
  transition: all 0.4s ease;
  
  &:hover {
    border-color: var(--color-bg-3);
  }
  
  &:focus {
    border: var(--color-primary) 3px solid;
    outline: none;
  }
`;

const Description = styled.textarea`
  font-size: 16px;
  font-weight: 500;
  padding: 6px;
  margin-top: 8px;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: var(--color-bg-2) 3px dashed;
  border-radius: 4px;
  box-sizing: border-box;
  width: 100%;
  transition: all 0.4s ease;
  resize: none;
  
  &:hover {
    border-color: var(--color-bg-3);
  }
  
  &:focus {
    border: var(--color-primary) 3px solid;
    outline: none;
  }
`;

const File = styled.div<{ focused: boolean }>`
  width: 100%;
  box-sizing: border-box;
  transition: all 0.4s ease;
  border: ${props => props.focused ? 'var(--color-primary) 2px solid' : 'var(--color-bg-3) 2px solid'};
  border-radius: 4px;
  margin: 8px 0;
`;

const FileHeader = styled.div`
  padding: 6px;
`;

const FilenameInput = styled.input`
  border: var(--color-bg-2) 2px dashed;
  font-weight: 400;
  font-size: 17px;
  padding: 4px;
  background-color: transparent;
  border-radius: 4px;
  transition: all 0.4s ease;
  box-sizing: border-box;
  width: 100%;
  
  &:focus {
    border: var(--color-primary) 2px solid;
    outline: none;
  }
  
  &::placeholder {
    font-weight: 600;
  }
`;

const Editor = styled(AceEditor)`
  font-size: 16px;
  border-radius: 0 0 4px 4px;
  width: 100% !important;
  box-sizing: border-box;
  
  &, * {
    font-family: var(--font-monospace);
    line-height: 1.5em;
    color: initial !important;
  }
`;

export default function PasteInterface({ callback, data }: PasteInterfaceProps) {
  const editing = callback != null;

  const [ title, setTitle ] = useState(data?.title)
  const [ description, setDescription ] = useState(data?.description)

  let initialState = data?.files.map(file => ({ ...file, expanded: false }))
    || [{
      filename: "main.auto",
      content: "",
      expanded: false,
    }];
  initialState[0]!.expanded = true;

  const [ files, setFiles ] = useState(initialState)
  const [ focused, setFocused ] = useState<number>()

  return (
    <Container>
      <Title defaultValue={data?.title || 'Untitled Paste'} maxLength={64} onChange={e => setTitle(e.target.value)} />
      <Description
        placeholder="Enter a description..."
        maxLength={1024}
        onChange={e => {setDescription(e.target.value)}}
        onInput={({ target }: { target: HTMLElement } & FormEvent<HTMLTextAreaElement>) => {
          target.style.height = ''; // This makes the scrollbar not "flash" when it overflows
          target.style.height = target.scrollHeight + 6 + "px"
        }}
      />
      {files.map(({ filename, content, expanded }, i) => (
        <File focused={i === focused} key={`file:${i}`}>
          <FileHeader>
            <FilenameInput placeholder="Enter filename..." defaultValue={filename} onChange={e => {
              files[i].filename = e.target.value;
              setFiles(files);
            }} />
          </FileHeader>
          <Editor
            editorProps={{
              $blockScrolling: Infinity
            }}
            enableLiveAutocompletion
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(undefined)}
          />
        </File>
      ))}
    </Container>
  )
}
