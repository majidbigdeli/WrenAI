import { usePreviewDataMutation } from '@/apollo/client/graphql/home.generated';
import PreviewData from '@/components/dataPreview/PreviewData';
import { Props as AnswerResultProps } from '@/components/pages/home/promptThread/AnswerResult';
import usePromptThreadStore from '@/components/pages/home/promptThread/store';
import { DATA_SOURCE_OPTIONS } from '@/components/pages/setup/utils';
import useNativeSQL from '@/hooks/useNativeSQL';
import { BinocularsIcon } from '@/utils/icons';
import { nextTick } from '@/utils/time';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import CodeFilled from '@ant-design/icons/CodeFilled';
import {
  Alert,
  Button,
  Divider,
  Empty,
  message,
  Space,
  Switch,
  Typography,
} from 'antd';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect } from 'react';
import styled from 'styled-components';

const SQLCodeBlock = dynamic(() => import('@/components/code/SQLCodeBlock'), {
  ssr: false,
});

const { Text } = Typography;

const StyledPre = styled.pre`
  .adm_code-block {
    border-top: none;
    border-radius: 0px 0px 4px 4px;
  }
`;

const StyledToolBar = styled.div`
  background-color: var(--gray-2);
  height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--gray-3);
  border-radius: 4px 4px 0px 0px;
  direction: ltr;
`;

export default function ViewSQLTabContent(props: AnswerResultProps) {
  const { isLastThreadResponse, onInitPreviewDone, threadResponse } = props;

  const { onOpenAdjustSQLModal } = usePromptThreadStore();
  const { fetchNativeSQL, nativeSQLResult } = useNativeSQL();
  const [previewData, previewDataResult] = usePreviewDataMutation({
    onError: (error) => console.error(error),
  });

  const onPreviewData = async () => {
    await previewData({ variables: { where: { responseId: id } } });
  };

  const autoTriggerPreviewDataButton = async () => {
    await nextTick();
    await onPreviewData();
    await nextTick();
    onInitPreviewDone();
  };

  // when is the last step of the last thread response, auto trigger preview data button
  useEffect(() => {
    if (isLastThreadResponse) {
      autoTriggerPreviewDataButton();
    }
  }, [isLastThreadResponse]);

  const { id, sql } = threadResponse;

  const { hasNativeSQL, dataSourceType } = nativeSQLResult;
  const showNativeSQL = hasNativeSQL;

  const sqls =
    nativeSQLResult.nativeSQLMode && nativeSQLResult.loading === false
      ? nativeSQLResult.data
      : sql;

  const onChangeNativeSQL = async (checked: boolean) => {
    nativeSQLResult.setNativeSQLMode(checked);
    checked && fetchNativeSQL({ variables: { responseId: id } });
  };

  const onCopy = () => {
    if (!nativeSQLResult.nativeSQLMode) {
      message.success(
        <>
          شما SQL را کپی کردید. این گویش برای موتور است و ممکن است مستقیماً روی
          پایگاه داده شما اجرا نشود.
          {hasNativeSQL && (
            <>
              {' '}
              برای دریافت نسخه اجرایی، روی «<b>نمایش SQL</b>» کلیک کنید.
            </>
          )}
        </>,
      );
    }
  };

  return (
    <div className="text-md gray-10 p-6 pb-4">
      <Alert
        banner
        className="mb-3 adm-alert-info g-1"
        message={
          <>
            شما به طور پیش‌فرض در حال مشاهده‌ی SQL هستید. اگر می‌خواهید این
            پرس‌وجو را روی پایگاه داده‌ی خودتان اجرا کنید، برای دریافت سینتکس
            دقیق، روی «نمایش SQL اصلی» کلیک کنید.
            {/* <Typography.Link //TODOSH
              className="underline ml-1"
              href="https://docs.getwren.ai/oss/guide/home/wren_sql"
              target="_blank"
              rel="noopener noreferrer"
            >
              درباره SQL بیشتر بدانید
            </Typography.Link> */}
          </>
        }
        type="info"
      />
      <StyledPre className="p-0 mb-3">
        <StyledToolBar className="d-flex align-center justify-space-between text-family-base">
          <div>
            {nativeSQLResult.nativeSQLMode ? (
              <>
                <Image
                  className="ml-2"
                  src={DATA_SOURCE_OPTIONS[dataSourceType].logo}
                  alt={DATA_SOURCE_OPTIONS[dataSourceType].label}
                  width="22"
                  height="22"
                />
                <Text className="gray-8 text-medium text-sm">
                  {DATA_SOURCE_OPTIONS[dataSourceType].label}
                </Text>
              </>
            ) : (
              <span className="d-flex align-center gx-2">
                <Text className="gray-8 text-medium text-sm">SQL</Text>
              </span>
            )}
          </div>
          <Space split={<Divider type="vertical" className="m-0" />}>
            {showNativeSQL && (
              <div
                className="d-flex align-center cursor-pointer"
                onClick={() =>
                  onChangeNativeSQL(!nativeSQLResult.nativeSQLMode)
                }
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  className="mr-2"
                  size="small"
                  checked={nativeSQLResult.nativeSQLMode}
                  loading={nativeSQLResult.loading}
                />
                <Text className="gray-8 text-medium text-base">SQL نمایش</Text>
              </div>
            )}
            <Button
              type="link"
              data-ph-capture="true"
              data-ph-capture-attribute-name="view_sql_copy_sql"
              icon={<CodeFilled />}
              size="small"
              className="g-1"
              onClick={() => onOpenAdjustSQLModal({ sql, responseId: id })}
            >
              SQL بهبود
            </Button>
          </Space>
        </StyledToolBar>
        <SQLCodeBlock
          code={sqls}
          showLineNumbers
          maxHeight="300"
          loading={nativeSQLResult.loading}
          copyable
          onCopy={onCopy}
        />
      </StyledPre>
      <div className="mt-6">
        <Button
          size="small"
          icon={
            <BinocularsIcon
              style={{
                paddingBottom: 2,
                marginLeft: 8,
              }}
            />
          }
          loading={previewDataResult.loading}
          onClick={onPreviewData}
          data-ph-capture="true"
          data-ph-capture-attribute-name="view_sql_preview_data"
        >
          مشاهده نتایج
        </Button>
        {previewDataResult?.data?.previewData && (
          <div className="mt-2 mb-3">
            <PreviewData
              error={previewDataResult.error}
              loading={previewDataResult.loading}
              previewData={previewDataResult?.data?.previewData}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Sorry, we couldn't find any records that match your search criteria."
                  />
                ),
              }}
            />
            <div className="text-right">
              <Text className="text-base gray-6">نمایش تا ۵۰۰ ردیف</Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
