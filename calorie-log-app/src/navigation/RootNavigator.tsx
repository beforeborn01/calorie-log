import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileSetupScreen from '../screens/profile/ProfileSetupScreen';
import AddFoodScreen from '../screens/food/AddFoodScreen';
import GoalSetupScreen from '../screens/goal/GoalSetupScreen';
import StatisticsScreen from '../screens/statistics/StatisticsScreen';
import { useAuthStore } from '../store/auth';
import { setUnauthorizedHandler } from '../api/client';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
  ProfileSetup: undefined;
  AddFood: { date: string; mealType: 1 | 2 | 3 | 4 };
  GoalSetup: undefined;
  Statistics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const initialized = useAuthStore((s) => s.initialized);
  const authenticated = useAuthStore((s) => s.authenticated);
  const profile = useAuthStore((s) => s.profile);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    hydrate();
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [hydrate, logout]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
        {!authenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: '登录' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '注册' }} />
          </>
        ) : !profile?.profileComplete ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ title: '完善资料' }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '食养记' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ title: '修改资料' }} />
            <Stack.Screen name="AddFood" component={AddFoodScreen} options={{ title: '添加食物' }} />
            <Stack.Screen name="GoalSetup" component={GoalSetupScreen} options={{ title: '健身目标' }} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
