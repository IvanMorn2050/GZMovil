import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    const ok = login(email.trim().toLowerCase(), password);
    if (!ok) {
      Alert.alert('Credenciales incorrectas', 'Correo o contraseña inválidos.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>GuardianZero</Text>
        <Text style={styles.appSub}>Sistema de Reportes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Iniciar Sesión</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#aab4bc"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor="#aab4bc"
            secureTextEntry={!verPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerPassword(!verPassword)}>
            <Text style={styles.eyeText}>{verPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
          <Text style={styles.btnPrimaryText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Demo: admin@guardianzero.com / 1234</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#3ab5c6';
const DARK = '#0d4f5c';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: DARK,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logo: { width: 100, height: 100, marginBottom: 8 },
  appName: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  appSub: { color: '#a8d8e0', fontSize: 13, marginTop: 2 },
  form: { padding: 28, paddingTop: 32 },
  titulo: { fontSize: 22, fontWeight: '700', color: DARK, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a6470', marginBottom: 6 },
  input: {
    backgroundColor: '#f0f4f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a2730',
    marginBottom: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 12, top: 12, padding: 4 },
  eyeText: { fontSize: 18 },
  btnPrimary: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { color: '#6b7c85', fontSize: 14 },
  registerLink: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
  hint: { textAlign: 'center', color: '#aab4bc', fontSize: 12, marginTop: 20 },
});
