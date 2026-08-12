import React from 'react';
import { ClinicalDocument, BirthCertificationData, NarrativeCertificationData, UserProfile } from '../../types';
import { CertificadoNarrativoTemplate } from './CertificadoNarrativoTemplate';
import { CertificadoNacimientoTemplate } from './CertificadoNacimientoTemplate';
import { BriefcaseMedical } from 'lucide-react';

interface Props {
  documentContent: string;
  structuredData?: NarrativeCertificationData | BirthCertificationData;
  certificationType?: 'narrative' | 'birth';
  profile: UserProfile | null;
  documentRef: React.RefObject<HTMLDivElement | null>;
}

export const CertificateRenderer: React.FC<Props> = ({
  documentContent,
  structuredData,
  certificationType,
  profile,
  documentRef,
}) => {
  // 1. Si hay datos estructurados de constancia de nacimiento
  if (certificationType === 'birth' && structuredData) {
    return (
      <div ref={documentRef} className="w-full">
        <CertificadoNacimientoTemplate
          data={structuredData as BirthCertificationData}
          profile={profile}
        />
      </div>
    );
  }

  // 2. Si hay datos estructurados de certificado narrativo
  if (certificationType === 'narrative' && structuredData) {
    return (
      <div ref={documentRef} className="w-full">
        <CertificadoNarrativoTemplate
          data={structuredData as NarrativeCertificationData}
          profile={profile}
        />
      </div>
    );
  }

  // 3. Fallback para documentos legacy/plantillas estándar (texto plano)
  return (
    <div
      className="bg-white rounded-[2.5rem] shadow-ambient border border-surface-container-high p-20 relative flex flex-col min-h-[1100px] h-auto w-full overflow-visible"
      ref={documentRef}
    >
      {/* Header Documento General */}
      <div className="flex justify-between items-start border-b-2 border-primary/5 pb-10 mb-14 shrink-0">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-center text-primary shadow-sm">
            <BriefcaseMedical className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-primary leading-tight">
              Dr(a). {profile?.displayName || 'Isabel Beato'}
            </h2>
            <p className="text-[10px] font-bold text-high-contrast/50 uppercase tracking-widest mt-1">
              {profile?.specialty || 'Especialista'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-high-contrast/80 uppercase tracking-widest">
            MediFácil Hospital Arcos
          </p>
          <p className="text-[8px] font-medium text-high-contrast/40 uppercase">
            {new Date().toLocaleDateString('es-DO', { dateStyle: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex-1 whitespace-pre-wrap text-high-contrast leading-[1.8] text-justify text-base font-medium px-4 pb-20">
        {documentContent}
      </div>

      <div className="mt-auto pt-10 border-t border-surface-container-high flex flex-col items-center shrink-0">
        <div className="w-48 h-[1px] bg-high-contrast/20 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-high-contrast/40">
          Firma Autorizada
        </p>
      </div>
    </div>
  );
};
