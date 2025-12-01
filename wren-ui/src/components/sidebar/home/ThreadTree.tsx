import SidebarTree, {
  sidebarCommonStyle,
} from '@/components/sidebar/SidebarTree';
import {
  createTreeGroupNode,
  GroupActionButton,
} from '@/components/sidebar/utils';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import { Path } from '@/utils/enum';
import { DataNode } from 'antd/lib/tree';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import TreeTitle from './TreeTitle';
import { MagicPencilOutlined } from '@/utils/svgs/MagicPencilOutlined';
import { useSchemaChangeQuery, useTriggerDataSourceDetectionMutation } from '@/apollo/client/graphql/dataSource.generated';
import { message } from 'antd';
import { getRelativeTime } from '@/utils/time';


const StyledSidebarTree = styled(SidebarTree)`
  ${sidebarCommonStyle}
  padding: 12px 16px;
  .adm-treeNode {
    &.adm-treeNode__thread {
      .ant-tree-title {
        flex-grow: 1;
        display: inline-flex;
        align-items: center;
        span:first-child,
        .adm-treeTitle__title {
          flex-grow: 1;
        }
      }
    }
  }
`;

export interface ThreadData {
  id: string;
  name: string;
}

interface Props {
  threads: ThreadData[];
  selectedKeys: React.Key[];
  onSelect: (selectKeys: React.Key[], info: any) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDeleteThread: (id: string) => Promise<void>;
}

export default function ThreadTree(props: Props) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    threads = [],
    selectedKeys,
    onSelect,
    onRename,
    onDeleteThread,
  } = props;

  const { data: schemaChangeData, refetch: refetchSchemaChange } =
    useSchemaChangeQuery({
      fetchPolicy: 'cache-and-network',
    });

  const [triggerDataSourceDetection, { loading: isDetecting }] =
    useTriggerDataSourceDetectionMutation({
      onError: (error) => console.error(error),
      onCompleted: async (data) => {
        if (data.triggerDataSourceDetection) {
          message.warning('تغییر ساختار داده‌ شناسایی شد.');
        } else {
          message.success('هیچ تغییر ساختار داده‌ای وجود ندارد.');
        }
        await refetchSchemaChange();
      },
    });

  const getThreadGroupNode = createTreeGroupNode({
    groupName: 'گفتگوها',
    groupKey: 'threads',
    actions: [
      {
        key: 'trigger-schema-detection',
        disabled: isDetecting,
        icon: () => (
          <ReloadOutlined
            spin={isDetecting}
            title={
              schemaChangeData?.schemaChange.lastSchemaChangeTime
                ? `آخرین به‌روزرسانی ${getRelativeTime(schemaChangeData?.schemaChange.lastSchemaChangeTime)}`
                : ''
            }
            onClick={() => triggerDataSourceDetection()}
          />
        ),
      },
      {
        key: 'new-thread',
        render: () => (
          <GroupActionButton
            size="middle"
            icon={<MagicPencilOutlined className="gray-8" />}
            onClick={() => router.push(Path.Home)}
            className="g-1 bg-gray-1"
          >
            گفتگو جدید
          </GroupActionButton>
        ),
      },
    ],
  });

  const [tree, setTree] = useState<DataNode[]>(getThreadGroupNode());

  useEffect(() => {
    setTree((_tree) =>
      getThreadGroupNode({
        quotaUsage: threads.length,
        children: threads.map((thread) => {
          const nodeKey = thread.id;

          return {
            className: 'adm-treeNode adm-treeNode__thread',
            id: nodeKey,
            isLeaf: true,
            key: nodeKey,
            title: (
              <TreeTitle
                id={nodeKey}
                title={thread.name}
                onRename={onRename}
                onDelete={onDeleteThread}
              />
            ),
          };
        }),
      }),
    );
  }, [params?.id, threads, isDetecting]);

  return (
    <StyledSidebarTree
      treeData={tree}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
    />
  );
}
