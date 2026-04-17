import React, { useEffect, useState } from 'react';
import { ScrollView, Alert, View } from 'react-native';
import { Button, RadioButton, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/auth';
import { apiPut } from '../../api/client';
import type { UserProfile } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [gender, setGender] = useState(1);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setGender(profile.gender || 1);
      setAge(profile.age ? String(profile.age) : '');
      setHeight(profile.height ? String(profile.height) : '');
      setWeight(profile.weight ? String(profile.weight) : '');
      setActivityLevel(profile.activityLevel || 2);
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!age || !height || !weight) {
      Alert.alert('请完整填写');
      return;
    }
    setLoading(true);
    try {
      const updated = await apiPut<UserProfile>('/users/profile', {
        gender,
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        activityLevel,
      });
      setProfile(updated);
      if (updated.profileComplete && navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>完善个人信息</Text>
      <Text style={{ marginBottom: 8 }}>性别</Text>
      <RadioButton.Group onValueChange={(v) => setGender(Number(v))} value={String(gender)}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <RadioButton.Item label="男" value="1" />
          <RadioButton.Item label="女" value="2" />
        </View>
      </RadioButton.Group>
      <TextInput label="年龄" value={age} onChangeText={setAge} keyboardType="number-pad" style={{ marginBottom: 12 }} />
      <TextInput label="身高 (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" style={{ marginBottom: 12 }} />
      <TextInput label="体重 (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" style={{ marginBottom: 12 }} />
      <Text style={{ marginBottom: 8 }}>活动量</Text>
      <SegmentedButtons
        value={String(activityLevel)}
        onValueChange={(v) => setActivityLevel(Number(v))}
        buttons={[
          { value: '1', label: '极少' },
          { value: '2', label: '轻度' },
          { value: '3', label: '中度' },
          { value: '4', label: '高强度' },
        ]}
        style={{ marginBottom: 16 }}
      />
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
        保存
      </Button>
    </ScrollView>
  );
}
