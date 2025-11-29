import { Path } from '@/utils/enum';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import APIManagement from './APIManagement';
import Home, { Props as HomeSidebarProps } from './Home';
import Knowledge from './Knowledge';
import Modeling, { Props as ModelingSidebarProps } from './Modeling';

const Layout = styled.div`
  position: relative;
  height: 100%;
  background-color: var(--gray-2);
  color: var(--gray-8);
  padding-bottom: 12px;
  overflow-x: hidden;
`;

const Content = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

type Props = (ModelingSidebarProps | HomeSidebarProps) & {
  onOpenSettings?: () => void;
};

const DynamicSidebar = (
  props: Props & {
    pathname: string;
  },
) => {
  const { pathname, ...restProps } = props;

  const getContent = () => {
    //TODOSH routes
    if (pathname.startsWith(Path.Home)) {
      return <Home {...(restProps as HomeSidebarProps)} />;
    }

    if (pathname.startsWith(Path.Modeling)) {
      return <Modeling {...(restProps as ModelingSidebarProps)} />;
    }

    if (pathname.startsWith(Path.Knowledge)) {
      return <Knowledge />;
    }

    if (pathname.startsWith(Path.APIManagement)) {
      return <APIManagement />;
    }

    return null;
  };

  return <Content>{getContent()}</Content>;
};

export default function Sidebar(props: Props) {
  const router = useRouter();

  return (
    <Layout className="d-flex flex-column">
      <DynamicSidebar {...props} pathname={router.pathname} />
      {/* <LearningSection />
      <div className="border-t border-gray-4 pt-2">
        <StyledButton type="text" block onClick={onSettingsClick}>
          <SettingOutlined className="text-md" />
          Settings
        </StyledButton>
        <StyledButton type="text" block>
          <Link
            className="d-flex align-center"
            href="https://discord.com/invite/5DvshJqG8Z"
            target="_blank"
            rel="noopener noreferrer"
            data-ph-capture="true"
            data-ph-capture-attribute-name="cta_go_to_discord"
          >
            <DiscordIcon className="mr-2" style={{ width: 16 }} /> Discord
          </Link>
        </StyledButton>
        <StyledButton type="text" block>
          <Link
            className="d-flex align-center"
            href="https://github.com/Canner/WrenAI"
            target="_blank"
            rel="noopener noreferrer"
            data-ph-capture="true"
            data-ph-capture-attribute-name="cta_go_to_github"
          >
            <GithubIcon className="mr-2" style={{ width: 16 }} /> GitHub
          </Link>
        </StyledButton>
      </div> */}
    </Layout>
  );
}
