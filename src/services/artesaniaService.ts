import { Artesano, Producto, Oferta } from '../types';

export const artesanos: Artesano[] = [
  {
    id: 'a1',
    nombre: 'María López',
    especialidad: 'Cerámica',
    ubicacion: 'Oaxaca, México',
    avatar: 'https://picsum.photos/seed/maria/100/100',
  },
  {
    id: 'a2',
    nombre: 'Carlos Pérez',
    especialidad: 'Tejidos',
    ubicacion: 'Chiapas, México',
    avatar: 'https://picsum.photos/seed/carlos/100/100',
  },
  {
    id: 'a3',
    nombre: 'Ana Torres',
    especialidad: 'Joyería',
    ubicacion: 'Taxco, México',
    avatar: 'https://picsum.photos/seed/ana/100/100',
  },
];

export const productos: Producto[] = [
  {
    id: 'p1',
    nombre: 'Vasija de Barro',
    descripcion: 'Vasija pintada a mano con motivos zapotecos',
    precio: 350,
    imagen: 'https://picsum.photos/seed/vasija/300/200',
    artesanoId: 'a1',
    artesano: 'María López',
  },
  {
    id: 'p2',
    nombre: 'Rebozo de Seda',
    descripcion: 'Rebozo tejido en telar de cintura con seda natural',
    precio: 1200,
    imagen: 'https://picsum.photos/seed/rebozo/300/200',
    artesanoId: 'a2',
    artesano: 'Carlos Pérez',
  },
  {
    id: 'p3',
    nombre: 'Collar de Plata',
    descripcion: 'Collar artesanal con diseño prehispánico en plata .925',
    precio: 850,
    imagen: 'https://picsum.photos/seed/collar/300/200',
    artesanoId: 'a3',
    artesano: 'Ana Torres',
  },
  {
    id: 'p4',
    nombre: 'Plato Talavera',
    descripcion: 'Plato decorativo de talavera pintado a mano',
    precio: 480,
    imagen: 'https://picsum.photos/seed/talavera/300/200',
    artesanoId: 'a1',
    artesano: 'María López',
  },
];

export const ofertas: Oferta[] = [
  {
    id: 'o1',
    productoId: 'p1',
    descuento: 15,
    precioOferta: 297.5,
    validaHasta: '2026-07-01',
  },
  {
    id: 'o2',
    productoId: 'p3',
    descuento: 10,
    precioOferta: 765,
    validaHasta: '2026-06-30',
  },
];

export function getOfertaByProducto(productoId: string): Oferta | undefined {
  return ofertas.find((o) => o.productoId === productoId);
}
