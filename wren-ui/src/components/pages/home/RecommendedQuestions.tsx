import {
  RecommendedQuestionsTask,
  RecommendedQuestionsTaskStatus,
} from '@/apollo/client/graphql/__types__';
import { getIconSource } from '@/utils/getIconSource';
import { makeIterable } from '@/utils/iteration';
import { Button, Skeleton } from 'antd';
import clsx from 'clsx';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

export interface SelectQuestionProps {
  question: string;
  sql: string;
}

interface Props {
  items: { question: string; sql: string }[];
  loading?: boolean;
  error?: {
    shortMessage?: string;
    code?: string;
    message?: string;
    stacktrace?: string[];
  };
  className?: string;
  onSelect: ({ question, sql }: SelectQuestionProps) => void;
  onRequestRecommendedQuestions: () => void;
}

const StyledSkeleton = styled(Skeleton)`
  padding: 4px 0;
  .ant-skeleton-paragraph {
    margin-bottom: 0;
    li {
      height: 14px;
      + li {
        margin-top: 12px;
      }
    }
  }
`;

export const getRecommendedQuestionProps = (
  data: RecommendedQuestionsTask,
  show = true,
) => {
  if (!data || !show) return { show: false };
  const questions = (data?.questions || []).slice(0, 3).map((item) => ({
    question: item.question,
    sql: item.sql,
  }));
  const loading = data?.status === RecommendedQuestionsTaskStatus.GENERATING;
  return {
    show: loading || questions.length > 0,
    state: {
      items: questions,
      loading,
      error: data?.error,
    },
  };
};

const QuestionItem = (props: {
  index: number;
  question: string;
  sql: string;
  onSelect: ({ question, sql }: SelectQuestionProps) => void;
}) => {
  const { index, question, sql, onSelect } = props;
  return (
    <div className={clsx(index > 0 && 'mt-1')}>
      <span
        className="cursor-pointer hover:text"
        onClick={() => onSelect({ question, sql })}
      >
        {index + 1}- {question}
      </span>
    </div>
  );
};
const QuestionList = makeIterable(QuestionItem);

export default function RecommendedQuestions(props: Props) {
  const {
    items = [],
    loading,
    className,
    onSelect,
    onRequestRecommendedQuestions,
  } = props;

  const data = useMemo(
    () => items.map(({ question, sql }) => ({ question, sql })),
    [items],
  );

  return (
    <div className={clsx('d-flex rounded py-3 g-3 flex-column', className)}>
      <div>
        <Button
          type="ghost"
          color="white"
          size="middle"
          icon={
            <Image
              className="ml-1"
              src={getIconSource('agent-filled')}
              alt={'agent-filled'}
              color="red"
              width="12"
              height="12"
            />
          }
          onClick={onRequestRecommendedQuestions}
        >
          <p className="text-semi-bold" style={{ margin: 0 }}>
            درخواست سوالات پیشنهادی
          </p>
        </Button>
      </div>
      <div className="gray-8">
        <StyledSkeleton
          active
          loading={loading}
          paragraph={{ rows: 3 }}
          title={false}
        >
          <QuestionList data={data} onSelect={onSelect} />
        </StyledSkeleton>
      </div>
    </div>
  );
}
