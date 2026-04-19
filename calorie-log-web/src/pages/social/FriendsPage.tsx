import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Input,
  Modal,
  Popconfirm,
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
import { Chip, PaperCard, Pill, SketchButton } from '../../components/sketch';

type Tab = 'friends' | 'add' | 'requests' | 'outgoing';

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
      <div className="hand ink-soft" style={{ marginTop: 6 }}>{text}</div>
    </div>
  );
}

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
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

  const pendingCount = incoming.filter((r) => r.status === 0).length;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link className="hand accent" to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>FRIENDS · 好友</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">好友</span>
          </h1>
        </div>
        <SketchButton primary onClick={onGenerateInvite}>
          <UserAddOutlined style={{ marginRight: 4 }} />生成邀请链接
        </SketchButton>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Pill active={tab === 'friends'} onClick={() => setTab('friends')}>
          好友 ({friends.length})
        </Pill>
        <Pill active={tab === 'add'} onClick={() => setTab('add')}>
          添加
        </Pill>
        <Pill active={tab === 'requests'} onClick={() => setTab('requests')}>
          待处理 ({pendingCount})
        </Pill>
        <Pill active={tab === 'outgoing'} onClick={() => setTab('outgoing')}>
          已发送 ({outgoing.length})
        </Pill>
      </div>

      {tab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <PaperCard><EmptyState text="还没有好友，去添加一个吧" /></PaperCard>
          ) : (
            friends.map((f) => (
              <PaperCard key={f.friendUserId} style={{ marginBottom: 10, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar style={{ background: 'var(--accent)' }}>
                    {(f.remark ?? f.nickname).slice(0, 1)}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="hand" style={{ fontWeight: 700, fontSize: 15 }}>{f.remark ?? f.nickname}</span>
                      <Chip color="var(--accent-soft)">Lv {f.level}</Chip>
                      {f.recordedToday
                        ? <Chip color="var(--accent-soft)">今日已记录</Chip>
                        : <Chip color="var(--paper-3)">未记录</Chip>}
                    </div>
                    <div className="hand ink-soft" style={{ fontSize: 13, marginTop: 4 }}>
                      总经验 <span className="mono">{f.totalExp}</span> · 连续 <span className="mono">{f.continuousDays}</span> 天
                      {f.remark && <span style={{ marginLeft: 8 }}>（原名 {f.nickname}）</span>}
                    </div>
                  </div>
                  <SketchButton
                    size="sm"
                    aria-label="设置备注"
                    onClick={() => {
                      setRemarkTarget(f);
                      setRemarkVal(f.remark ?? '');
                    }}
                  >
                    <EditOutlined />
                  </SketchButton>
                  <Popconfirm title="删除该好友？" onConfirm={() => onDelete(f.friendUserId)}>
                    <SketchButton size="sm" aria-label="删除">
                      <DeleteOutlined />
                    </SketchButton>
                  </Popconfirm>
                </div>
              </PaperCard>
            ))
          )}
        </div>
      )}

      {tab === 'add' && (
        <div>
          <PaperCard style={{ marginBottom: 12 }}>
            <h3 className="display" style={{ fontSize: 22, margin: '0 0 12px' }}>手机号搜索</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="输入对方手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onPressEnter={onSearch}
                style={{ flex: 1 }}
              />
              <SketchButton primary onClick={onSearch} disabled={searchLoading} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                <SearchOutlined style={{ marginRight: 4 }} />{searchLoading ? '搜索中…' : '搜索'}
              </SketchButton>
            </div>
            {found && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  border: '1px dashed rgba(0,0,0,0.15)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <Avatar style={{ background: 'var(--accent)' }}>{found.nickname.slice(0, 1)}</Avatar>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div>
                    <span className="hand" style={{ fontWeight: 700 }}>{found.nickname}</span>
                    <Chip color="var(--accent-soft)" style={{ marginLeft: 8 }}>Lv {found.level}</Chip>
                  </div>
                  <div className="hand ink-soft" style={{ fontSize: 13 }}>{found.maskedPhone}</div>
                </div>
                <div>
                  {found.relation === 'self' && <Chip color="var(--paper-3)">这就是你</Chip>}
                  {found.relation === 'already_friend' && <Chip color="var(--accent-soft)">已是好友</Chip>}
                  {found.relation === 'request_pending' && <Chip color="var(--accent-soft)">请求待确认</Chip>}
                  {found.relation === 'not_friend' && (
                    <SketchButton primary size="sm" onClick={onSendRequest}>发送请求</SketchButton>
                  )}
                </div>
              </div>
            )}
          </PaperCard>

          <PaperCard>
            <h3 className="display" style={{ fontSize: 22, margin: '0 0 12px' }}>通过邀请链接接受好友</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="粘贴邀请 token"
                value={acceptToken}
                onChange={(e) => setAcceptToken(e.target.value)}
                style={{ flex: 1 }}
              />
              <SketchButton primary onClick={onAcceptInvite} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>接受</SketchButton>
            </div>
            <p className="hand ink-soft" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
              从邀请链接复制 <code className="mono">?token=</code> 后面的部分
            </p>
          </PaperCard>
        </div>
      )}

      {tab === 'requests' && (
        <div>
          {incoming.length === 0 ? (
            <PaperCard><EmptyState text="暂无好友请求" /></PaperCard>
          ) : (
            incoming.map((r) => (
              <PaperCard key={r.id} style={{ marginBottom: 10, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="hand" style={{ fontWeight: 700 }}>{r.fromNickname}</span>
                      {r.status === 0 && <Chip color="var(--accent-soft)">待处理</Chip>}
                      {r.status === 1 && <Chip color="var(--accent-soft)">已接受</Chip>}
                      {r.status === 2 && <Chip color="var(--paper-3)">已拒绝</Chip>}
                      {r.status === 3 && <Chip color="var(--paper-3)">已过期</Chip>}
                    </div>
                    <div className="hand ink-soft" style={{ fontSize: 13, marginTop: 4 }}>
                      {r.message || '（无留言）'}
                    </div>
                  </div>
                  {r.status === 0 && (
                    <>
                      <SketchButton primary size="sm" onClick={() => onHandle(r.id, 'accept')}>
                        <CheckOutlined style={{ marginRight: 4 }} />接受
                      </SketchButton>
                      <SketchButton size="sm" onClick={() => onHandle(r.id, 'reject')}>
                        <CloseOutlined style={{ marginRight: 4 }} />拒绝
                      </SketchButton>
                    </>
                  )}
                </div>
              </PaperCard>
            ))
          )}
        </div>
      )}

      {tab === 'outgoing' && (
        <div>
          {outgoing.length === 0 ? (
            <PaperCard><EmptyState text="暂无发送中的请求" /></PaperCard>
          ) : (
            outgoing.map((r) => (
              <PaperCard key={r.id} style={{ marginBottom: 10, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span className="hand" style={{ fontWeight: 700 }}>{r.toNickname}</span>
                  <span className="hand ink-soft" style={{ flex: 1, fontSize: 13 }}>
                    {r.message || '（无留言）'}
                  </span>
                  {r.status === 0 && <Chip color="var(--accent-soft)">等待对方确认</Chip>}
                  {r.status === 1 && <Chip color="var(--accent-soft)">已通过</Chip>}
                  {r.status === 2 && <Chip color="var(--paper-3)">已拒绝</Chip>}
                  {r.status === 3 && <Chip color="var(--paper-3)">已过期</Chip>}
                </div>
              </PaperCard>
            ))
          )}
        </div>
      )}

      <Modal
        title={<span className="display" style={{ fontSize: 22 }}>邀请链接</span>}
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <SketchButton onClick={() => setInviteOpen(false)}>关闭</SketchButton>
            <SketchButton primary onClick={copyInvite}>
              <CopyOutlined style={{ marginRight: 4 }} />复制链接
            </SketchButton>
          </div>
        }
      >
        <Alert message="链接 7 天内有效，被接受后即失效" type="info" style={{ marginBottom: 12 }} />
        <Input.TextArea value={inviteUrl ?? ''} autoSize rows={2} readOnly />
      </Modal>

      <Modal
        title={<span className="display" style={{ fontSize: 22 }}>设置备注 - {remarkTarget?.nickname ?? ''}</span>}
        open={!!remarkTarget}
        onCancel={() => setRemarkTarget(null)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <SketchButton onClick={() => setRemarkTarget(null)}>取消</SketchButton>
            <SketchButton primary onClick={onRemarkSave}>保存</SketchButton>
          </div>
        }
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
