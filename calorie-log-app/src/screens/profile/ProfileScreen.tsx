import React from 'react';
import { ScrollView, Alert, View } from 'react-native';
import { Avatar, Button, Card, List, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/auth';
import { logout } from '../../api/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const GENDER: Record<number, string> = { 0: '未设置', 1: '男', 2: '女' };
const ACTIVITY: Record<number, string> = { 1: '极少', 2: '轻度', 3: '中度', 4: '高强度' };

export default function ProfileScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const doLogout = useAuthStore((s) => s.logout);

  if (!profile) return null;

  const handleLogout = async () => {
    Alert.alert('确认退出登录', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (_) {}
          await doLogout();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Text label={(profile.nickname || '用')[0]} size={64} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="titleMedium">{profile.nickname}</Text>
              <Text variant="bodySmall">{profile.phone || profile.email}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      <Card>
        <List.Item title="性别" description={GENDER[profile.gender ?? 0]} />
        <List.Item title="年龄" description={profile.age ? String(profile.age) : '-'} />
        <List.Item title="身高" description={profile.height ? `${profile.height} cm` : '-'} />
        <List.Item title="体重" description={profile.weight ? `${profile.weight} kg` : '-'} />
        <List.Item
          title="活动量"
          description={profile.activityLevel ? ACTIVITY[profile.activityLevel] : '-'}
        />
        <List.Item title="时区" description={profile.timezone} />
        <List.Item title="微信绑定" description={profile.wechatBound ? '已绑定' : '未绑定'} />
      </Card>
      <Button mode="contained" onPress={() => navigation.navigate('ProfileSetup')} style={{ marginTop: 16 }}>
        修改个人信息
      </Button>
      <Button mode="outlined" onPress={handleLogout} style={{ marginTop: 12 }}>
        退出登录
      </Button>
    </ScrollView>
  );
}
