'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, User, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { ProgressPhoto } from '@/types';

type FeedPhoto = ProgressPhoto & { users?: { id: string; phone_number: string; name: string | null } };

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

  async function loadFeed(userId: string) {
    const feedRes = await fetch('/api/progress');
    if (feedRes.ok) {
      const data = await feedRes.json();
      const all: FeedPhoto[] = data.photos || [];
      setFeed(all);
      setMyPhotos(all.filter((p) => p.users?.id === userId || p.user_id === userId));
    }
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

  function PhotoCard({ photo, showUser = true }: { photo: FeedPhoto; showUser?: boolean }) {
    const displayName = photo.users?.name || photo.users?.phone_number || 'Anonymous';
    const isMe = photo.users?.id === currentUserId || photo.user_id === currentUserId;
    const captionText = photo.caption || photo.note;

    return (
      <div className="glass-card overflow-hidden">
        {/* Header */}
        {showUser && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-9 h-9 bg-indigo-600/30 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-indigo-400" />
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
                className="p-2 text-slate-600 hover:text-red-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0"
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

        {/* Caption */}
        {captionText && (
          <div className="px-4 py-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-white mr-2">{showUser ? displayName : 'You'}</span>
              {captionText}
            </p>
          </div>
        )}

        {/* Footer for "mine" tab (no user header shown) */}
        {!showUser && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">{formatDate(photo.date, 'EEEE, MMM dd')}</p>
            <div className="flex items-center gap-2">
              {photo.is_weekly && <Badge variant="info">Weekly</Badge>}
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="p-1.5 text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center"
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
        <h1 className="text-2xl font-bold text-white">Progress Feed</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gym community progress photos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f0f0f] rounded-xl p-1 w-fit">
        {([['feed', 'Community'], ['mine', 'My Photos'], ['upload', 'Post Photo']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t === 'upload'
              ? <span className="flex items-center gap-1"><Upload className="w-3.5 h-3.5" />{label}</span>
              : label}
          </button>
        ))}
      </div>

      {(success || error) && (
        <div className={`rounded-xl p-3 text-sm border ${
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
          {feed.length === 0 && (
            <Card className="text-center py-12">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No photos yet. Be the first to post!</p>
            </Card>
          )}
          {feed.map((p) => <PhotoCard key={p.id} photo={p} showUser={true} />)}
        </div>
      )}

      {/* My Photos */}
      {tab === 'mine' && (
        <div className="max-w-md mx-auto space-y-4">
          {myPhotos.length === 0 && (
            <Card className="text-center py-12">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No photos yet.</p>
              <button onClick={() => setTab('upload')} className="text-indigo-400 text-sm hover:text-indigo-300 mt-1">
                Upload your first →
              </button>
            </Card>
          )}
          {myPhotos.map((p) => <PhotoCard key={p.id} photo={p} showUser={false} />)}
        </div>
      )}

      {/* Upload */}
      {tab === 'upload' && (
        <div className="max-w-md mx-auto">
          <Card>
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Post a Progress Photo
            </h2>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 active:bg-white/2"
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
                className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
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
