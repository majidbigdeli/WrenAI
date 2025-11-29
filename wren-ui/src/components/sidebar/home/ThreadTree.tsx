import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DataNode } from 'antd/lib/tree';
import { Path } from '@/utils/enum';
import { useParams, useRouter } from 'next/navigation';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import SidebarTree, {
  sidebarCommonStyle,
} from '@/components/sidebar/SidebarTree';
import {
  createTreeGroupNode,
  GroupActionButton,
} from '@/components/sidebar/utils';
import TreeTitle from './TreeTitle';
import Image from 'next/image';
import { getIconSource } from '@/utils/getIconSource';

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

  const getThreadGroupNode = createTreeGroupNode({
    groupName: 'گفتگوها',
    groupKey: 'threads',
    actions: [
      {
        key: 'new-thread',
        render: () => (
          <GroupActionButton
            size="middle"
            icon={<Image src={getIconSource('magic-pencil-outlined')} width={18} height={18} alt='new-thread' color='red' />}
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
  }, [params?.id, threads]);

  return (
    <StyledSidebarTree
      treeData={tree}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
    />
  );
}
