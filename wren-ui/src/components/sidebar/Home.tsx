import clsx from 'clsx';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import styled from 'styled-components';
import { Path } from '@/utils/enum';
import SidebarTree, {
  StyledTreeNodeLink,
  useSidebarTreeState,
} from './SidebarTree';
import ThreadTree, { ThreadData } from './home/ThreadTree';
import Image from 'next/image';
import { getIconSource } from '@/utils/getIconSource';

export interface Props {
  data: {
    threads: ThreadData[];
  };
  onSelect: (selectKeys) => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
}

export const StyledSidebarTree = styled(SidebarTree)`
  .adm-treeNode {
    &.adm-treeNode__thread {
      padding: 0px 16px 0px 4px !important;

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

const SideBarHead = styled("div")`{
  background-color: white;
  height: 64px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #F1F3F8;
}`

export default function Home(props: Props) {
  const { data, onSelect, onRename, onDelete } = props;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { threads } = data;

  const { treeSelectedKeys, setTreeSelectedKeys } = useSidebarTreeState();

  useEffect(() => {
    params?.id && setTreeSelectedKeys([params.id] as string[]);
  }, [params?.id]);

  const onDeleteThread = async (threadId: string) => {
    try {
      await onDelete(threadId);
      if (params?.id == threadId) {
        router.push(Path.Home);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onTreeSelect = (selectedKeys: React.Key[], _info: any) => {
    // prevent deselected
    if (selectedKeys.length === 0) return;

    setTreeSelectedKeys(selectedKeys);
    onSelect(selectedKeys);
  };

  return (
    <>
      <SideBarHead>
        <Image className="ml-2"
          src={getIconSource('agent-filled')}
          alt={'agent-filled'}
          width="18"
          height="18" />
        <span className="text-medium">دستیار مدیر</span>
      </SideBarHead>
      <StyledTreeNodeLink
        className={clsx({
          'adm-treeNode--selected': router.pathname === Path.HomeDashboard,
          'd-flex align-center': true,
        })}
        href={Path.HomeDashboard}
      >
        <Image className="ml-2"
          src={getIconSource('category-outlined')}
          alt={'category-outlined'}
          width="18"
          height="18" />
        <span className="text-medium">داشبورد</span>
      </StyledTreeNodeLink>
      <ThreadTree
        threads={threads}
        selectedKeys={treeSelectedKeys}
        onSelect={onTreeSelect}
        onRename={onRename}
        onDeleteThread={onDeleteThread}
      />
    </>
  );
}
