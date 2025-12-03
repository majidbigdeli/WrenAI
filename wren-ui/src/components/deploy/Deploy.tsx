import { useEffect } from 'react';
import { Button, Space, Tooltip, Typography, message } from 'antd';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { SyncStatus } from '@/apollo/client/graphql/__types__';
import { useDeployMutation } from '@/apollo/client/graphql/deploy.generated';
import { useDeployStatusContext } from '@/components/deploy/Context';
import CloudSyncOutlined from '@ant-design/icons/CloudSyncOutlined';


const { Text } = Typography;

const getDeployStatus = (deploying: boolean, status: SyncStatus) => {
  const syncStatus = deploying ? SyncStatus.IN_PROGRESS : status;

  return (
    {
      [SyncStatus.IN_PROGRESS]: (
        <Space size={[4, 0]}>
          <LoadingOutlined className="ml-1 gray-1" />
          <Text className="gray-1">در حال استقرار...</Text>
        </Space>
      ),
      [SyncStatus.SYNCRONIZED]: (
        <Space size={[4, 0]}>
          <CheckCircleOutlined className="ml-1 green-7" />
          <Text className="gray-1">همگام‌سازی شده</Text>
        </Space>
      ),
      [SyncStatus.UNSYNCRONIZED]: (
        <Space size={[4, 0]}>
          <WarningOutlined className="ml-1 gold-6" />
          <Text className="gray-1">تغییرات اعمال نشده</Text>
        </Space>
      ),
    }[syncStatus] || ''
  );
};

export default function Deploy() {
  const deployContext = useDeployStatusContext();
  const { data, loading, startPolling, stopPolling } = deployContext;

  const [deployMutation, { data: deployResult, loading: deploying }] =
    useDeployMutation({
      onError: (error) => console.error(error),
      onCompleted: (data) => {
        if (data.deploy?.status === 'FAILED') {
          console.error('Failed to deploy - ', data.deploy?.error);
          message.error(
            'استقرار ناموفق بود. لطفاً برای جزئیات بیشتر، گزارش را بررسی کنید.',
          );
        }
      },
    });

  useEffect(() => {
    // Stop polling deploy status if deploy failed
    if (
      deployResult?.deploy?.status === 'FAILED' &&
      data?.modelSync.status === SyncStatus.UNSYNCRONIZED
    ) {
      stopPolling();
    }
  }, [deployResult, data]);

  const syncStatus = data?.modelSync.status;

  const onDeploy = () => {
    deployMutation();
    startPolling(1000);
  };

  useEffect(() => {
    if (syncStatus === SyncStatus.SYNCRONIZED) stopPolling();
  }, [syncStatus]);

  const disabled =
    deploying ||
    loading ||
    [SyncStatus.SYNCRONIZED, SyncStatus.IN_PROGRESS].includes(syncStatus);

  return (
    <Tooltip title={getDeployStatus(deploying, syncStatus)} visible={disabled}>
      <CloudSyncOutlined
        className={`${disabled ? '' : 'gray-8'}`}
        disabled={disabled}
        onClick={() => onDeploy()}
        data-guideid="deploy-model"
        style={{
          fontSize: "18px"
        }}
      />
    </Tooltip>
  );
}
