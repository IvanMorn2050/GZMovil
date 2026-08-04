import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCapacitaciones, inscribirse } from '../services/capacitacionesService';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

/* ── Datos ──────────────────────────────── */
const CURSOS = [
  {
    id: '1',
    nombre: 'Cruz Roja Mexicana — Delegación Querétaro',
    desc: 'Cursos y talleres de primeros auxilios, RCP y atención prehospitalaria impartidos por la Cruz Roja Mexicana.',
    proveedor: 'Cruz Roja Mexicana',
    url: 'https://www.cruzrojamexicana.org.mx/?sedeId=33',
    imagen: require('../../assets/CruzRoja.jpg'),
  },
  {
    id: '2',
    nombre: 'Taller de Primeros Auxilios',
    desc: 'Taller de primeros auxilios impartido por la Facultad de Estudios Superiores (FENO), UNAM.',
    proveedor: 'FENO — UNAM',
    url: 'https://share.google/6B8XLCuLNnh4qtLS6',
    imagen: require('../../assets/capa1.jpg'),
  },
  {
    id: '3',
    nombre: 'Consultores CMC',
    desc: 'Consultoría y capacitación especializada en protección civil y gestión de riesgos.',
    proveedor: 'Consultores CMC',
    url: 'https://consultorescmc.com/',
    imagen: require('../../assets/Proteccion_Civil.jpg'),
  },
  {
    id: '4',
    nombre: 'Cursos de Protección Civil',
    desc: 'Plataforma de cursos en línea sobre protección civil, prevención de riesgos y manejo de emergencias.',
    proveedor: 'cursosdeproteccioncivil.com',
    url: 'https://cursosdeproteccioncivil.com',
    imagen: require('../../assets/Rescate1.jpg'),
  },
  {
    id: '5',
    nombre: 'Preparados.gob.mx',
    desc: 'Portal oficial del Gobierno de México con guías y recursos para la preparación ante emergencias y desastres.',
    proveedor: 'Gobierno de México',
    url: 'https://preparados.gob.mx/',
    imagen: require('../../assets/Pagina_P.jpg'),
  },
];

const ORGANIZACIONES = [
  {
    id: '1',
    nombre: 'Cruz Roja Mexicana',
    desc: 'Atención de emergencias y primeros auxilios',
    imagen: require('../../assets/CruzRoja.jpg'),
  },
  {
    id: '2',
    nombre: 'Protección Civil',
    desc: 'Coordinación de respuesta a desastres',
    imagen: require('../../assets/Proteccion_Civil.jpg'),
  },
  {
    id: '3',
    nombre: 'Gobierno de Querétaro',
    desc: 'Gestión de emergencias en el estado',
    imagen: require('../../assets/Gob.Queretaro.png'),
  },
  {
    id: '4',
    nombre: 'Univ. Politécnica de Querétaro',
    desc: 'Formación técnica y apoyo tecnológico',
    imagen: require('../../assets/Logo_UPQ.jpg'),
  },
  {
    id: '5',
    nombre: 'Solidaridad México',
    desc: 'Red de voluntariado y apoyo comunitario',
    imagen: require('../../assets/SolDMex.jpg'),
  },
  {
    id: '6',
    nombre: 'Portal de Recursos',
    desc: 'Manuales, guías y materiales de preparación',
    imagen: require('../../assets/Pagina_P.jpg'),
  },
];

const PROXIMAS = [
  {
    id: '1',
    titulo: 'Curso Avanzado de RCP',
    fecha: '25 de octubre, 2026',
    duracion: '4 horas',
    lugar: null as string | null,
    requisitos: 'Curso Básico de RCP',
  },
  {
    id: '2',
    titulo: 'Búsqueda y Rescate Urbano',
    fecha: '25 de octubre, 2026',
    duracion: '8 horas',
    lugar: 'Centro de Capacitación Central — Aula 3' as string | null,
    requisitos: 'RCP Básico',
  },
  {
    id: '3',
    titulo: 'Gestión de Incidentes',
    fecha: '25 de octubre, 2026',
    duracion: '4 horas',
    lugar: 'Centro de Capacitación Central — Aula 4' as string | null,
    requisitos: 'RCP Básico',
  },
];

interface CursoDb {
  id: number;
  titulo: string;
  descripcion: string;
  nivel: string | null;
  duracion_horas: number | null;
  imagen_url: string | null;
  modalidad: string | null;
  estatus: string;
  cupo_maximo: number | null;
  organizacion: string | null;
}

/* ── Sub-componentes ────────────────────── */
function SectionTitle({ text }: { text: string }) {
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionAccent} />
      <Text style={s.sectionText}>{text}</Text>
    </View>
  );
}

/* ── Pantalla ───────────────────────────── */
export default function CapacitacionesScreen() {
  const [cursosDb, setCursosDb]       = useState<CursoDb[]>([]);
  const [cargandoDb, setCargandoDb]   = useState(true);
  const [inscribiendoId, setInscribiendoId] = useState<number | null>(null);

  useEffect(() => {
    getCapacitaciones()
      .then((data) => setCursosDb(data ?? []))
      .catch(() => {})
      .finally(() => setCargandoDb(false));
  }, []);

  const handleInscribirse = async (curso: CursoDb) => {
    setInscribiendoId(curso.id);
    try {
      await inscribirse(curso.id);
      Alert.alert('¡Listo!', `Te inscribiste a "${curso.titulo}".`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar la inscripción.');
    } finally {
      setInscribiendoId(null);
    }
  };

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Formación y Capacitación</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cursos disponibles ── */}
        <SectionTitle text="Cursos de Formación Disponibles" />

        {CURSOS.map((curso) => (
          <View key={curso.id} style={s.cursoCard}>
            {/* Imagen — cover sin deformación */}
            <Image source={curso.imagen} style={s.cursoImg} resizeMode="cover" />

            {/* Cuerpo de la tarjeta */}
            <View style={s.cursoCuerpo}>
              {/* Título */}
              <Text style={s.cursoNombre}>{curso.nombre}</Text>
              <Text style={s.cursoDesc}>{curso.desc}</Text>

              {/* Proveedor */}
              <Text style={s.cursoProveedor}>{curso.proveedor}</Text>

              {/* Botón */}
              <TouchableOpacity
                style={s.verBtn}
                activeOpacity={0.8}
                onPress={() => Linking.openURL(curso.url)}
              >
                <Text style={s.verBtnText}>Ver Curso</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {cargandoDb && (
          <ActivityIndicator color={BUTTON} style={{ paddingVertical: 12 }} />
        )}

        {cursosDb.map((curso) => (
          <View key={`db-${curso.id}`} style={s.cursoCard}>
            {curso.imagen_url ? (
              <Image source={{ uri: curso.imagen_url }} style={s.cursoImg} resizeMode="cover" />
            ) : (
              <Image source={require('../../assets/capa1.jpg')} style={s.cursoImg} resizeMode="cover" />
            )}

            <View style={s.cursoCuerpo}>
              <View style={s.badgesRow}>
                {!!curso.nivel && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{curso.nivel}</Text>
                  </View>
                )}
                {!!curso.duracion_horas && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>⏱ {curso.duracion_horas} hrs</Text>
                  </View>
                )}
                {curso.estatus === 'Proxima' && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>Próximamente</Text>
                  </View>
                )}
              </View>

              <Text style={s.cursoNombre}>{curso.titulo}</Text>
              {!!curso.descripcion && <Text style={s.cursoDesc}>{curso.descripcion}</Text>}
              <Text style={s.cursoProveedor}>
                {curso.organizacion ?? 'Guardian Zero'}{curso.modalidad ? ` · ${curso.modalidad}` : ''}
              </Text>

              <TouchableOpacity
                style={s.verBtn}
                activeOpacity={0.8}
                disabled={inscribiendoId === curso.id}
                onPress={() => handleInscribirse(curso)}
              >
                {inscribiendoId === curso.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.verBtnText}>Inscribirme</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* ── Próximas capacitaciones ── */}
        <SectionTitle text="Próximas Capacitaciones" />

        <View style={s.proximasCard}>
          {PROXIMAS.map((cap, i) => (
            <View
              key={cap.id}
              style={[s.proximaFila, i < PROXIMAS.length - 1 && s.proximaDivider]}
            >
              {/* Línea de tiempo */}
              <View style={s.timelineCol}>
                <View style={s.timelineDot} />
                {i < PROXIMAS.length - 1 && <View style={s.timelineLine} />}
              </View>

              {/* Contenido */}
              <View style={s.proximaCuerpo}>
                <Text style={s.proximaTitulo}>{cap.titulo}</Text>
                <View style={s.proximaMetaRow}>
                  <Text style={s.proximaMeta}>📅 {cap.fecha}</Text>
                  <Text style={s.proximaMeta}>⏱ {cap.duracion}</Text>
                </View>
                {cap.lugar ? (
                  <Text style={s.proximaMeta}>📍 {cap.lugar}</Text>
                ) : null}
                <View style={s.requisitoBadge}>
                  <Text style={s.requisitoText}>Requisito: {cap.requisitos}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Organizaciones aliadas ── */}
        <SectionTitle text="Organizaciones Aliadas" />

        <View style={s.orgGrid}>
          {ORGANIZACIONES.map((org) => (
            <TouchableOpacity key={org.id} style={s.orgCard} activeOpacity={0.8}>
              <View style={s.orgLogoBox}>
                <Image source={org.imagen} style={s.orgLogo} resizeMode="contain" />
              </View>
              <Text style={s.orgNombre} numberOfLines={2}>{org.nombre}</Text>
              <Text style={s.orgDesc} numberOfLines={2}>{org.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

/* ── Estilos ────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F8' },

  header: {
    backgroundColor: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
  },
  logo: { width: 36, height: 36 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  scroll: { padding: 14, paddingBottom: 100 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionAccent: { width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionText: { fontSize: 15, fontWeight: '700', color: TITULO },

  /* Curso */
  cursoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cursoImg: {
    width: '100%',
    height: 160,
  },
  cursoCuerpo: { padding: 14 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  badge: { backgroundColor: BUTTON + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: BUTTON },
  cursoNombre: { fontSize: 15, fontWeight: '700', color: TITULO, marginBottom: 6 },
  cursoDesc: { fontSize: 13, color: TEXT, lineHeight: 19, marginBottom: 8 },
  cursoProveedor: { fontSize: 11, color: BUTTON, fontWeight: '600', marginBottom: 10 },
  verBtn: {
    backgroundColor: BUTTON,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Próximas capacitaciones */
  proximasCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  proximaFila: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  proximaDivider: { borderBottomWidth: 1, borderBottomColor: DIVIDER, marginBottom: 16 },
  timelineCol: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: BUTTON, borderWidth: 2, borderColor: '#fff',
    shadowColor: BUTTON, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: DIVIDER, marginTop: 4 },
  proximaCuerpo: { flex: 1 },
  proximaTitulo: { fontSize: 13, fontWeight: '700', color: TITULO, marginBottom: 6 },
  proximaMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 3 },
  proximaMeta: { fontSize: 12, color: TEXT, marginBottom: 2 },
  requisitoBadge: {
    backgroundColor: BUTTON + '18',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  requisitoText: { fontSize: 11, color: BUTTON, fontWeight: '600' },

  /* Organizaciones */
  orgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  orgCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  orgLogoBox: {
    width: 72,
    height: 72,
    backgroundColor: '#F5F7F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    padding: 6,
  },
  orgLogo: { width: '100%', height: '100%' },
  orgNombre: { fontSize: 12, fontWeight: '700', color: TITULO, textAlign: 'center', marginBottom: 3 },
  orgDesc: { fontSize: 10, color: TEXT, textAlign: 'center', lineHeight: 14 },
});
