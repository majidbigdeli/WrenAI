import { useEffect, useRef, useState } from 'react';
import { Input, Button } from 'antd';
import styled from 'styled-components';
import { attachLoading } from '@/utils/helper';
import Image from 'next/image';
import { getIconSource } from '@/utils/getIconSource';

const PromptButton = styled(Button)`
  min-width: 72px;
  .ant-btn {
    padding: 4px !important; 
  }
`;
const StyledInputTextArea=styled(Input.TextArea)`
  border: none;
  .ant-input:focus, .ant-input-focused {
    border: none;
  }
`
interface Props {
  question: string;
  isProcessing: boolean;
  onAsk: (value: string) => Promise<void>;
  inputProps: {
    placeholder?: string;
  };
}

export default function PromptInput(props: Props) {
  const { onAsk, isProcessing, question, inputProps } = props;
  const $promptInput = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [innerLoading, setInnerLoading] = useState(false);

  useEffect(() => {
    if (question) setInputValue(question);
  }, [question]);

  useEffect(() => {
    if (!isProcessing) {
      $promptInput.current?.focus();
      setInputValue('');
    }
  }, [isProcessing]);

  const syncInputValue = (event) => {
    setInputValue(event.target.value);
  };

  const handleAsk = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;
    const startAsking = attachLoading(onAsk, setInnerLoading);
    startAsking(trimmedValue);
  };

  const inputEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.shiftKey) return;
    event.preventDefault();
    handleAsk();
  };

  const isDisabled = innerLoading || isProcessing;

  return (
    <>
      <StyledInputTextArea
        ref={$promptInput}
        // disable grammarly
        data-gramm="false"
        size="large"
        autoSize
        value={inputValue}
        onInput={syncInputValue}
        onPressEnter={inputEnter}
        disabled={isDisabled}
        {...inputProps}
      />
      <PromptButton
        type="primary"
        color='white'
        size="middle"
        icon={<Image src={getIconSource('typeprompt-outlined')} alt='typeprompt-outlined' width={18} height={18} />}
        onClick={handleAsk}
        disabled={isDisabled}
      >
        پرسیدن
      </PromptButton>
    </>
  );
}
