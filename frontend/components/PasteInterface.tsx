import dynamic from "next/dynamic";
import Image from 'next/future/image';
import styled from 'styled-components'
import { type FormEvent, useEffect, useState } from "react";
import languages from "../public/languages.json"

import AngleDownIcon from '../public/icon-angle-down.svg'
import AngleRightIcon from '../public/icon-angle-right.svg'

const AceEditor = dynamic(async () => {
  const reactAce = await import("react-ace");

  // prevent warning in console about misspelled props name
  // @ts-ignore
  await import("ace-builds/src-min-noconflict/ext-language_tools");

  let ace = require("ace-builds/src-min-noconflict/ace");
  ace.config.set(
    "basePath",
    "https://cdn.jsdelivr.net/npm/ace-builds@1.7.1/src-noconflict/"
  );

  return reactAce;
}, {
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

export interface EditorOptions {
  tabSize: number;
  useSoftTabs: boolean;
}

const Container = styled.div`
  display: block;
  width: auto;
  margin: 16px 15vw;
  
  @media screen and (max-width: 767px) {
    margin: 14px 16px;
  }
`;

const Title = styled.input`
  font-weight: 600;
  font-size: 24px;
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
  display: flex;
`;

const FileConfig = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
`;

const FilenameInput = styled.input`
  border: var(--color-bg-2) 2px dashed;
  font-weight: 400;
  font-size: 17px;
  padding: 5px;
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

const FileConfigRow = styled.div`
  display: flex;
  box-sizing: border-box;
  width: 100%;
  margin-top: 6px;
  align-items: center;
`;

const FileConfigLabel = styled.label`
  font-weight: 700;
  font-size: 16px;
  color: var(--color-text-tertiary);
  user-select: none;
  padding-right: 6px;
`;

const TabSizeInput = styled.input`
  border: transparent 2px solid;
  font-weight: 500;
  font-size: 15px;
  padding: 4px;
  background-color: var(--color-bg-2);
  border-radius: 4px;
  transition: all 0.4s ease;
  
  &:focus {
    border: var(--color-primary) 2px solid;
    outline: none;
  }
`;

const BaseEditor = styled(AceEditor)`
  border-radius: 0 0 4px 4px;
  width: 100% !important;
  box-sizing: border-box;
  
  &, * {
    font-family: var(--font-monospace);
    line-height: 1.675em;
    color: unset;
    font-variant-ligatures: contextual;
  }
`;

const ArrowImage = styled(Image)`
  filter: invert(100%) brightness(100%);
  width: 14px;
  height: 14px;
  margin: 10px 8px 0 8px;
  opacity: 0.4;
  user-select: none;
  transition: opacity 0.3s ease;
  cursor: pointer;
  
  &:hover {
    opacity: 0.7;
  }
`;

const LoadingAnimation = styled.div`
  width: 22px;
  height: 22px;
  user-select: none;
  content: " ";
  display: inline-block;
  border-radius: 50%;
  margin-right: 12px;
  border: 4px solid;
  border-color: var(--color-text) transparent var(--color-text) transparent;
  animation: dual-ring 1.2s linear infinite;

  @keyframes dual-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  width: 100%;
  box-sizing: border-box;
`;

const LoadingText = styled.div`
  font-size: 24px;
  font-weight: 600;
  opacity: 0.8;
  user-select: none;
`;

export interface EditorProps {
  filename?: string;
  language?: string;
  theme?: string;
  value: string;
  onFocus(): any;
  onBlur(): any;
  onChange(value: string): any;
  options: EditorOptions;
}

export function Editor({ filename, language, value, onFocus, onBlur, onChange, options }: EditorProps) {
  let [ mode, setMode ] = useState<string>();
  let [ hydrated, setHydrated ] = useState(false);

  useEffect(() => {
    let mode: string | undefined;

    if (language) {
      // @ts-ignore
      mode = languages[language]!.ace_mode;
    } else {
      for (let language of Object.values(languages)) {
        if (language.extensions.some(ext => filename!.endsWith(ext))) {
          mode = language.ace_mode;
          break;
        }

        // @ts-ignore
        if (language.filenames.includes(filename)) {
          mode = language.ace_mode;
          break;
        }
      }
    }

    (async () => {
      if (mode) {
        // @ts-ignore
        const ace = await import("ace-builds/src-min-noconflict/ace");
        ace.config.setModuleUrl(
          `ace/mode/${mode}_worker`,
          `https://cdn.jsdelivr.net/npm/ace-builds@1.7.1/src-noconflict/worker-${mode}.js`
        );

        await import(`ace-builds/src-noconflict/mode-${mode}`);
        await import(`ace-builds/src-noconflict/theme-monokai`);
      } else {
        mode = "text"
      }

      setHydrated(true);
      setMode(mode);
    })()
  }, [filename, language])

  if (!hydrated) {
    return (
      <LoadingContainer>
        <LoadingAnimation />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    )
  }

  return (
    <BaseEditor
      mode={mode}
      editorProps={{
        $blockScrolling: Infinity,
      }}
      value={value}
      fontSize={14}
      theme="monokai"
      showPrintMargin={false}
      onFocus={onFocus}
      onBlur={onBlur}
      setOptions={{
        enableSnippets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableEmmet: true,
        showLineNumbers: true,
        cursorStyle: 'smooth',
        useSoftTabs: options.useSoftTabs,
        tabSize: options.tabSize,
        minLines: 10,
        maxLines: Infinity,
      }}
      onChange={onChange}
    />
  )
}

const defaultEditorOptions: EditorOptions = {
  tabSize: 4,
  useSoftTabs: true,
}

export default function PasteInterface({ callback, data }: PasteInterfaceProps) {
  const editing = callback != null;

  const [ title, setTitle ] = useState(data?.title)
  const [ description, setDescription ] = useState(data?.description)

  let initialState = data?.files.map(file => ({ ...file, expanded: false, options: {...defaultEditorOptions} }))
    || [{
      filename: "main",
      content: "",
      expanded: false,
      options: {...defaultEditorOptions},
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
      {files.map(({ filename, content, expanded, options }, i) => (
        <File focused={i === focused} key={`file:${i}`}>
          <FileHeader>
            <ArrowImage
              src={expanded ? AngleDownIcon : AngleRightIcon}
              alt="Expand"
              // Boilerplate due to how useState works
              onClick={() => {
                let f = [...files];
                f[i].expanded = !expanded;
                if (focused === i) {
                  setFocused(undefined);
                }
                setFiles(f);
              }}
            />
            <FileConfig>
              <FilenameInput placeholder="Enter filename..." defaultValue={filename} onChange={e => {
                files[i].filename = e.target.value;
                setFiles(files);
              }} />
              {expanded && (
                <FileConfigRow>
                  <FileConfigLabel>
                    Tab Size
                  </FileConfigLabel>
                  <TabSizeInput
                    type="number"
                    min={1}
                    max={8}
                    maxLength={1}
                    defaultValue={options.tabSize}
                    step={1}
                    onChange={e => {
                      // @ts-ignore
                      e.target.value = Math.max(1, Math.min(8, e.target.value.at(-1) ?? 4));
                      files[i].options.tabSize = parseInt(e.target.value);
                    }}
                  />
                </FileConfigRow>
              )}
            </FileConfig>
          </FileHeader>
          {expanded && (
            <Editor
              value={content}
              filename={filename}
              onFocus={() => setFocused(i)}
              onBlur={() => {
                if (focused === i) {
                  setFocused(undefined);
                }
              }}
              onChange={value => {
                files[i].content = value;
                setFiles(files);
              }}
              options={options}
            />
          )}
        </File>
      ))}
    </Container>
  )
}
