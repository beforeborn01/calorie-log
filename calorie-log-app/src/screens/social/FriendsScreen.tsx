import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

export default function FriendsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'list' | 'add' | 'requests'>('list');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);

  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<FriendSearch | null>(null);
  const [inviteToken, setInviteToken] = useState('');

  const [remarkTarget, setRemarkTarget] = useState<Friend | null>(null);
  const [remarkVal, setRemarkVal] = useState('');

  const reload = useCallback(async () => {
    try {
      const [f, inc, out] = await Promise.all([
        listFriends(),
        listFriendRequests('incoming'),
        listFriendRequests('outgoing'),
      ]);
      setFriends(f);
      setIncoming(inc);
      setOutgoing(out);
    } catch (e: any) {
      Alert.alert('加载失败', e.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSearch = async () => {
    if (!phone.trim()) return;
    try {
      setFound(await searchUser(phone.trim()));
    } catch (e: any) {
      setFound(null);
      Alert.alert('搜索失败', e.message);
    }
  };

  const onSendRequest = async () => {
    if (!found) return;
    try {
      await sendFriendRequest(found.userId);
      Alert.alert('已发送');
      setFound({ ...found, relation: 'request_pending' });
      reload();
    } catch (e: any) {
      Alert.alert('发送失败', e.message);
    }
  };

  const onHandle = async (id: number, action: 'accept' | 'reject') => {
    try {
      await handleFriendRequest(id, action);
      reload();
    } catch (e: any) {
      Alert.alert('处理失败', e.message);
    }
  };

  const onDelete = (f: Friend) => {
    Alert.alert(`删除好友 ${f.nickname}？`, undefined, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteFriend(f.friendUserId);
          reload();
        },
      },
    ]);
  };

  const onSaveRemark = async () => {
    if (!remarkTarget) return;
    try {
      await setFriendRemark(remarkTarget.friendUserId, remarkVal);
      setRemarkTarget(null);
      reload();
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  const onGenerateInvite = async () => {
    try {
      const r = await createInviteLink();
      Alert.alert('邀请链接（7 天有效）', r.url);
    } catch (e: any) {
      Alert.alert('生成失败', e.message);
    }
  };

  const onAcceptInvite = async () => {
    if (!inviteToken.trim()) return;
    try {
      await acceptInvite(inviteToken.trim());
      setInviteToken('');
      Alert.alert('已接受邀请');
      reload();
    } catch (e: any) {
      Alert.alert('操作失败', e.message);
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="好友" />
        <Appbar.Action icon="link-plus" onPress={onGenerateInvite} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as any)}
          buttons={[
            { value: 'list', label: `好友 (${friends.length})` },
            { value: 'add', label: '添加' },
            { value: 'requests', label: `请求 (${incoming.filter((r) => r.status === 0).length})` },
          ]}
          style={{ marginBottom: 12 }}
        />

        {tab === 'list' && (
          <Card>
            <Card.Content>
              {friends.length === 0 && <Text>还没有好友</Text>}
              {friends.map((f) => (
                <View key={f.friendshipId}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                          {f.remark ?? f.nickname}
                        </Text>
                        <Chip compact style={{ marginLeft: 8 }}>
                          Lv{f.level}
                        </Chip>
                        {f.recordedToday ? (
                          <Chip compact style={{ marginLeft: 6, backgroundColor: '#f6ffed' }}>
                            今日已记录
                          </Chip>
                        ) : (
                          <Chip compact style={{ marginLeft: 6 }}>
                            未记录
                          </Chip>
                        )}
                      </View>
                      <Text variant="bodySmall">
                        经验 {f.totalExp} · 连续 {f.continuousDays} 天
                      </Text>
                    </View>
                    <IconButton
                      icon="pencil"
                      onPress={() => {
                        setRemarkTarget(f);
                        setRemarkVal(f.remark ?? '');
                      }}
                    />
                    <IconButton icon="delete" onPress={() => onDelete(f)} />
                  </View>
                  <Divider />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {tab === 'add' && (
          <View>
            <Card style={{ marginBottom: 12 }}>
              <Card.Title title="手机号搜索" />
              <Card.Content>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput
                    label="手机号"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="number-pad"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button mode="contained" onPress={onSearch} style={{ alignSelf: 'center' }}>
                    搜索
                  </Button>
                </View>
                {found && (
                  <View style={{ marginTop: 12 }}>
                    <Text>
                      {found.nickname}（Lv{found.level}） · {found.maskedPhone}
                    </Text>
                    {found.relation === 'self' && <Text>这是你自己</Text>}
                    {found.relation === 'already_friend' && <Text>已是好友</Text>}
                    {found.relation === 'request_pending' && <Text>请求待确认</Text>}
                    {found.relation === 'not_friend' && (
                      <Button mode="contained" style={{ marginTop: 8 }} onPress={onSendRequest}>
                        发送请求
                      </Button>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
            <Card>
              <Card.Title title="邀请 token 接受" />
              <Card.Content>
                <TextInput
                  label="邀请 token"
                  value={inviteToken}
                  onChangeText={setInviteToken}
                  style={{ marginBottom: 8 }}
                />
                <Button mode="contained" onPress={onAcceptInvite}>
                  接受邀请
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {tab === 'requests' && (
          <View>
            <Card style={{ marginBottom: 12 }}>
              <Card.Title title="收到的请求" />
              <Card.Content>
                {incoming.length === 0 && <Text>暂无请求</Text>}
                {incoming.map((r) => (
                  <View key={r.id} style={{ paddingVertical: 6 }}>
                    <Text variant="bodyMedium">
                      {r.fromNickname} {statusLabel(r.status)}
                    </Text>
                    {r.message && <Text variant="bodySmall">{r.message}</Text>}
                    {r.status === 0 && (
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        <Button mode="contained" onPress={() => onHandle(r.id, 'accept')} style={{ marginRight: 8 }}>
                          接受
                        </Button>
                        <Button mode="outlined" onPress={() => onHandle(r.id, 'reject')}>
                          拒绝
                        </Button>
                      </View>
                    )}
                    <Divider style={{ marginTop: 6 }} />
                  </View>
                ))}
              </Card.Content>
            </Card>
            <Card>
              <Card.Title title="发出的请求" />
              <Card.Content>
                {outgoing.length === 0 && <Text>无</Text>}
                {outgoing.map((r) => (
                  <Text key={r.id} style={{ paddingVertical: 4 }}>
                    {r.toNickname} · {statusLabel(r.status)}
                  </Text>
                ))}
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!remarkTarget} onDismiss={() => setRemarkTarget(null)}>
          <Dialog.Title>{`设置备注 - ${remarkTarget?.nickname ?? ''}`}</Dialog.Title>
          <Dialog.Content>
            <TextInput value={remarkVal} onChangeText={setRemarkVal} maxLength={50} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemarkTarget(null)}>取消</Button>
            <Button onPress={onSaveRemark}>保存</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function statusLabel(status: number): string {
  switch (status) {
    case 0:
      return '待处理';
    case 1:
      return '已接受';
    case 2:
      return '已拒绝';
    default:
      return '已过期';
  }
}
