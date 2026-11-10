'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Check, ChevronDown, LoaderCircle, LockKeyhole, Upload, UserRound, X } from 'lucide-react';
import type { BeneficiaryCategory, UserProfile } from '@/lib/types';
import { createEmptyProfile, isProfileReady, PROFILE_CATEGORIES } from '@/lib/profile';
import { INDIAN_STATES_AND_UTS } from '@/lib/indian-states';
import { displayState, tr } from '@/lib/ui-copy';

interface UserProfileCardProps {
  language: string;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  focusRequest: number;
  storageError: boolean;
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 384;
        const context = canvas.getContext('2d');
        if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image');
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 384, 384);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        reject(new Error('This photo could not be opened. Try a JPG, PNG or WebP image.'));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This photo could not be opened. Try a JPG, PNG or WebP image.'));
    };
    image.src = url;
  });
}

export default function UserProfileCard({ language, profile, setProfile, photo, setPhoto, focusRequest, storageError }: UserProfileCardProps) {
  const t = (text: string) => tr(language, text);
  const cardRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const ready = isProfileReady(profile);
  const invalidAge = profile.age !== undefined && (!Number.isInteger(profile.age) || profile.age < 1 || profile.age > 120);

  useEffect(() => {
    if (!focusRequest) return;
    const target = !profile.age ? ageRef.current : !profile.categoryProvided ? categoryRef.current : nameRef.current;
    target?.focus({ preventScroll: true });
    cardRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    // Focus is requested by navigation, not on every profile keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    let stream: MediaStream | undefined;

    async function openCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (cancelled) return;
        stream?.getTracks().forEach(track => track.stop());
        setCameraError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera access or upload a photo.'
          : 'The camera is unavailable. Connect a camera or upload a photo.');
      }
    }

    void openCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    setCameraOpen(false);
    setCameraReady(false);
    dialogRef.current?.close();
  };

  const startCamera = () => {
    setPhotoError('');
    setCameraError('');
    setCameraReady(false);
    dialogRef.current?.showModal();
    setCameraOpen(true);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('The photo could not be captured. Try uploading a photo.');
      return;
    }
    const side = Math.min(video.videoWidth, video.videoHeight);
    context.translate(384, 0);
    context.scale(-1, 1);
    context.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, 384, 384);
    setPhoto(canvas.toDataURL('image/jpeg', 0.85));
    closeCamera();
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Choose a photo smaller than 10 MB.');
      return;
    }
    setPhotoBusy(true);
    try {
      setPhoto(await readPhoto(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'The photo could not be uploaded.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const inputClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-100';

  return (
    <>
      <aside id="your-profile" ref={cardRef} className="profile-card scroll-mt-44 self-start overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="profile-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="profile-heading" className="text-lg font-bold text-blue-950">{t('Your profile')}</h2>
          {ready && <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />{t('Complete')}</span>}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{t('Your details help tailor scheme matches and AI explanations.')}</p>

        <div className="my-6 flex items-center gap-4">
          <button type="button" onClick={() => uploadRef.current?.click()} disabled={photoBusy} aria-label={t(photo ? 'Change profile photo' : 'Add profile photo')} className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-50 text-blue-500 ring-1 ring-blue-100 hover:ring-blue-400">
            {photo ? <Image src={photo} alt={t('Your profile photo')} width={80} height={80} unoptimized className="entry-icon h-full w-full rounded-full object-cover" /> : <UserRound className="entry-icon h-9 w-9" strokeWidth={1.5} aria-hidden="true" />}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white">{photoBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}</span>
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={startCamera} disabled={photoBusy} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-blue-100 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Camera className="h-3.5 w-3.5" aria-hidden="true" />{t('Take photo')}</button>
              <button type="button" onClick={() => uploadRef.current?.click()} disabled={photoBusy} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" aria-hidden="true" />{t('Upload photo')}</button>
            </div>
            {photo && <button type="button" onClick={() => { setPhoto(null); setPhotoError(''); }} className="mt-1 px-1 text-xs text-slate-500 hover:text-red-600">{t('Remove photo')}</button>}
          </div>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" aria-label={t('Upload profile photo')} onChange={uploadPhoto} />
        </div>
        {photoError && <p role="alert" className="mb-4 text-xs text-red-600">{t(photoError)}</p>}

        <form className="space-y-4" onSubmit={event => event.preventDefault()}>
          <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-600">{t('Name')}<input ref={nameRef} id="profile-name" autoComplete="name" maxLength={80} value={profile.name} onChange={event => setProfile(current => ({ ...current, name: event.target.value }))} placeholder={t('Your name (optional)')} className={inputClass} /></label>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <label htmlFor="profile-age" className="block text-xs font-semibold text-slate-600">{t('Age')}<input ref={ageRef} id="profile-age" type="number" inputMode="numeric" min={1} max={120} step={1} required value={profile.age ?? ''} onChange={event => setProfile(current => ({ ...current, age: event.target.value === '' ? undefined : event.target.valueAsNumber }))} placeholder="—" aria-invalid={invalidAge || undefined} aria-describedby={invalidAge ? 'profile-age-error' : undefined} className={inputClass} /></label>
            <label htmlFor="profile-category" className="block min-w-0 text-xs font-semibold text-slate-600">{t('Caste / category')}<select ref={categoryRef} id="profile-category" required value={profile.categoryProvided ? profile.category : ''} onChange={event => setProfile(current => ({ ...current, category: (event.target.value || 'General') as BeneficiaryCategory, categoryProvided: event.target.value !== '' }))} className={`${inputClass} pr-6`}><option value="">{t('Select category')}</option>{PROFILE_CATEGORIES.map(category => <option key={category.value} value={category.value}>{t(category.label)}</option>)}</select></label>
          </div>
          {invalidAge && <p id="profile-age-error" role="alert" className="text-xs text-red-600">{t('Enter a whole-number age between 1 and 120.')}</p>}

          <details className="group border-t border-slate-100 pt-4">
            <summary className="flex min-h-9 list-none items-center justify-between gap-2 text-xs font-semibold text-slate-600 marker:content-none">{t('More details')}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="mt-3 space-y-4 pb-1">
              <label htmlFor="profile-state" className="block text-xs font-semibold text-slate-600">{t('State / UT')}<select id="profile-state" value={profile.state} onChange={event => setProfile(current => ({ ...current, state: event.target.value }))} className={inputClass}><option value="">{t('Select state')}</option>{INDIAN_STATES_AND_UTS.map(state => <option key={state} value={state}>{displayState(language, state)}</option>)}</select></label>
              <label htmlFor="profile-income" className="block text-xs font-semibold text-slate-600">{t('Annual family income')} (₹)<input id="profile-income" type="number" min={0} step={1} inputMode="numeric" value={profile.incomeProvided ? profile.annualFamilyIncome : ''} placeholder={t('Optional')} onChange={event => setProfile(current => ({ ...current, annualFamilyIncome: Math.max(0, event.target.valueAsNumber || 0), incomeProvided: event.target.value !== '' }))} className={inputClass} /></label>
              <label htmlFor="profile-budget" className="block text-xs font-semibold text-slate-600">{t('Project / course cost')} (₹)<input id="profile-budget" type="number" min={1} step={1} inputMode="numeric" value={profile.estimatedCost || ''} placeholder={t('Optional')} onChange={event => setProfile(current => ({ ...current, estimatedCost: Math.max(0, event.target.valueAsNumber || 0) }))} className={inputClass} /></label>
            </div>
          </details>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" aria-hidden="true" />{t(storageError ? 'Not saved' : 'Saved on this device')}</span>
          {(profile.age !== undefined || profile.categoryProvided || profile.name || photo) && <button type="button" onClick={() => { setProfile(createEmptyProfile()); setPhoto(null); setPhotoError(''); }} className="min-h-8 text-slate-500 hover:text-blue-700">{t('Clear profile')}</button>}
        </div>
        {storageError && <p role="alert" className="mt-2 text-xs text-amber-700">{t('Browser storage is unavailable. Changes will be lost when you refresh.')}</p>}
      </aside>

      <dialog ref={dialogRef} onCancel={() => setCameraOpen(false)} onClose={() => { setCameraOpen(false); setCameraReady(false); }} aria-labelledby="camera-heading" className="camera-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-blue-100 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="camera-heading" className="text-lg font-bold text-blue-950">{t('Take a profile photo')}</h2><button type="button" onClick={closeCamera} aria-label={t('Close camera')} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
          <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setCameraReady(true)} className={`h-full w-full -scale-x-100 object-cover ${cameraError ? 'hidden' : ''}`} />
          {!cameraReady && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-600">{cameraError ? <Camera className="h-8 w-8 text-slate-400" aria-hidden="true" /> : <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" aria-hidden="true" />}<p>{t(cameraError || 'Opening camera…')}</p></div>}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => { closeCamera(); uploadRef.current?.click(); }} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{t('Upload instead')}</button><button type="button" disabled={!cameraReady || !!cameraError} onClick={capturePhoto} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Camera className="h-4 w-4" aria-hidden="true" />{t('Capture photo')}</button></div>
      </dialog>
    </>
  );
}
