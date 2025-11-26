import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Typography } from 'antd';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { ERROR_TEXTS } from '@/utils/error';
import { ModalAction } from '@/hooks/useModalAction';
import SQLEditor from '@/components/editor/SQLEditor';
import { parseGraphQLError } from '@/utils/errorHandler';
import ErrorCollapse from '@/components/ErrorCollapse';
import PreviewData from '@/components/dataPreview/PreviewData';
import { usePreviewSqlMutation } from '@/apollo/client/graphql/sql.generated';
import styled from 'styled-components';

interface AdjustSQLFormValues {
  responseId: number;
  sql: string;
}

type Props = ModalAction<AdjustSQLFormValues, AdjustSQLFormValues> & {
  loading?: boolean;
};

const FormItem = styled(Form.Item)`
  .ant-form-item-label {
    text-align: start;
  }
`;

export default function AdjustSQLModal(props: Props) {
  const { defaultValue, loading, onClose, onSubmit, visible } = props;

  const [form] = Form.useForm();
  const [error, setError] =
    useState<ReturnType<typeof parseGraphQLError>>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Handle errors via try/catch blocks rather than onError callback
  const [previewSqlMutation, previewSqlResult] = usePreviewSqlMutation();

  const sqlValue = Form.useWatch('sql', form);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        sql: defaultValue?.sql,
      });
    }
  }, [visible, defaultValue]);

  const handleReset = () => {
    previewSqlResult.reset();
    setShowPreview(false);
    setError(null);
    form.resetFields();
  };

  const onValidateSQL = async () => {
    await previewSqlMutation({
      variables: {
        data: {
          sql: sqlValue,
          limit: 1,
          dryRun: true,
        },
      },
    });
  };

  const handleError = (error) => {
    const graphQLError = parseGraphQLError(error);
    setError({ ...graphQLError, shortMessage: 'Invalid SQL syntax' });
    console.error(graphQLError);
  };

  const onPreviewData = async () => {
    setError(null);
    setPreviewing(true);
    try {
      await onValidateSQL();
      setShowPreview(true);
      await previewSqlMutation({
        variables: {
          data: {
            sql: sqlValue,
            limit: 50,
          },
        },
      });
    } catch (error) {
      setShowPreview(false);
      handleError(error);
    } finally {
      setPreviewing(false);
    }
  };

  const onSubmitButton = () => {
    setError(null);
    setSubmitting(true);
    setShowPreview(false);
    form
      .validateFields()
      .then(async (values) => {
        try {
          await onValidateSQL();
          await onSubmit({
            responseId: defaultValue?.responseId,
            sql: values.sql,
          });
          onClose();
        } catch (error) {
          handleError(error);
        } finally {
          setSubmitting(false);
        }
      })
      .catch((err) => {
        setSubmitting(false);
        console.error(err);
      });
  };

  const confirmLoading = loading || submitting;
  const disabled = !sqlValue;

  return (
    <Modal
      title="بهبود SQL"
      centered
      closable
      confirmLoading={confirmLoading}
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      visible={visible}
      okText="ارسال"
      cancelText="انصراف"
      width={640}
      cancelButtonProps={{ disabled: confirmLoading }}
      okButtonProps={{ disabled: previewSqlResult.loading }}
      afterClose={() => handleReset()}
      footer={
        <div
          className="d-flex justify-space-between align-center"
          style={{ flex: 1 }}
        >
          <div
            className="text-sm ml-2 d-flex justify-space-between align-center"
            style={{ width: 300 }}
          >
            <InfoCircleOutlined className="ml-2 text-sm gray-7" />
            <Typography.Text
              type="secondary"
              className="text-sm gray-7 text-right"
            >
              عبارت SQL مورد استفاده در اینجا از <b>SQL</b> پیروی می‌کند، که بر
              مبنای ANSI SQL بوده و برای AI بهینه‌سازی شده است.{` `}
              <Typography.Link
                type="secondary"
                href="https://docs.getwren.ai/oss/guide/home/wren_sql"
                target="_blank"
                rel="noopener noreferrer"
              >
                درباره سینتکس بیشتر بدانید.
              </Typography.Link>
            </Typography.Text>
          </div>
          <div className="d-flex g-2">
            <Button onClick={onClose}>انصراف</Button>
            <Button
              type="primary"
              onClick={onSubmitButton}
              loading={confirmLoading}
            >
              ارسال
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} preserve={false} layout="vertical">
        <FormItem
          label="دستور SQL"
          name="sql"
          required
          rules={[
            {
              required: true,
              message: ERROR_TEXTS.SQL_PAIR.SQL.REQUIRED,
            },
          ]}
        >
          <SQLEditor autoComplete autoFocus />
        </FormItem>
      </Form>
      <div className="my-3">
        <Typography.Text className="d-block gray-7 mb-2">
          پیش‌نمایش داده‌ها (۵۰ ردیف)
        </Typography.Text>
        <Button
          onClick={onPreviewData}
          loading={previewing}
          disabled={disabled}
        >
          پیش‌نمایش داده‌ها
        </Button>
        {showPreview && (
          <div className="my-3">
            <PreviewData
              loading={previewing}
              previewData={previewSqlResult?.data?.previewSql}
              copyable={false}
            />
          </div>
        )}
      </div>
      {!!error && (
        <Alert
          showIcon
          type="error"
          message={error.shortMessage}
          description={<ErrorCollapse message={error.message} />}
        />
      )}
    </Modal>
  );
}
