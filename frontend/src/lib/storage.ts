import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export type LogoType = 'clinic' | 'doctor';

export interface UploadLogoResult {
  url: string;
  type: LogoType;
}

export async function uploadLogoImage(
  file: File,
  doctorUid: string,
  type: LogoType
): Promise<string> {
  if (!doctorUid) {
    throw new Error('Identificador de usuario no válido.');
  }

  // 1. Validar tamaño máximo (2MB)
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

  // Ruta en Firebase Storage: storage/logos/clinic/{doctorUid} o storage/logos/doctor/{doctorUid}
  const storagePath = `logos/${type}/${doctorUid}`;
  const storageRef = ref(storage, storagePath);

  try {
    const contentType = file.type || (fileExtension === 'svg' ? 'image/svg+xml' : 'image/png');
    await uploadBytes(storageRef, file, {
      contentType,
      customMetadata: {
        uploadedBy: doctorUid,
        logoType: type,
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    console.error(`Error subiendo logo de ${type} a Firebase Storage:`, error);
    // Si la regla de seguridad o la configuración de Firebase Storage falla en dev local, proporcionar fallback con FileReader Data URL para que la UI no se quede varada.
    if (error.code === 'storage/unauthorized' || error.code === 'storage/unknown' || error.message?.includes('Firebase Storage')) {
      console.warn('Fallback local: utilizando Data URL para previsualizar y guardar la imagen.');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Error leyendo la imagen localmente.'));
        reader.readAsDataURL(file);
      });
    }
    throw new Error(`Fallo al subir la imagen: ${error.message || 'Error desconocido'}`);
  }
}
