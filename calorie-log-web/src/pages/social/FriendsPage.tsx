import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
  acceptInvite,
  createInviteLink,
  deleteFriend,
  handleFriendRequest,
  listFriendRequests,
  listFriends,
  searchUser,
  sendFriendRequest,
  setFriendRemark,
  type Friend,
  type FriendRequestItem,
  type FriendSearch,
} from '../../api/social';

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<FriendSearch | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [acceptToken, setAcceptToken] = useState('');
  const [remarkTarget, setRemarkTarget] = useState<Friend | null>(null);
  const [remarkVal, setRemarkVal] = useState('');

  const reload = async () => {
    const [f, inc, out] = await Promise.all([
      listFriends(),
      listFriendRequests('incoming'),
      listFriendRequests('outgoing'),
    ]);
    setFriends(f);
    setIncoming(inc);
    setOutgoing(out);
  };

  useEffect(() => {
    reload();
  }, []);

  const onSearch = async () => {
    if (!phone.trim()) return;
    setSearchLoading(true);
    try {
      const r = await searchUser(phone.trim());
      setFound(r);
    } catch {
      setFound(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSendRequest = async () => {
    if (!found) return;
    await sendFriendRequest(found.userId);
    message.success('已发送好友请求');
    setFound({ ...found, relation: 'request_pending' });
    reload();
  };

  const onHandle = async (id: number, action: 'accept' | 'reject') => {
    await handleFriendRequest(id, action);
    message.success(action === 'accept' ? '已通过' : '已拒绝');
    reload();
  };

  const onDelete = async (id: number) => {
    await deleteFriend(id);
    message.success('已删除');
    reload();
  };

  const onRemarkSave = async () => {
    if (!remarkTarget) return;
    await setFriendRemark(remarkTarget.friendUserId, remarkVal);
    message.success('已保存');
    setRemarkTarget(null);
    reload();
  };

  const onGenerateInvite = async () => {
    const r = await createInviteLink();
    setInviteUrl(r.url);
    setInviteOpen(true);
  };

  const onAcceptInvite = async () => {
    if (!acceptToken.trim()) return;
    await acceptInvite(acceptToken.trim());
    message.success('已接受邀请，互为好友');
    setAcceptToken('');
    reload();
  };

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      message.success('已复制到剪贴板');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <Button icon={<UserAddOutlined />} onClick={onGenerateInvite}>
          生成邀请链接
        </Button>
      </Space>

      <Tabs
        defaultActiveKey="friends"
        items={[
          {
            key: 'friends',
            label: `好友 (${friends.length})`,
            children: (
              <Card>
                {friends.length === 0 ? (
                  <Empty description="还没有好友" />
                ) : (
                  <List
                    dataSource={friends}
                    renderItem={(f) => (
                      <List.Item
                        actions={[
                          <Button
                            key="remark"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setRemarkTarget(f);
                              setRemarkVal(f.remark ?? '');
                            }}
                          />,
                          <Popconfirm
                            key="del"
                            title="删除该好友？"
                            onConfirm={() => onDelete(f.friendUserId)}
                          >
                            <Button danger size="small" icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar>{(f.remark ?? f.nickname).slice(0, 1)}</Avatar>}
                          title={
                            <Space>
                              <Typography.Text strong>{f.remark ?? f.nickname}</Typography.Text>
                              <Tag color="blue">Lv{f.level}</Tag>
                              {f.recordedToday ? <Tag color="blue">今日已记录</Tag> : <Tag>未记录</Tag>}
                            </Space>
                          }
                          description={
                            <Space size="small" wrap>
                              <Typography.Text type="secondary">
                                总经验 {f.totalExp}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                连续 {f.continuousDays} 天
                              </Typography.Text>
                              {f.remark && (
                                <Typography.Text type="secondary">
                                  （原名 {f.nickname}）
                                </Typography.Text>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'add',
            label: '添加好友',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Card title="手机号搜索">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入对方手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onPressEnter={onSearch}
                    />
                    <Button type="primary" icon={<SearchOutlined />} loading={searchLoading} onClick={onSearch}>
                      搜索
                    </Button>
                  </Space.Compact>
                  {found && (
                    <Card.Grid hoverable={false} style={{ width: '100%', marginTop: 16 }}>
                      <Space>
                        <Avatar>{found.nickname.slice(0, 1)}</Avatar>
                        <div>
                          <div>
                            <Typography.Text strong>{found.nickname}</Typography.Text>
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                              Lv{found.level}
                            </Tag>
                          </div>
                          <Typography.Text type="secondary">{found.maskedPhone}</Typography.Text>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          {found.relation === 'self' && <Tag>这就是你</Tag>}
                          {found.relation === 'already_friend' && <Tag>已是好友</Tag>}
                          {found.relation === 'request_pending' && <Tag color="blue">请求待确认</Tag>}
                          {found.relation === 'not_friend' && (
                            <Button type="primary" onClick={onSendRequest}>
                              发送请求
                            </Button>
                          )}
                        </div>
                      </Space>
                    </Card.Grid>
                  )}
                </Card>

                <Card title="通过邀请链接接受好友">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="粘贴邀请 token"
                      value={acceptToken}
                      onChange={(e) => setAcceptToken(e.target.value)}
                    />
                    <Button type="primary" onClick={onAcceptInvite}>
                      接受
                    </Button>
                  </Space.Compact>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    从邀请链接复制 <code>?token=</code> 后面的部分
                  </Typography.Paragraph>
                </Card>
              </Space>
            ),
          },
          {
            key: 'requests',
            label: `待处理 (${incoming.filter((r) => r.status === 0).length})`,
            children: (
              <Card>
                {incoming.length === 0 ? (
                  <Empty description="暂无请求" />
                ) : (
                  <List
                    dataSource={incoming}
                    renderItem={(r) => (
                      <List.Item
                        actions={
                          r.status === 0
                            ? [
                                <Button key="ok" type="primary" size="small" icon={<CheckOutlined />} onClick={() => onHandle(r.id, 'accept')}>
                                  接受
                                </Button>,
                                <Button key="no" danger size="small" icon={<CloseOutlined />} onClick={() => onHandle(r.id, 'reject')}>
                                  拒绝
                                </Button>,
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Typography.Text>{r.fromNickname}</Typography.Text>
                              {r.status === 0 && <Tag color="blue">待处理</Tag>}
                              {r.status === 1 && <Tag color="blue">已接受</Tag>}
                              {r.status === 2 && <Tag>已拒绝</Tag>}
                              {r.status === 3 && <Tag>已过期</Tag>}
                            </Space>
                          }
                          description={r.message || '（无留言）'}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'outgoing',
            label: `已发送 (${outgoing.length})`,
            children: (
              <Card>
                {outgoing.length === 0 ? (
                  <Empty description="暂无发送中的请求" />
                ) : (
                  <List
                    dataSource={outgoing}
                    renderItem={(r) => (
                      <List.Item>
                        <List.Item.Meta
                          title={r.toNickname}
                          description={
                            <Space>
                              <Typography.Text type="secondary">{r.message || '（无留言）'}</Typography.Text>
                              {r.status === 0 && <Tag color="blue">等待对方确认</Tag>}
                              {r.status === 1 && <Tag color="blue">已通过</Tag>}
                              {r.status === 2 && <Tag>已拒绝</Tag>}
                              {r.status === 3 && <Tag>已过期</Tag>}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="邀请链接"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={[
          <Button key="close" onClick={() => setInviteOpen(false)}>
            关闭
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyInvite}>
            复制链接
          </Button>,
        ]}
      >
        <Alert message="链接 7 天内有效，被接受后即失效" type="info" style={{ marginBottom: 12 }} />
        <Input.TextArea value={inviteUrl ?? ''} autoSize rows={2} readOnly />
      </Modal>

      <Modal
        title={`设置备注 - ${remarkTarget?.nickname ?? ''}`}
        open={!!remarkTarget}
        onOk={onRemarkSave}
        onCancel={() => setRemarkTarget(null)}
      >
        <Input
          value={remarkVal}
          maxLength={50}
          onChange={(e) => setRemarkVal(e.target.value)}
          placeholder="不超过 50 字"
        />
      </Modal>
    </div>
  );
}
