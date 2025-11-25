import { ReactNode } from 'react';
import { ButtonProps, Modal, ModalProps } from 'antd';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';

type DeleteModalProps = {
  disabled?: boolean;
  modalProps?: ModalProps;
  onConfirm: () => void;
  style?: any;
} & Partial<ButtonProps>;

type Config = {
  icon?: ReactNode;
  itemName?: string;
  content?: string;
};

export const makeDeleteModal =
  (Component, config?: Config) => (props: DeleteModalProps) => {
    const { title, content, modalProps = {}, onConfirm, ...restProps } = props;

    return (
      <Component
        icon={config.icon}
        onClick={() =>
          Modal.confirm({
            autoFocusButton: null,
            cancelText: 'انصراف',
            content:
              config?.content ||
              'This will be permanently deleted, please confirm you want to delete it.',
            icon: <ExclamationCircleOutlined />,
            okText: 'حذف',
            onOk: onConfirm,
            title: `آیا مطمئن هستید که می‌خواهید ${config?.itemName} را حذف کنید?`,
            width: 464,
            ...modalProps,
            okButtonProps: {
              ...modalProps.okButtonProps,
              danger: true,
            },
          })
        }
        {...restProps}
      />
    );
  };

const DefaultDeleteButton = (props) => {
  const { icon = null, disabled, ...restProps } = props;
  return (
    <a className={disabled ? '' : 'red-5'} {...restProps}>
      {icon}حذف
    </a>
  );
};

export default makeDeleteModal(DefaultDeleteButton);

// Customize delete modal
export const DeleteThreadModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'thread',
  content:
    'این کار تمام تاریخچه نتایج این تاپیک را برای همیشه حذف می‌کند، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteViewModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'view',
  content:
    'این برای همیشه حذف خواهد شد، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteModelModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'model',
  content:
    'این برای همیشه حذف خواهد شد، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteCalculatedFieldModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'calculated field',
  content:
    'این برای همیشه حذف خواهد شد، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteRelationshipModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'relationship',
  content:
    'این برای همیشه حذف خواهد شد، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteDashboardItemModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'dashboard item',
  content:
    'این برای همیشه حذف خواهد شد، لطفاً تأیید کنید که می‌خواهید آن را حذف کنید.',
});

export const DeleteQuestionSQLPairModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'question-SQL pair',
  content:
    'این اقدام دائمی است و قابل بازگشت نیست. آیا مطمئن هستید که می‌خواهید ادامه دهید؟',
});

export const DeleteInstructionModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="ml-2" />,
  itemName: 'instruction',
  content:
    'این اقدام دائمی است و قابل بازگشت نیست. آیا مطمئن هستید که می‌خواهید ادامه دهید؟',
});
