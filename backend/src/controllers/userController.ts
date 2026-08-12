import express from 'express';
import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';
import { UserProfileData } from '../types/user.js';

export const updateUserProfile = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.uid;

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado: Usuario no identificado' });
  }

  const {
    displayName,
    specialty,
    exequatur,
    clinicName,
    clinicTagline,
    clinicAddress,
    clinicSuite,
    phoneOffice,
    phoneExt,
    phoneCell,
    clinicLogoUrl,
    doctorLogoUrl,
    phone,
    officeLocation,
    gender,
    bio,
    professionalId,
  } = req.body;

  const updates: Partial<UserProfileData> = {};

  if (displayName !== undefined) updates.displayName = displayName;
  if (specialty !== undefined) updates.specialty = specialty;
  if (exequatur !== undefined) updates.exequatur = exequatur;
  if (clinicName !== undefined) updates.clinicName = clinicName;
  if (clinicTagline !== undefined) updates.clinicTagline = clinicTagline;
  if (clinicAddress !== undefined) updates.clinicAddress = clinicAddress;
  if (clinicSuite !== undefined) updates.clinicSuite = clinicSuite;
  if (phoneOffice !== undefined) updates.phoneOffice = phoneOffice;
  if (phoneExt !== undefined) updates.phoneExt = phoneExt;
  if (phoneCell !== undefined) updates.phoneCell = phoneCell;
  if (clinicLogoUrl !== undefined) updates.clinicLogoUrl = clinicLogoUrl;
  if (doctorLogoUrl !== undefined) updates.doctorLogoUrl = doctorLogoUrl;
  if (phone !== undefined) updates.phone = phone;
  if (officeLocation !== undefined) updates.officeLocation = officeLocation;
  if (gender !== undefined) updates.gender = gender;
  if (bio !== undefined) updates.bio = bio;
  if (professionalId !== undefined) updates.professionalId = professionalId;

  try {
    if (db) {
      const userRef = db.collection('users').doc(userId);
      await userRef.set(updates, { merge: true });
      logger.info(`Perfil actualizado en Firestore para el usuario: ${userId}`);
    } else {
      logger.warn(`Modo sin Firestore activo. Simulando actualización de perfil para usuario: ${userId}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      updates,
    });
  } catch (error: any) {
    logger.error('Error actualizando perfil en el backend:', error.message);
    return res.status(500).json({
      error: 'Error al actualizar el perfil en el servidor.',
      details: error.message,
    });
  }
};

export const getUserProfile = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.uid;

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    if (!db) {
      return res.status(200).json({ uid: userId, warning: 'Firestore no conectado' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(444).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    return res.status(200).json(userDoc.data());
  } catch (error: any) {
    logger.error('Error consultando perfil:', error.message);
    return res.status(500).json({ error: 'Error consultando datos de perfil' });
  }
};
