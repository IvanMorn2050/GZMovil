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
import { AuthStackParamList, RolUsuario } from '../types';
import { useAuth } from '../hooks/useAuth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const ROLES: { valor: RolUsuario; titulo: string; desc: string; emoji: string }[] = [
  {
    valor: 'ciudadano',
    titulo: 'Ciudadano',
    desc: 'Reporta desastres en tu comunidad',
    emoji: '🏘️',
  },
  {
    valor: 'voluntario',
    titulo: 'Voluntario',
    desc: 'Atiende emergencias en el campo',
    emoji: '🤝',
  },
];

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [rol, setRol] = useState<RolUsuario>('ciudadano');
  const [verPassword, setVerPassword] = useState(false);

  const handleRegister = () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmar.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    if (password !== confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Error', 'La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    const resultado = register(nombre.trim(), email.trim().toLowerCase(), password, rol);
    if (resultado.success) {
      Alert.alert(
        '¡Registro exitoso!',
        `Bienvenido como ${rol === 'voluntario' ? 'Voluntario' : 'Ciudadano'}. Ya puedes iniciar sesión.`,
        [{ text: 'Ir a login', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Error', resultado.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>GuardianZero</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Crear Cuenta</Text>
        <Text style={styles.subtitulo}>¿Cómo quieres participar?</Text>

        <View style={styles.rolesRow}>
          {ROLES.map((r) => {
            const activo = rol === r.valor;
            return (
              <TouchableOpacity
                key={r.valor}
                style={[styles.rolCard, activo && styles.rolCardActivo]}
                onPress={() => setRol(r.valor)}
                activeOpacity={0.8}
              >
                <Text style={styles.rolEmoji}>{r.emoji}</Text>
                <Text style={[styles.rolTitulo, activo && styles.rolTituloActivo]}>{r.titulo}</Text>
                <Text style={[styles.rolDesc, activo && styles.rolDescActivo]}>{r.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor="#aab4bc"
          value={nombre}
          onChangeText={setNombre}
        />

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
            placeholder="Mínimo 4 caracteres"
            placeholderTextColor="#aab4bc"
            secureTextEntry={!verPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerPassword(!verPassword)}>
            <Text style={styles.eyeText}>{verPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Repite tu contraseña"
          placeholderTextColor="#aab4bc"
          secureTextEntry={!verPassword}
          value={confirmar}
          onChangeText={setConfirmar}
        />

        <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Registrarse como {rol === 'voluntario' ? 'Voluntario' : 'Ciudadano'}</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: { position: 'absolute', left: 20, top: 52 },
  backText: { color: '#a8d8e0', fontSize: 15, fontWeight: '600' },
  logo: { width: 72, height: 72, marginBottom: 6 },
  appName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  form: { padding: 24, paddingBottom: 48 },
  titulo: { fontSize: 22, fontWeight: '700', color: DARK, marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#8a9ba8', marginBottom: 18 },
  rolesRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  rolCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0eaee',
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f8fbfc',
  },
  rolCardActivo: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY + '15',
  },
  rolEmoji: { fontSize: 28, marginBottom: 6 },
  rolTitulo: { fontSize: 14, fontWeight: '700', color: '#4a6470', marginBottom: 4 },
  rolTituloActivo: { color: DARK },
  rolDesc: { fontSize: 11, color: '#aab4bc', textAlign: 'center', lineHeight: 15 },
  rolDescActivo: { color: '#5a8090' },
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: '#6b7c85', fontSize: 14 },
  loginLink: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
});
