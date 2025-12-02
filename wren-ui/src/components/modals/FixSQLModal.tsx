import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Typography, Alert } from 'antd';
import { ERROR_TEXTS } from '@/utils/error';
import { ModalAction } from '@/hooks/useModalAction';
import { attachLoading } from '@/utils/helper';
import { parseGraphQLError } from '@/utils/errorHandler';
import SQLEditor from '@/components/editor/SQLEditor';
import ErrorCollapse from '@/components/ErrorCollapse';
import PreviewData from '@/components/dataPreview/PreviewData';
import { usePreviewSqlMutation } from '@/apollo/client/graphql/sql.generated';

type Props = ModalAction<{ sql: string; responseId: number }> & {
  loading?: boolean;
};

export function FixSQLModal(props: Props) {
  const { visible, defaultValue, loading, onSubmit, onClose } = props;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form] = Form.useForm();

  // Handle errors via try/catch blocks rather than onError callback
  const [previewSqlMutation, previewSqlResult] = usePreviewSqlMutation();

  const error = useMemo(() => {
    if (!previewSqlResult.error) return null;
    const graphQLError = parseGraphQLError(previewSqlResult.error);
    return { ...graphQLError, shortMessage: 'Invalid SQL syntax' };
  }, [previewSqlResult.error]);

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(defaultValue || {});
  }, [form, defaultValue, visible]);

  const validateSql = async () => {
    const sql = form.getFieldValue('sql');
    await previewSqlMutation({
      variables: { data: { sql, limit: 1, dryRun: true } },
    });
  };

  const previewData = async () => {
    form
      .validateFields()
      .then(async (values) => {
        await attachLoading(
          previewSqlMutation,
          setPreviewLoading,
        )({
          variables: { data: { sql: values.sql, limit: 50 } },
        });
      })
      .catch(console.error);
  };

  const reset = () => {
    form.resetFields();
    previewSqlResult.reset();
  };

  const submit = async () => {
    form
      .validateFields()
      .then(async (values) => {
        await validateSql();
        await onSubmit(values.sql);
        onClose();
      })
      .catch(console.error);
  };

  const showPreview = previewSqlResult.data || previewSqlResult.loading;

  return (
    <Modal
      title="رفع مشکل SQL"
      width={640}
      visible={visible}
      okText="ارسال"
      cancelText="انصراف"
      onOk={submit}
      onCancel={onClose}
      confirmLoading={loading}
      maskClosable={false}
      destroyOnClose
      centered
      afterClose={reset}
    >
      <Typography.Text className="d-block gray-7 mb-3">
        دستور SQL زیر نیاز به اصلاح دارد:
      </Typography.Text>
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="دستور SQL"
          name="sql"
          required
          rules={[
            {
              required: true,
              message: ERROR_TEXTS.FIX_SQL.SQL.REQUIRED,
            },
          ]}
        >
          <SQLEditor autoComplete autoFocus />
        </Form.Item>
      </Form>
      <div className="my-3">
        <Typography.Text className="d-block gray-7 mb-2">
          پیش‌نمایش داده‌ها (۵۰ ردیف)
        </Typography.Text>
        <Button
          onClick={previewData}
          loading={previewLoading}
          disabled={previewLoading}
        >
          پیش‌نمایش داده‌ها
        </Button>
        {showPreview && (
          <div className="my-3">
            <PreviewData
              loading={previewLoading}
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
