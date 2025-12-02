import { AskingTaskStatus } from '@/apollo/client/graphql/__types__';
import { getIsFinished } from '@/hooks/useAskPrompt';
import { attachLoading } from '@/utils/helper';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import { Button, Space, Tag } from 'antd';
import { useState } from 'react';
import type { PreparedTask, Props } from './index';

export default function PreparationStatus(
  props: Props & { preparedTask: PreparedTask },
) {
  const {
    data,
    preparedTask,
    onStopAskingTask,
    onReRunAskingTask,
    onStopAdjustTask,
    onReRunAdjustTask,
  } = props;
  const [stopLoading, setStopLoading] = useState(false);
  const [reRunLoading, setReRunLoading] = useState(false);
  const isProcessing = !getIsFinished(preparedTask.status);

  const onCancel = (e) => {
    e.stopPropagation();
    const stopPreparedTask = preparedTask.isAdjustment
      ? onStopAdjustTask
      : onStopAskingTask;
    const stopAskingTask = attachLoading(stopPreparedTask, setStopLoading);
    stopAskingTask(preparedTask.queryId);
  };

  const onReRun = (e) => {
    e.stopPropagation();
    const reRunPreparedTask = preparedTask.isAdjustment
      ? onReRunAdjustTask
      : onReRunAskingTask;
    const reRunAskingTask = attachLoading(reRunPreparedTask, setReRunLoading);
    reRunAskingTask(data);
  };

  if (isProcessing) {
    return (
      <Button
        danger
        size="small"
        onClick={onCancel}
        loading={stopLoading}
      >
        انصراف
      </Button>
    );
  } else if (preparedTask.status === AskingTaskStatus.STOPPED) {
    return (
      <Space className="-ml-4">
        <Tag color="red">توسط کاربر لغو شد</Tag>
        <Button
          icon={<ReloadOutlined />}
          className="gray-7"
          size="small"
          type="text"
          onClick={onReRun}
          loading={reRunLoading}
        >
          اجرا مجدد
        </Button>
      </Space>
    );
  } else if (preparedTask.status === AskingTaskStatus.FINISHED) {
    const showView = data.view !== null;
    const showSqlPair = !!preparedTask?.candidates[0]?.sqlPair;
    return (
      <div className="gray-6">
        {showView || showSqlPair ? '1 مرحله' : '3 مرحله'}
      </div>
    );
  }

  return null;
}
