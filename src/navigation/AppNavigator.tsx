import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../hooks/useAuth';
import { AuthStackParamList, RootStackParamList, TabParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForoScreen from '../screens/ForoScreen';
import CapacitacionesScreen from '../screens/CapacitacionesScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3ab5c6',
        tabBarInactiveTintColor: '#0d4f5c',
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/home_activo.jpeg') : require('../../assets/home.png')}
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Foro"
        component={ForoScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/foro_activo.jpeg') : require('../../assets/foro.png')}
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Capacitaciones"
        component={CapacitacionesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/capacitaciones_activo.jpeg')
                  : require('../../assets/capacitaciones.jpeg')
              }
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('../../assets/perfil_activo.jpeg') : require('../../assets/perfil.jpeg')}
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { usuario } = useAuth();

  return (
    <NavigationContainer>
      {usuario ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#e8edf0',
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabIcon: { width: 28, height: 28 },
});
