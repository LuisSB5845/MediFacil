export type LogoType = 'clinic' | 'doctor';

/** Dimensiones máximas del logo ya comprimido. */
export const LOGO_MAX_WIDTH = 300;
export const LOGO_MAX_HEIGHT = 300;
/** Calidad de reexportación JPEG. */
export const LOGO_QUALITY = 0.7;
/**
 * Límite del data URI resultante. Firestore permite ~1MB por documento;
 * dejamos margen para el resto de los campos del perfil.
 */
export const MAX_DATA_URI_BYTES = 700 * 1024; // 700 KB

/**
 * Peso real en bytes de un data URI Base64 (descontando el encabezado
 * `data:image/jpeg;base64,` y el padding `=` del final).
 */
export function getDataUriByteSize(dataUri: string): number {
  const base64 = dataUri.split(',')[1] || '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Redimensiona una imagen en el navegador manteniendo su relación de aspecto
 * y la reexporta como JPEG en un data URI Base64.
 *
 * No usa Firebase Storage: el resultado se guarda directamente en Firestore.
 */
export function resizeAndCompressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error leyendo la imagen seleccionada.'));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('No se pudo procesar la imagen. Verifica que el archivo no esté dañado.'));
      image.onload = () => {
        // Algunos SVG no reportan dimensiones intrínsecas: usar el máximo como base.
        const sourceWidth = image.naturalWidth || image.width || maxWidth;
        const sourceHeight = image.naturalHeight || image.height || maxHeight;

        // Escalar sólo hacia abajo, conservando la relación de aspecto.
        const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
        const targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
        const targetHeight = Math.max(1, Math.round(sourceHeight * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('El navegador no permite procesar imágenes en este momento.'));
          return;
        }

        // JPEG no admite transparencia: rellenar en blanco evita fondos negros
        // en logos PNG/SVG con canal alfa.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err: any) {
          reject(new Error(`No se pudo comprimir la imagen: ${err?.message || 'error desconocido'}`));
        }
      };

      image.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Prepara el logo de la clínica o del médico para guardarlo en Firestore.
 * Valida el archivo, lo comprime a 300x300 JPEG y devuelve el data URI.
 */
export async function uploadLogoImage(
  file: File,
  doctorUid: string,
  _type: LogoType
): Promise<string> {
  if (!doctorUid) {
    throw new Error('Identificador de usuario no válido.');
  }

  // 1. Validar tamaño máximo del archivo de origen (2MB)
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`El archivo '${file.name}' excede el límite de tamaño permitido de 2MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
  }

  // 2. Validar tipos permitidos (PNG, JPG, SVG)
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
  ];
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg'];

  const isValidMime = allowedMimeTypes.includes(file.type);
  const isValidExt = allowedExtensions.includes(fileExtension);

  if (!isValidMime && !isValidExt) {
    throw new Error(`Formato no permitido para '${file.name}'. Solo se admiten imágenes PNG, JPG o SVG.`);
  }

  // 3. Comprimir en el navegador (sin Firebase Storage)
  const dataUri = await resizeAndCompressImage(file, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, LOGO_QUALITY);

  // 4. Verificar que quepa cómodamente en el documento de Firestore
  const byteSize = getDataUriByteSize(dataUri);
  if (byteSize > MAX_DATA_URI_BYTES) {
    throw new Error(
      `La imagen comprimida sigue pesando ${(byteSize / 1024).toFixed(0)}KB y supera el límite de 700KB. ` +
      `Usa una imagen más simple o de menor resolución (por ejemplo un logo plano, sin fotografías ni degradados).`
    );
  }

  return dataUri;
}
