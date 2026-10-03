'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  FileImage,
  FileText,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DOCUMENTS_BUCKET,
  getOrCreateAnonymousUser,
  getSupabaseBrowserClient,
  MAX_DOCUMENT_SIZE_BYTES,
} from '@/lib/supabase/client';

const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar card' },
  { value: 'photo', label: 'Profile photo' },
  { value: 'income_certificate', label: 'Income certificate' },
  { value: 'caste_certificate', label: 'Caste certificate' },
  { value: 'project_report', label: 'Project report / DPR' },
  { value: 'other', label: 'Other document' },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];
type PageStatus = 'idle' | 'loading' | 'ready' | 'missing-config' | 'error';

interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

interface DemoDocument {
  id: string;
  title: string;
  document_type: DocumentType;
  description: string;
  sort_order: number;
}

const FALLBACK_DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: 'demo-aadhaar',
    title: 'Aadhaar card example',
    document_type: 'aadhaar',
    description: 'Fictional demo label only. No real Aadhaar number or identity data.',
    sort_order: 10,
  },
  {
    id: 'demo-photo',
    title: 'Profile photo example',
    document_type: 'photo',
    description: 'Placeholder example only. It contains no photo of a real person.',
    sort_order: 20,
  },
  {
    id: 'demo-income',
    title: 'Income certificate example',
    document_type: 'income_certificate',
    description: 'Fictional demo label only. It is not issued by a government agency.',
    sort_order: 30,
  },
];

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find(item => item.value === type)?.label ?? 'Other document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (/anonymous.*disabled|disabled.*anonymous/i.test(message)) {
    return 'Anonymous sign-in is disabled. Enable it in Supabase Authentication → Sign In / Providers → Anonymous Sign-Ins, then reload this tab.';
  }
  return message;
}

interface UploadDocumentsProps {
  isActive: boolean;
}

export default function UploadDocuments({ isActive }: UploadDocumentsProps) {
  const [status, setStatus] = useState<PageStatus>('idle');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [demoDocuments, setDemoDocuments] = useState(FALLBACK_DEMO_DOCUMENTS);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>('aadhaar');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async (isCurrent: () => boolean) => {
    setStatus('loading');
    setErrorMessage('');
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus('missing-config');
      return;
    }

    try {
      const user = await getOrCreateAnonymousUser(client);
      const [userResult, demoResult] = await Promise.all([
        client
          .from('user_documents')
          .select('id,user_id,title,document_type,storage_path,mime_type,file_size_bytes,created_at')
          .order('created_at', { ascending: false }),
        client
          .from('demo_document_examples')
          .select('id,title,document_type,description,sort_order')
          .order('sort_order', { ascending: true }),
      ]);

      if (userResult.error) throw userResult.error;
      if (!isCurrent()) return;

      setUserId(user.id);
      setDocuments((userResult.data ?? []) as UserDocument[]);
      if (!demoResult.error && demoResult.data?.length) {
        setDemoDocuments(demoResult.data as DemoDocument[]);
      }
      setStatus('ready');
    } catch (error) {
      if (!isCurrent()) return;
      setErrorMessage(getErrorMessage(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    let current = true;
    const scheduleId = window.setTimeout(() => {
      void loadDocuments(() => current);
    }, 0);
    return () => {
      current = false;
      window.clearTimeout(scheduleId);
    };
  }, [isActive, loadDocuments]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;

    const client = getSupabaseBrowserClient();
    if (!client || !userId) {
      setErrorMessage('Your private document session is not ready yet. Wait for it to connect and try again.');
      return;
    }

    setErrorMessage('');
    setNotice('');
    setIsUploading(true);
    let uploadedCount = 0;
    const failures: string[] = [];

    for (const [index, file] of files.entries()) {
      setUploadProgress(`Adding ${index + 1} of ${files.length}…`);

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        failures.push(`${file.name}: choose a PDF, JPG, PNG, or WebP file.`);
        continue;
      }
      if (file.size < 1 || file.size > MAX_DOCUMENT_SIZE_BYTES) {
        failures.push(`${file.name}: each file must be 10 MB or smaller.`);
        continue;
      }

      const cleanTitle = file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 150) || 'Document';
      const safeFileName = cleanTitle
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^[_.]+/, '')
        .slice(0, 120) || 'document';
      const storagePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await client.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false, cacheControl: '0' });

      if (uploadError) {
        failures.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      const { error: rowError } = await client.from('user_documents').insert({
        user_id: userId,
        title: cleanTitle,
        document_type: selectedType,
        storage_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
      });

      if (rowError) {
        await client.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
        failures.push(`${file.name}: ${rowError.message}`);
        continue;
      }

      uploadedCount += 1;
    }

    try {
      const { data, error } = await client
        .from('user_documents')
        .select('id,user_id,title,document_type,storage_path,mime_type,file_size_bytes,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments((data ?? []) as UserDocument[]);
    } catch (error) {
      if (uploadedCount > 0) setNotice('Your file was saved, but the list could not refresh. Reload this tab to see it.');
      else failures.push(getErrorMessage(error));
    }

    if (failures.length) setErrorMessage(failures.join(' '));
    else if (uploadedCount) setNotice(`${uploadedCount} ${uploadedCount === 1 ? 'file was' : 'files were'} added to your private locker.`);
    setIsUploading(false);
    setUploadProgress('');
  };

  const handleDownload = async (item: UserDocument) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusyDocumentId(item.id);
    setErrorMessage('');
    try {
      const { data, error } = await client.storage.from(DOCUMENTS_BUCKET).download(item.storage_path);
      if (error) throw error;
      const objectUrl = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = item.title;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleDelete = async (item: UserDocument) => {
    if (!window.confirm(`Delete “${item.title}” from your private locker?`)) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusyDocumentId(item.id);
    setErrorMessage('');
    setNotice('');
    try {
      const { error: storageError } = await client.storage
        .from(DOCUMENTS_BUCKET)
        .remove([item.storage_path]);
      if (storageError) throw storageError;

      const { error: rowError } = await client.from('user_documents').delete().eq('id', item.id);
      if (rowError) throw rowError;
      setDocuments(current => current.filter(document => document.id !== item.id));
      setNotice('Document deleted from your private locker.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyDocumentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
              <LockKeyhole className="h-3.5 w-3.5" /> Private document locker
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Upload your documents</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Keep your papers here while you get ready. They stay in your private locker and are not sent to an agency.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 lg:max-w-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-xs leading-relaxed"><b>Private to this account.</b> Use a device you trust. Clearing browser data may make files hard to get back.</p>
          </div>
        </div>
      </section>

      {status === 'missing-config' && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h3 className="font-bold">Supabase settings are missing</h3>
          <p className="mt-1">Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to the app environment, then restart or redeploy it.</p>
        </section>
      )}

      {status === 'error' && (
        <section role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-bold">Could not connect to your private locker</h3>
            <p className="mt-1">{errorMessage}</p>
            <a href="https://supabase.com/dashboard/project/btiibgjbhssrwbdodycg/auth/providers" target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-amber-900 underline">Open Supabase sign-in settings</a>
          </div>
        </section>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Connecting to your private locker…
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Add a document or photo</h3>
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, or WebP · Up to 10 MB per file</p>
          </div>

          <label htmlFor="document-category" className="mb-1.5 block text-xs font-bold text-slate-700">What are you adding?</label>
          <select
            id="document-category"
            value={selectedType}
            onChange={event => setSelectedType(event.target.value as DocumentType)}
            className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          >
            {DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>

          <label
            htmlFor="document-file-input"
            className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 px-5 py-8 text-center transition-colors hover:border-sky-500 hover:bg-sky-50 ${status !== 'ready' || isUploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            {isUploading ? <LoaderCircle className="h-8 w-8 animate-spin text-sky-700" /> : <ImagePlus className="h-8 w-8 text-sky-700" />}
            <span className="mt-3 text-sm font-bold text-slate-900">{isUploading ? uploadProgress : 'Choose files to upload'}</span>
            <span className="mt-1 text-xs text-slate-600">Add Aadhaar, a photo, certificate, or project paper</span>
            <input
              ref={fileInputRef}
              id="document-file-input"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
              disabled={status !== 'ready' || isUploading}
              className="sr-only"
            />
          </label>

          {errorMessage && status !== 'error' && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</p>}
          {notice && <p role="status" className="mt-3 flex items-start gap-2 text-xs text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Don’t upload original ID papers on a shared device. You may not be able to get these files back later.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Demo document examples</h3>
              <p className="mt-1 text-xs text-slate-500">Fake examples only</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Demo</span>
          </div>
          <div className="space-y-3">
            {demoDocuments.map(item => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="rounded-lg bg-white p-2 text-sky-700 shadow-xs">
                  {item.document_type === 'photo' ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{documentTypeLabel(item.document_type)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your uploaded files</h3>
            <p className="mt-1 text-xs text-slate-500">{documents.length} {documents.length === 1 ? 'file' : 'files'} in your private locker</p>
          </div>
          {status === 'ready' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Private storage connected</span>}
        </div>

        {status === 'ready' && documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <Upload className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No files added yet</p>
            <p className="mt-1 text-xs text-slate-500">Your uploads will appear here.</p>
          </div>
        ) : documents.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {documents.map(item => (
              <li key={item.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
                    {item.mime_type.startsWith('image/') ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{documentTypeLabel(item.document_type)} · {formatFileSize(item.file_size_bytes)} · {new Date(item.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
                  <button type="button" onClick={() => void handleDownload(item)} disabled={busyDocumentId === item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {busyDocumentId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                    Download
                  </button>
                  <button type="button" onClick={() => void handleDelete(item)} disabled={busyDocumentId === item.id} aria-label={`Delete ${item.title}`} className="inline-flex items-center justify-center rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
