import { Typography } from 'antd';
import GlobalOutlined from '@ant-design/icons/GlobalOutlined';

const { Text } = Typography;

export default function GlobalLabel() {
  return (
    <>
      <GlobalOutlined className="ml-2" />
      <Text className="gray-9">Global</Text>
    </>
  );
}
