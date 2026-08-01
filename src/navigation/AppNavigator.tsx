import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../hooks/useAuth';
import { AuthStackParamList, RootStackParamList, TabParamList } from '../types';
import { notificationService } from '../services/notificationService';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForoScreen from '../screens/ForoScreen';
import ForoDetailScreen from '../screens/ForoDetailScreen';
import CapacitacionesScreen from '../screens/CapacitacionesScreen';
import VoluntarioScreen from '../screens/VoluntarioScreen';

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
  const { usuario } = useAuth();
  const esVoluntario = usuario?.rol === 'voluntario' || usuario?.rol === 'coordinador';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#0E3A44',
        tabBarInactiveTintColor: '#0E3A44',
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
      {esVoluntario && (
        <Tab.Screen
          name="Voluntario"
          component={VoluntarioScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={
                  focused
                    ? require('../../assets/ayuda_activo.png')
                    : require('../../assets/ayuda.png')
                }
                style={styles.tabIcon}
                resizeMode="contain"
              />
            ),
            tabBarBadgeStyle: { backgroundColor: '#E74C3C', fontSize: 10 },
          }}
        />
      )}
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
      <RootStack.Screen
        name="ForoDetail"
        component={ForoDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (usuario) {
      notificationService.start(usuario);
    } else {
      notificationService.stop();
    }
    return () => notificationService.stop();
  }, [usuario?.id]);

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1AA6A6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {usuario ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F8' },
  tabBar: {
    backgroundColor: '#B6C3C9',
    borderTopColor: '#9aadb5',
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabIcon: { width: 28, height: 28 },
});
