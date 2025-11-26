import {
  AskingTaskStatus,
  ThreadResponse,
  ThreadResponseAdjustment,
  ThreadResponseAdjustmentType,
  ThreadResponseAnswerDetail,
  ThreadResponseAnswerStatus,
} from '@/apollo/client/graphql/__types__';
import Preparation from '@/components/pages/home/preparation';
import { RecommendedQuestionsProps } from '@/components/pages/home/promptThread';
import ChartAnswer from '@/components/pages/home/promptThread/ChartAnswer';
import TextBasedAnswer, {
  getAnswerIsFinished,
} from '@/components/pages/home/promptThread/TextBasedAnswer';
import ViewSQLTabContent from '@/components/pages/home/promptThread/ViewSQLTabContent';
import RecommendedQuestions, {
  getRecommendedQuestionProps,
} from '@/components/pages/home/RecommendedQuestions';
import { canGenerateAnswer } from '@/hooks/useAskPrompt';
import { ANSWER_TAB_KEYS } from '@/utils/enum';
import CheckCircleFilled from '@ant-design/icons/CheckCircleFilled';
import CodeFilled from '@ant-design/icons/CodeFilled';
import MessageOutlined from '@ant-design/icons/MessageOutlined';
import PieChartFilled from '@ant-design/icons/PieChartFilled';
import ShareAltOutlined from '@ant-design/icons/ShareAltOutlined';
import { Tabs, Tag, Typography } from 'antd';
import clsx from 'clsx';
import { debounce, isEmpty } from 'lodash';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import usePromptThreadStore from './store';

const { Title, Text } = Typography;

const adjustmentType = {
  [ThreadResponseAdjustmentType.APPLY_SQL]: 'SQL ارائه شده توسط کاربر اعمال شد',
  [ThreadResponseAdjustmentType.REASONING]: 'مراحل استدلال بهبود یافت',
};

const StyledTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 0;
  }

  .ant-tabs-content-holder {
    border-left: 1px var(--gray-4) solid;
    border-right: 1px var(--gray-4) solid;
    border-bottom: 1px var(--gray-4) solid;
  }

  .ant-tabs-tab {
    .ant-typography {
      color: var(--gray-6);
    }

    [aria-label='check-circle'] {
      color: var(--gray-5);
    }

    [aria-label='code'] {
      color: var(--gray-5);
    }

    [aria-label='pie-chart'] {
      color: var(--gray-5);
    }

    .anticon {
      margin-right: unset;
    }

    &.ant-tabs-tab-active {
      .ant-typography {
        color: var(--gray-8);
      }

      [aria-label='check-circle'] {
        color: var(--green-5);
      }

      [aria-label='code'] {
        color: var(--geekblue-5);
      }

      [aria-label='pie-chart'] {
        color: var(--gold-6);
      }

      .adm-beta-tag {
        background-color: var(--geekblue-2);
        color: var(--geekblue-5);
      }
    }

    .adm-beta-tag {
      padding: 0 4px;
      line-height: 18px;
      margin: 0 0 0 6px;
      border-radius: 2px;
      background-color: var(--gray-5);
      color: white;
      border: none;
    }
  }
`;

export interface Props {
  motion: boolean;
  threadResponse: ThreadResponse;
  isLastThreadResponse: boolean;
  isOpeningQuestion: boolean;
  onInitPreviewDone: () => void;
}

const QuestionTitle = (props) => {
  const { question, className } = props;
  return (
    <Title
      className={clsx('d-flex bg-gray-1 rounded mt-0', className)}
      level={4}
    >
      <MessageOutlined className="geekblue-5 mt-1 ml-3" />
      <Text className="text-medium gray-8">{question}</Text>
    </Title>
  );
};

const renderRecommendedQuestions = (
  isLastThreadResponse: boolean,
  recommendedQuestionProps,
  onSelect: RecommendedQuestionsProps['onSelect'],
) => {
  if (!isLastThreadResponse || !recommendedQuestionProps.show) return null;

  return (
    <RecommendedQuestions
      className="mt-5 mb-4"
      {...recommendedQuestionProps.state}
      onSelect={onSelect}
    />
  );
};

const AdjustmentInformation = (props: {
  adjustment: ThreadResponseAdjustment;
}) => {
  const { adjustment } = props;

  return (
    <div className="rounded bg-gray-3 gray-6 py-2 px-3 mb-2">
      <div className="d-flex align-center gx-2">
        <ShareAltOutlined className="gray-7" />
        <div className="flex-grow-1 gray-7">
          بهبود پاسخ
          <Tag className="gray-6 border border-gray-5 bg-gray-3 ml-3 text-medium">
            {adjustmentType[adjustment.type]}
          </Tag>
        </div>
      </div>
    </div>
  );
};

const isNeedGenerateAnswer = (answerDetail: ThreadResponseAnswerDetail) => {
  const isFinished = getAnswerIsFinished(answerDetail?.status);
  // it means the background task has not started yet, but answer is pending for generating
  const isProcessing = [
    ThreadResponseAnswerStatus.NOT_STARTED,
    ThreadResponseAnswerStatus.PREPROCESSING,
    ThreadResponseAnswerStatus.FETCHING_DATA,
  ].includes(answerDetail?.status);
  return answerDetail?.queryId === null && !isFinished && !isProcessing;
};

export default function AnswerResult(props: Props) {
  const { threadResponse, isLastThreadResponse } = props;

  const {
    onGenerateThreadRecommendedQuestions,
    onGenerateTextBasedAnswer,
    onGenerateChartAnswer,
    // recommend questions
    recommendedQuestions,
    showRecommendedQuestions,
    onSelectRecommendedQuestion,
    preparation,
  } = usePromptThreadStore();

  const {
    askingTask,
    adjustmentTask,
    answerDetail,
    breakdownDetail,
    id,
    question,
    adjustment,
  } = threadResponse;

  const resultStyle = isLastThreadResponse
    ? { minHeight: 'calc(100vh - (194px))' }
    : null;

  const isAdjustment = !!adjustment;

  const recommendedQuestionProps = getRecommendedQuestionProps(
    recommendedQuestions,
    showRecommendedQuestions,
  );

  const isAnswerPrepared = !!answerDetail?.queryId || !!answerDetail?.status;
  const isBreakdownOnly = useMemo(() => {
    // we support rendering different types of answers now, so we need to check if it's old data.
    // existing thread response's answerDetail is null.
    return answerDetail === null && !isEmpty(breakdownDetail);
  }, [answerDetail, breakdownDetail]);

  // initialize generate answer
  useEffect(() => {
    if (isBreakdownOnly) return;
    if (
      canGenerateAnswer(askingTask, adjustmentTask) &&
      isNeedGenerateAnswer(answerDetail)
    ) {
      const debouncedGenerateAnswer = debounce(
        () => {
          onGenerateTextBasedAnswer(id);
          onGenerateThreadRecommendedQuestions();
        },
        250,
        { leading: false, trailing: true },
      );
      debouncedGenerateAnswer();

      return () => {
        debouncedGenerateAnswer.cancel();
      };
    }
  }, [
    isBreakdownOnly,
    askingTask?.status,
    adjustmentTask?.status,
    answerDetail?.status,
  ]);

  const onTabClick = (activeKey: string) => {
    if (activeKey === ANSWER_TAB_KEYS.CHART && !threadResponse.chartDetail) {
      onGenerateChartAnswer(id);
    }
  };

  const showAnswerTabs =
    askingTask?.status === AskingTaskStatus.FINISHED ||
    isAnswerPrepared ||
    isBreakdownOnly;

  return (
    <div style={resultStyle} data-jsid="answerResult">
      {isAdjustment && <AdjustmentInformation adjustment={adjustment} />}
      <QuestionTitle className="mb-4" question={question} />
      <Preparation
        className="mb-3"
        {...preparation}
        data={threadResponse}
        minimized={isAnswerPrepared}
      />
      {showAnswerTabs && (
        <>
          <StyledTabs type="card" size="small" onTabClick={onTabClick}>
            {!isBreakdownOnly && (
              <Tabs.TabPane
                key={ANSWER_TAB_KEYS.ANSWER}
                tab={
                  <div className="select-none align-center d-flex">
                    <CheckCircleFilled className="ml-2" />
                    <Text>پاسخ</Text>
                  </div>
                }
              >
                <TextBasedAnswer {...props} />
              </Tabs.TabPane>
            )}
            <Tabs.TabPane
              key={ANSWER_TAB_KEYS.VIEW_SQL}
              tab={
                <div className="select-none align-center d-flex">
                  <CodeFilled className="ml-2" />
                  <Text>مشاهده SQL</Text>
                </div>
              }
            >
              <ViewSQLTabContent {...props} />
            </Tabs.TabPane>
            <Tabs.TabPane
              key="chart"
              tab={
                <div className="select-none align-center d-flex">
                  <PieChartFilled className="ml-2" />
                  <Text>نمودار</Text>
                </div>
              }
            >
              <ChartAnswer {...props} />
            </Tabs.TabPane>
          </StyledTabs>
          {renderRecommendedQuestions(
            isLastThreadResponse,
            recommendedQuestionProps,
            onSelectRecommendedQuestion,
          )}
        </>
      )}
    </div>
  );
}
