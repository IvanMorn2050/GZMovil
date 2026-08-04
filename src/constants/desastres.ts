// Imágenes registradas para cada tipo de desastre — las mismas que se ven
// en la simbología del mapa de Home. Se comparten aquí para no duplicar
// el mapeo en cada pantalla que necesite mostrar el icono de un tipo.

export function getDesastreImg(nombre: string): any | null {
  const n = nombre.toLowerCase();
  if (n.includes('incendio'))                              return require('../../assets/incendio.png');
  if (n.includes('inundacion') || n.includes('inundación')) return require('../../assets/inundacion.png');
  if (n.includes('terremoto') || n.includes('sismo'))       return require('../../assets/terremoto.png');
  if (n.includes('tormenta') || n.includes('electrica') || n.includes('eléctrica'))
                                                             // eslint-disable-next-line @typescript-eslint/no-var-requires
                                                             return require('../../assets/tormeta electrica.png');
  if (n.includes('derrumbe'))                               return require('../../assets/derrumbe.png');
  if (n.includes('deslizamiento'))                          return require('../../assets/deslizamiento-de-tierra.png');
  if (n.includes('erupcion') || n.includes('erupción'))     return require('../../assets/erupcion.png');
  return null;
}

export const SIMBOLOGIA = [
  { img: require('../../assets/incendio.png'),                l: 'Incendios' },
  { img: require('../../assets/inundacion.png'),               l: 'Inundaciones' },
  { img: require('../../assets/terremoto.png'),                l: 'Sismos' },
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  { img: require('../../assets/tormeta electrica.png'),        l: 'T. Eléctricas' },
  { img: require('../../assets/derrumbe.png'),                 l: 'Derrumbes' },
  { img: require('../../assets/deslizamiento-de-tierra.png'),  l: 'Deslizamiento' },
  { img: require('../../assets/erupcion.png'),                 l: 'Erupciones' },
];
