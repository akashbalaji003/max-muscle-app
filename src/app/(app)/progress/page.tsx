'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, User, Trash2, X, Pencil, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { ProgressPhoto } from '@/types';

type FeedPhoto = ProgressPhoto & { users?: { id: string; phone_number: string; name: string | null } };

function PhotoSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-1/3" />
          <div className="skeleton h-3 w-1/4" />
        </div>
      </div>
      <div className="skeleton w-full" style={{ height: '280px' }} />
      <div className="px-4 py-3">
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [feed, setFeed] = useState<FeedPhoto[]>([]);
  const [myPhotos, setMyPhotos] = useState<FeedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ caption: '', is_weekly: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tab, setTab] = useState<'feed' | 'mine' | 'upload'>('feed');
  const [currentUserId, setCurrentUserId] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  // Caption editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  async function loadFeed(userId: string) {
    const feedRes = await fetch('/api/progress');
    if (feedRes.ok) {
      const data = await feedRes.json();
      const all: FeedPhoto[] = data.photos || [];
      setFeed(all);
      setMyPhotos(all.filter((p) => p.users?.id === userId || p.user_id === userId));
    }
    setFeedLoading(false);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) { router.push('/login'); return; }
      const meData = await meRes.json();
      const uid = meData.user?.id || '';
      setCurrentUserId(uid);
      await loadFeed(uid);
    }
    load();
  }, [router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile) { setError('Please select a photo'); return; }
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setError(uploadData.error || 'Upload failed'); setUploading(false); return; }

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uploadData.url, is_weekly: form.is_weekly, caption: form.caption }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); setUploading(false); return; }

      setSuccess('Photo posted!');
      setSelectedFile(null);
      setPreview(null);
      setForm({ caption: '', is_weekly: false });
      if (fileRef.current) fileRef.current.value = '';

      await loadFeed(currentUserId);
      setTab('feed');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  }

  async function handleDelete(photoId: string) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(photoId);
    const res = await fetch(`/api/progress/${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadFeed(currentUserId);
      setSuccess('Photo deleted.');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to delete photo.');
    }
    setDeletingId(null);
  }

  function startEditCaption(photo: FeedPhoto) {
    setEditingId(photo.id);
    setEditCaption(photo.caption || photo.note || '');
  }

  async function saveCaption(photoId: string) {
    setSavingCaption(true);
    try {
      const res = await fetch(`/api/progress/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: editCaption }),
      });
      if (res.ok) {
        await loadFeed(currentUserId);
        setEditingId(null);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save caption');
      }
    } catch {
      setError('Failed to save caption');
    }
    setSavingCaption(false);
  }

  function PhotoCard({ photo, showUser = true }: { photo: FeedPhoto; showUser?: boolean }) {
    const displayName = photo.users?.name || photo.users?.phone_number || 'Anonymous';
    const isMe = photo.users?.id === currentUserId || photo.user_id === currentUserId;
    const captionText = photo.caption || photo.note;
    const isEditing = editingId === photo.id;

    return (
      <div className="glass-card overflow-hidden fade-in">
        {/* Header */}
        {showUser && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-9 h-9 bg-red-700/30 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{isMe ? `${displayName} (you)` : displayName}</p>
              <p className="text-xs text-slate-500">{formatDate(photo.date, 'MMM dd, yyyy')}</p>
            </div>
            {photo.is_weekly && <Badge variant="info" className="flex-shrink-0">Weekly</Badge>}
            {isMe && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="p-2 text-slate-600 hover:text-red-400 min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0"
                title="Delete photo"
              >
                {deletingId === photo.id
                  ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image_url}
          alt={captionText || 'Progress photo'}
          className="w-full object-cover"
          style={{ maxHeight: '420px' }}
          loading="lazy"
        />

        {/* Caption / Edit */}
        {isMe && isEditing ? (
          <div className="px-4 py-3 space-y-2">
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={2}
              autoFocus
              className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 resize-none"
              placeholder="Add a caption..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => saveCaption(photo.id)}
                disabled={savingCaption}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {savingCaption
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            {captionText ? (
              <div className="flex items-start gap-2 group">
                <p className="text-sm text-slate-300 leading-relaxed flex-1">
                  <span className="font-semibold text-white mr-2">{showUser ? displayName : 'You'}</span>
                  {captionText}
                </p>
                {isMe && (
                  <button
                    onClick={() => startEditCaption(photo)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 flex-shrink-0 mt-0.5"
                    title="Edit caption"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : isMe ? (
              <button
                onClick={() => startEditCaption(photo)}
                className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Add caption
              </button>
            ) : null}
          </div>
        )}

        {/* Footer for "mine" tab */}
        {!showUser && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">{formatDate(photo.date, 'EEEE, MMM dd')}</p>
            <div className="flex items-center gap-2">
              {photo.is_weekly && <Badge variant="info">Weekly</Badge>}
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="p-1.5 text-slate-600 hover:text-red-400 flex items-center justify-center"
                title="Delete photo"
              >
                {deletingId === photo.id
                  ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <X className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-5xl text-white leading-none">PROGRESS FEED</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gym community progress photos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f0f0f] rounded-xl p-1 w-fit">
        {([['feed', 'Community'], ['mine', 'My Photos'], ['upload', 'Post Photo']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${tab === t ? 'bg-red-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t === 'upload'
              ? <span className="flex items-center gap-1"><Upload className="w-3.5 h-3.5" />{label}</span>
              : label}
          </button>
        ))}
      </div>

      {(success || error) && (
        <div className={`rounded-xl p-3 text-sm border fade-in ${
          success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {success || error}
        </div>
      )}

      {/* Community Feed */}
      {tab === 'feed' && (
        <div className="max-w-md mx-auto space-y-4">
          {feedLoading ? (
            <>
              <PhotoSkeleton />
              <PhotoSkeleton />
            </>
          ) : feed.length === 0 ? (
            <Card className="text-center py-12">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No photos yet. Be the first to post!</p>
            </Card>
          ) : (
            feed.map((p) => <PhotoCard key={p.id} photo={p} showUser={true} />)
          )}
        </div>
      )}

      {/* My Photos */}
      {tab === 'mine' && (
        <div className="max-w-md mx-auto space-y-4">
          {feedLoading ? (
            <>
              <PhotoSkeleton />
            </>
          ) : myPhotos.length === 0 ? (
            <Card className="text-center py-12">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No photos yet.</p>
              <button onClick={() => setTab('upload')} className="text-red-400 text-sm hover:text-red-300 mt-1">
                Upload your first →
              </button>
            </Card>
          ) : (
            myPhotos.map((p) => <PhotoCard key={p.id} photo={p} showUser={false} />)
          )}
        </div>
      )}

      {/* Upload */}
      {tab === 'upload' && (
        <div className="max-w-md mx-auto">
          <Card>
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-400" />
              Post a Progress Photo
            </h2>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-red-600/50 rounded-xl p-8 text-center cursor-pointer mb-4 active:bg-white/2"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="max-h-52 mx-auto rounded-lg object-cover" />
              ) : (
                <>
                  <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Tap to select photo</p>
                  <p className="text-slate-600 text-xs mt-1">JPEG, PNG, WebP · Max 5 MB</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-3">
              <textarea
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                placeholder="Add a caption..."
                rows={3}
                className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 resize-none"
              />

              <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={form.is_weekly}
                  onChange={(e) => setForm((f) => ({ ...f, is_weekly: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-slate-300">Mark as weekly check-in</span>
              </label>

              <Button onClick={handleUpload} loading={uploading} className="w-full min-h-[48px]">
                <Upload className="w-4 h-4" />
                Post Photo
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
