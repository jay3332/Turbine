import dynamic from "next/dynamic";
import Image from 'next/future/image';
import styled from 'styled-components'
import { type FormEvent, useEffect, useState } from "react";

import Modal from './Modal';
import SearchBar from './SearchBar';
import languages from "../public/languages.json"
import AngleDownIcon from '../public/icon-angle-down.svg'
import AngleRightIcon from '../public/icon-angle-right.svg'
import PlusIcon from '../public/icon-plus.svg'
import TrashIcon from '../public/icon-trash.svg'
import UploadIcon from '../public/icon-upload.svg'

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
  name: string;
  description: string;
  files: {
    filename: string,
    content: string,
    language?: string,
  }[];
  author_id: string,
  author_name: string,
  visibility: 0 | 1 | 2 | 3,
  created_at: number,
  views: number,
  stars: number,
}

export interface OutboundPasteData {
  title: string;
  description: string;
  files: {
    filename: string,
    content: string,
    language?: string,
  }[];
}

export interface PasteInterfaceProps {
  callback?(params: OutboundPasteData): Promise<any>;
  data?: InboundPasteData;
}

export interface EditorOptions {
  tabSize: number;
  useSoftTabs: boolean;
  wrap: 0 | 1 | 2;
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
  
  @media screen and (max-width: 767px) {
    padding-bottom: 0;
  }
`;

const FileConfig = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
`;

const FilenameInputRow = styled.div`
  display: flex;
  box-sizing: border-box;
  width: 100%;
  align-items: center;
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
  
  @media screen and (max-width: 767px) {
    flex-wrap: wrap;
    
    * {
      margin-bottom: 6px;
      white-space: nowrap;
    }
  }
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
  margin-right: 6px;
  
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
  filter: var(--color-text-filter);
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

const SoftTabsButton = styled.button<{ isSoft: boolean }>`
  font-weight: 600;
  background-color: ${props => props.isSoft ? 'var(--color-primary)' : 'var(--color-secondary)'};
  transition: all 0.3s ease;
  margin-right: 6px;
  font-size: 14px;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  
  &:active {
    opacity: 0.83;
  }
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const WrapButton = styled.button<{ setting: 0 | 1 | 2 }>`
  font-weight: 600;
  background-color: ${props => [
    'var(--color-primary)',
    'var(--color-success-blend)',
    'var(--color-bg-3)',
  ][props.setting]};
  transition: all 0.3s ease;
  font-size: 14px;
  padding: 6px;
  margin-right: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  
  &:active {
    opacity: 0.83;
  }
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const LanguageSelect = styled.button`
  font-weight: 600;
  background-color: var(--color-bg-3);
  transition: all 0.3s ease;
  font-size: 14px;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  
  &:active {
    opacity: 0.83;
  }
  
  &:hover {
    transform: translateY(-2px);
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

const LanguageSearchHeader = styled.div`
  font-size: 24px;
  font-weight: 600;
  opacity: 0.8;
  user-select: none;
  margin-bottom: 18px;
  text-align: center;
`;

const LanguageSearchBar = styled(SearchBar)`
  width: min(75vw, 600px);
  box-sizing: border-box;
`;

const LanguageEntries = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  scroll-behavior: smooth;
  margin-top: 6px;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  ::-webkit-scrollbar {
    display: none;
  }
`;

const LanguageEntry = styled.button`
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--color-bg-0);
  border: var(--color-bg-0) 2px solid;
  border-radius: 4px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border: var(--color-primary) 2px solid;
  }
  
  &:focus {
    outline: none;
    border: var(--color-primary) 2px solid;
  }
`;

const LanguageEntryColor = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const LanguageEntryText = styled.div`
  font-size: 16px;
  font-weight: 600;
  opacity: 0.8;
  user-select: none;
  margin-left: 6px;
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-sizing: border-box;
  width: 100%;
  padding: 16px 0;
  flex-wrap: wrap;
`

const ActionButtonContainer = styled.div`
  display: flex;
`;

const ActionButtonImage = styled(Image)`
  width: 16px;
  height: 16px;
  margin-right: 8px;
  
  @media screen and (max-width: 768px) {
    margin: 4px;
  }
`;

const ActionButton = styled.button<{ inverted?: boolean, color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s ease;
  padding: 14px;
  box-sizing: border-box;
  user-select: none;
  cursor: pointer;
  margin-left: 12px;
  background-color: ${props => props.inverted ? 'transparent' : `var(--color-${props.color})`};
  border: ${props => props.inverted ? `var(--color-${props.color})` : 'transparent'} 2px solid;
  
  span {
    color: ${props => props.inverted ? `var(--color-${props.color})` : 'var(--color-text)'};
    font-size: 16px;
    font-weight: 600;
  }
  
  ${ActionButtonImage} {
    filter: ${props => props.inverted ? `var(--color-${props.color}-filter)` : 'var(--color-text-filter)'};
  }
  
  &:hover {
    transform: translateY(-2px);
    background-color: ${props => props.inverted ? `var(--color-${props.color})` : `var(--color-${props.color}-blend)`};
    
    span {
      color: var(--color-text);
    }
    
    ${ActionButtonImage} {
      filter: var(--color-text-filter);
    }
  }
  
  @media screen and (max-width: 768px) {
    border-radius: 50%;
    
    span {
      display: none;
    }
  }
`;

ActionButton.defaultProps = {
  inverted: false,
}

const ActionButtonHint = styled.div`
  font-size: 14px;
  user-select: none;
  opacity: 0.4;
  margin-top: 6px;
  font-weight: 700;
  text-align: center;
  
  @media screen and (max-width: 768px) {
    display: none;
  }
`;

const DeleteFileButton = styled(Image)`
  cursor: pointer;
  filter: var(--color-error-filter);
  width: 18px;
  height: 18px;
  margin-left: 16px;
  margin-right: 8px;
  user-select: none;
  opacity: 0.8;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
`;

const FileSize = styled.div`
  user-select: none;
  font-weight: 700;
  opacity: 0.4;
  font-size: 16px;
  flex-grow: 1;
  text-align: right;
  margin-right: 6px;
  
  @media screen and (max-width: 900px) {
    display: none;
  }
`

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
  let [ wrap, setWrap ] = useState<boolean>();

  useEffect(() => {
    let mode: string | undefined;
    let wrap: boolean | undefined;

    if (language) {
      // @ts-ignore
      let lang = languages[language]!;

      mode = lang.ace_mode;
      wrap = lang.wrap;
    } else {
      for (let language of Object.values(languages)) {
        if (language.extensions.some(ext => filename!.endsWith(ext))) {
          mode = language.ace_mode;
          wrap = language.wrap;
          break;
        }

        // @ts-ignore
        if (language.filenames.includes(filename)) {
          mode = language.ace_mode;
          wrap = language.wrap;
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
      setWrap(wrap);
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
        showLineNumbers: true,
        cursorStyle: 'smooth',
        useSoftTabs: options.useSoftTabs,
        tabSize: options.tabSize,
        wrap: options.wrap === 0
          ? wrap
          : options.wrap === 1,
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
  wrap: 0,
}

interface IntermediateFile {
  filename: string;
  content: string;
  language?: string;
  expanded: boolean,
  options: EditorOptions;
  _key: number;
}

const defaultFile: () => IntermediateFile = () => ({
  filename: "main",
  content: "",
  language: undefined,
  expanded: false,
  options: {...defaultEditorOptions},
  _key: 0,
})

function humanizeSize(bytes: number) {
  if (bytes < 1000) {
    return bytes + ' B';
  }

  const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let u = -1;

  do {
    bytes /= 1000;
    ++u;
  } while (Math.round(Math.abs(bytes) * 100) / 100 >= 1000 && u < units.length - 1);

  return bytes.toFixed(2) + ' ' + units[u];
}

function byteLength(str: string) {
  let s = str.length;

  for (let i = str.length - 1; i >= 0; i--) {
    let code = str.charCodeAt(i);

    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s+=2;
    if (code >= 0xDC00 && code <= 0xDFFF) i--;
  }

  return s;
}

export default function PasteInterface({ callback, data }: PasteInterfaceProps) {
  const editing = callback != null;

  const [ title, setTitle ] = useState(data?.name)
  const [ description, setDescription ] = useState(data?.description)

  let initialState = data?.files
      .map((file) => ({
        ...file,
        expanded: false,
        options: {...defaultEditorOptions},
        _key: Date.now(),
      }))
      || [defaultFile()];
  initialState[0]!.expanded = true;

  const [ files, setFiles ] = useState<IntermediateFile[]>(initialState)
  const [ focused, setFocused ] = useState<number>()
  const [ languageModalIndex, setLanguageModalIndex ] = useState<number>()
  const [ languageQuery, setLanguageQuery ] = useState<string>()

  useEffect(() => {
    setLanguageQuery(undefined);
  }, [languageModalIndex]);

  return (
    <>
      <Modal
        isOpen={languageModalIndex != null}
        onRequestClose={() => {
          setLanguageModalIndex(undefined);
        }}
      >
        <LanguageSearchHeader>Choose a Language</LanguageSearchHeader>
        <LanguageSearchBar
          placeholder="Search for a language..."
          onInput={(e) => {
            // @ts-ignore
            setLanguageQuery(e.target.value.toLowerCase());
          }}
        />
        <LanguageEntries>
          {(languageQuery == null || "auto".includes(languageQuery)) && (
            <LanguageEntry
            key="Auto"
            onClick={() => {
              let f = [...files];
              f[languageModalIndex!]!.language = undefined;

              setFiles(f);
              setLanguageModalIndex(undefined);
            }}
          >
              <LanguageEntryColor color="var(--color-text)"/>
              <LanguageEntryText>Auto</LanguageEntryText>
            </LanguageEntry>
          )}
          {Object.entries(languages)
            .sort(([a, _a], [b, _b]) => a.charCodeAt(0) - b.charCodeAt(0))
            .filter(([name, { extensions }]) => {
              return languageQuery == null
                || name.toLowerCase().includes(languageQuery)
                || extensions.some(ext => ext.toLowerCase().includes(languageQuery));
            })
            .map(([lang, details]) => (
              <LanguageEntry
                key={lang}
                onClick={() => {
                  let f = [...files];
                  f[languageModalIndex!]!.language = lang;

                  setFiles(f);
                  setLanguageModalIndex(undefined);
                }}
              >
                <LanguageEntryColor color={details.color ?? 'var(--color-text)'} />
                <LanguageEntryText>{lang}</LanguageEntryText>
              </LanguageEntry>
            ))
          }
        </LanguageEntries>
      </Modal>
      <Container>
        <Title defaultValue={data?.name || 'Untitled Paste'} maxLength={64} onChange={e => setTitle(e.target.value)} />
        <Description
          placeholder="Enter a description..."
          maxLength={1024}
          onChange={e => {setDescription(e.target.value)}}
          onInput={({ target }: { target: HTMLElement } & FormEvent<HTMLTextAreaElement>) => {
            target.style.height = ''; // This makes the scrollbar not "flash" when it overflows
            target.style.height = target.scrollHeight + 6 + "px"
          }}
        />
        {files.map(({ filename, content, language, expanded, options, _key }, i) => (
          <File focused={i === focused} key={`file:${i}:${_key}`}>
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
                <FilenameInputRow>
                  <FilenameInput placeholder="Enter filename..." defaultValue={filename} onChange={e => {
                    files[i].filename = e.target.value;
                    setFiles(files);
                  }} />
                  <DeleteFileButton src={TrashIcon} alt="Delete File" onClick={() => {
                    let f = [...files];

                    f.splice(i, 1);
                    setFiles(f);

                    if (focused === i) {
                      setFocused(undefined);
                    }
                  }} />
                </FilenameInputRow>
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
                    <SoftTabsButton isSoft={options.useSoftTabs} onClick={() => {
                      let f = [...files];

                      f[i].options.useSoftTabs = !options.useSoftTabs;
                      setFiles(f);
                    }}>
                      {options.useSoftTabs ? 'Using Soft Tabs' : 'Using Hard Tabs'}
                    </SoftTabsButton>
                    <WrapButton setting={options.wrap} onClick={() => {
                      let f = [...files];

                      f[i].options.wrap = (++options.wrap % 3) as (0 | 1 | 2);
                      setFiles(f);
                    }}>
                      {[
                        'Wrap: Auto',
                        'Wrap: On',
                        'Wrap: Off',
                      ][options.wrap]}
                    </WrapButton>
                    <LanguageSelect onClick={() => {
                      setLanguageModalIndex(i);
                    }}>
                      Language: {language ?? 'Auto'}
                    </LanguageSelect>
                    <FileSize>
                      {humanizeSize(byteLength(content))}
                    </FileSize>
                  </FileConfigRow>
                )}
              </FileConfig>
            </FileHeader>
            {expanded && (
              <Editor
                value={content}
                filename={filename}
                language={language}
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
        <ActionButtons>
          <ActionButtonContainer>
            <ActionButton color="primary" onClick={() => {
              files.push({ ...defaultFile(), expanded: true, filename: `file${files.length}`, _key: Date.now() })
              setFiles(files);
              setFocused(files.length - 1);
            }}>
              <ActionButtonImage src={PlusIcon} alt="Add File" />
              <span>Add File</span>
            </ActionButton>
            <ActionButton color="primary" inverted onClick={() => {
              let element: HTMLInputElement = document.createElement('input');

              element.type = 'file';
              element.multiple = true;
              element.accept = 'text/*';

              element.addEventListener('change', async (e: any) => {
                let uploads = await Promise.all(Array.from(e.target.files, (file: File) => {
                  return (async () => ({
                    ...defaultFile(),
                    filename: file.name,
                    content: await file.text(),
                    expanded: true,
                    _key: Date.now(),
                  }))()
                }));

                setFiles([ ...files, ...uploads ])
              });

              element.click();
            }}>
              <ActionButtonImage src={UploadIcon} alt="Upload File" />
              <span>Upload File</span>
            </ActionButton>
          </ActionButtonContainer>
        </ActionButtons>
      </Container>
    </>
  )
}
