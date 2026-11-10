# Supabase document storage

The Scheme Lens document locker uses project **Scheme Lens Documents** in the Mumbai region (`ap-south-1`). The database setup is in [`supabase/migrations/20261002174609_private_applicant_document_storage.sql`](../supabase/migrations/20261002174609_private_applicant_document_storage.sql) and has been applied to the hosted project.

## App settings

Create `.env.local` from `.env.example` if needed, then configure your project URL and public publishable key. For a deployment, set these build-time environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://btiibgjbhssrwbdodycg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
```

Never put a Supabase service-role or secret key in a browser environment variable.

## Auth setting

Enable **Anonymous Sign-Ins** in [Supabase Authentication providers](https://supabase.com/dashboard/project/btiibgjbhssrwbdodycg/auth/providers). The app creates one anonymous account per browser profile and uses its Auth ID for the row and Storage ownership policies. Supabase's default anonymous account cannot be recovered after browser data is cleared and cannot be moved to another device. For lasting storage of identity documents, add a verified sign-in and account recovery flow before collecting real documents.

The upload tab accepts PDF, JPG, PNG, and WebP files up to 10 MB. Files live in the private `applicant-documents` bucket. Row-level security limits file metadata and object access to the current anonymous user. The seeded demo entries contain only fictional labels and explanatory text; they have no identity numbers or attached files.
