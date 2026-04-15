'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Upload, X, Pencil, Check,
  Heart, MessageCircle, UserPlus, UserCheck, Bell, Send,
  Flame, Award, Users, Grid3X3, ChevronLeft, Trash2,
  Scale, Ruler, Target, Activity, RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { SocialPost, PostComment, ActivityItem, SuggestedUser } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: string) {
  try { return formatDistanceToNowStrict(new Date(ts), { addSuffix: true }); }
  catch { return ''; }
}

function Avatar({
  user,
  size = 36,
  className = '',
}: {
  user: { name?: string | null; phone_number?: string; avatar_url?: string | null };
  size?: number;
  className?: string;
}) {
  const initials = (user.name || user.phone_number || '?').slice(0, 1).toUpperCase();
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar_url}
      alt={user.name || 'avatar'}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={`rounded-full bg-red-700/30 flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-red-300 font-bold" style={{ fontSize: size * 0.38 }}>{initials}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
      <div className="px-4 py-3 space-y-2">
        <div className="skeleton h-3 w-1/4" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}

// ─── Comment bottom sheet ─────────────────────────────────────────────────────

function CommentSheet({
  postId,
  currentUserId,
  currentUser,
  onClose,
}: {
  postId: string;
  currentUserId: string;
  currentUser: { name?: string | null; avatar_url?: string | null; phone_number?: string };
  onClose: () => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // Prevent the same tap that opens the sheet from immediately closing it via backdrop
  const canCloseRef = useRef(false);

  useEffect(() => {
    fetch(`/api/social/${postId}/comments`)
      .then((r) => r.json())
      .then((d) => { setComments(d.comments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [postId]);

  // Allow backdrop close only after a short mount delay (prevents click-through)
  useEffect(() => {
    const t = setTimeout(() => { canCloseRef.current = true; }, 250);
    return () => clearTimeout(t);
  }, []);

  // Scroll within the list container — NOT the page
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments]);

  // Prevent background page from scrolling while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/social/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text.trim() }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((c) => [...c, comment]);
      setText('');
    } else {
      const d = await res.json().catch(() => ({}));
      // Surface the error inline rather than silently failing
      alert(d.error || 'Failed to post comment. Please try again.');
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop — guarded to prevent same-tap close */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (canCloseRef.current) onClose(); }} />

      {/* Sheet */}
      <div className="relative bg-[#0f0f0f] rounded-t-2xl max-h-[75vh] flex flex-col border-t border-white/8 shadow-2xl">
        {/* Handle */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
          <h3 className="font-semibold text-white text-sm">Comments</h3>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment list — scrolls within itself */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">No comments yet. Be first!</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar user={c.users} size={32} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 rounded-2xl px-3 py-2">
                    <span className="text-xs font-semibold text-white">
                      {c.users.name || c.users.phone_number}
                      {c.user_id === currentUserId && <span className="text-red-400/70"> (you)</span>}
                    </span>
                    <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">{c.body}</p>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 px-1">{relativeTime(c.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2.5 px-4 py-3 border-t border-white/5 flex-shrink-0 items-center">
          <Avatar user={currentUser} size={32} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Add a comment…"
            className="flex-1 bg-white/5 border border-white/8 rounded-full px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600/50 min-w-0"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 disabled:bg-white/10 disabled:text-slate-600 text-white flex-shrink-0 active:scale-95 transition-all"
          >
            {sending
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Suggested Users strip ────────────────────────────────────────────────────

function SuggestedUsers({
  users,
  followingIds,
  onFollow,
}: {
  users: SuggestedUser[];
  followingIds: Set<string>;
  onFollow: (id: string) => void;
}) {
  // Filter out users already being followed
  const unfollowed = users.filter((u) => !followingIds.has(u.id));

  if (users.length > 0 && unfollowed.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 mb-1">
        <Users className="w-3.5 h-3.5 text-slate-600" />
        <p className="text-xs text-slate-600">No more suggestions — you know everyone! 🎉</p>
      </div>
    );
  }

  if (!unfollowed.length) return null;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-3.5 h-3.5 text-slate-500" />
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">People you may know</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {unfollowed.map((u) => (
          <div key={u.id} className="flex-shrink-0 glass-card p-3 text-center w-[88px]">
            <Avatar user={u} size={40} className="mx-auto mb-2" />
            <p className="text-[11px] font-semibold text-white truncate">{u.name || u.phone_number.slice(-4)}</p>
            <button
              onClick={() => onFollow(u.id)}
              className="mt-1.5 w-full text-[10px] font-medium py-1 rounded-full transition-colors bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-95"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Upload Form (inline) ─────────────────────────────────────────────────────

function UploadForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isWeekly, setIsWeekly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setError(uploadData.error || 'Upload failed'); setUploading(false); return; }

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uploadData.url, is_weekly: isWeekly, caption }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); setUploading(false); return; }

      onSuccess();
    } catch { setError('Upload failed. Try again.'); }
    setUploading(false);
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" /> Post a Progress Photo
        </h3>
        <button onClick={onCancel} className="p-1.5 text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-red-600/50 rounded-xl p-6 text-center cursor-pointer active:bg-white/2 transition-colors"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
        ) : (
          <>
            <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Tap to select photo</p>
            <p className="text-slate-600 text-xs mt-0.5">JPEG · PNG · WebP · Max 5 MB</p>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption…"
        rows={2}
        dir="ltr"
        className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 resize-none"
      />
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isWeekly}
          onChange={(e) => setIsWeekly(e.target.checked)}
          className="w-4 h-4 accent-red-600"
        />
        <span className="text-sm text-slate-300">Mark as weekly check-in</span>
      </label>
      <Button onClick={handleUpload} loading={uploading} className="w-full min-h-[48px]">
        <Upload className="w-4 h-4" /> Post Photo
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'feed' | 'activity' | 'profile';
type FeedFilter = 'all' | 'following';

interface ProfileData {
  id: string;
  name: string | null;
  phone_number: string;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  bmi: number | null;
  bmiCategory: string | null;
  avatar_url?: string | null;
}

export default function SocialPage() {
  const router = useRouter();
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // ── Auth / current user ──
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUser,   setCurrentUser]   = useState<{
    name?: string | null; avatar_url?: string | null; phone_number?: string;
  }>({});

  // ── Feed ──
  const [feed,       setFeed]       = useState<SocialPost[]>([]);
  const [myPhotos,   setMyPhotos]   = useState<SocialPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedLoading,setFeedLoading]= useState(true);

  // ── Social state ──
  const [likeState,      setLikeState]      = useState<Record<string, { liked: boolean; count: number }>>({});
  const [followingIds,   setFollowingIds]   = useState<Set<string>>(new Set());
  const [commentSheetId, setCommentSheetId] = useState<string | null>(null);
  const [commentCounts,  setCommentCounts]  = useState<Record<string, number>>({});

  // ── Activity ──
  const [activity,       setActivity]       = useState<ActivityItem[]>([]);
  const [unread,         setUnread]         = useState(0);
  const [activityLoaded, setActivityLoaded] = useState(false);

  // ── Suggested users ──
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);

  // ── Profile tab ──
  const [profileData,   setProfileData]   = useState<ProfileData | null>(null);
  const [followStats,   setFollowStats]   = useState({ followers_count: 0, following_count: 0 });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showUploadForm,  setShowUploadForm]  = useState(false);
  const [gridPostId,      setGridPostId]      = useState<string | null>(null);

  // ── Setup banner (missing social tables) ──
  const [setupNeeded,    setSetupNeeded]    = useState(false);
  const [sqlCopied,      setSqlCopied]      = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // ── Misc UI ──
  const [refreshing,   setRefreshing]   = useState(false);
  const [tab,          setTab]          = useState<Tab>('feed');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editCaption,  setEditCaption]  = useState('');
  const [savingCaption,setSavingCaption]= useState(false);
  const [toast,        setToast]        = useState('');

  // ── Load feed ─────────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (uid: string, filter: FeedFilter = 'all') => {
    setFeedLoading(true);
    const res = await fetch(`/api/social/posts?filter=${filter}`);
    if (res.ok) {
      const { posts } = await res.json();
      const all: SocialPost[] = posts ?? [];

      const ls: Record<string, { liked: boolean; count: number }> = {};
      const cc: Record<string, number> = {};
      const serverFollowing = new Set<string>();
      for (const p of all) {
        ls[p.id] = { liked: p.liked_by_me, count: p.like_count };
        cc[p.id] = p.comment_count;
        if (p.is_following_author) serverFollowing.add(p.user_id);
      }
      setLikeState(ls);
      setCommentCounts(cc);
      // Merge server follow state with local optimistic state
      // (if server returns data, trust it; if server returns nothing it may be a missing-table scenario
      //  so we keep local state to avoid resetting what the user just clicked)
      setFollowingIds((localIds) => {
        if (serverFollowing.size > 0) return serverFollowing; // server has real data
        // Server returned zero follows — could be missing table, keep local optimistic state
        return localIds.size > 0 ? localIds : serverFollowing;
      });
      setFeed(all);
      setMyPhotos(all.filter((p) => p.users?.id === uid || p.user_id === uid));
    }
    setFeedLoading(false);
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) { router.push('/login'); return; }
      const meData = await meRes.json();
      const uid = meData.user?.id || '';
      setCurrentUserId(uid);
      setCurrentUser({
        name: meData.user?.name,
        avatar_url: meData.user?.avatar_url,
        phone_number: meData.user?.phone_number,
      });

      await Promise.all([
        loadFeed(uid, 'all'),
        fetch('/api/users/suggested').then((r) => r.json()).then((d) => setSuggested(d.users ?? [])),
        fetch('/api/activity').then((r) => r.json()).then((d) => setUnread(d.unread ?? 0)),
        // Check if social tables exist — show setup banner if missing
        fetch('/api/social/health')
          .then((r) => r.json())
          .then((d) => { if (!d.ready) setSetupNeeded(true); })
          .catch(() => null),
      ]);
    }
    init();
  }, [router, loadFeed]);

  // ── Re-fetch feed on filter change ──────────────────────────────────────────
  useEffect(() => {
    if (currentUserId) loadFeed(currentUserId, feedFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedFilter]);

  // ── Load activity ────────────────────────────────────────────────────────────
  async function openActivityTab() {
    setTab('activity');
    setActivityLoaded(false); // show loading spinner while refreshing
    try {
      const res = await fetch('/api/activity');
      if (res.ok) {
        const { activity: items } = await res.json();
        setActivity(items ?? []);
      } else {
        setActivity([]);
      }
    } catch {
      setActivity([]);
    }
    setActivityLoaded(true); // always mark done — no more infinite "Loading…"
    // Mark all as read in background
    fetch('/api/activity', { method: 'POST' }).catch(() => null);
    setUnread(0);
  }

  // ── Load profile ─────────────────────────────────────────────────────────────
  async function openProfileTab() {
    setTab('profile');
    if (!profileLoaded) {
      const [profileRes, followRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/follow'),
      ]);
      if (profileRes.ok) setProfileData(await profileRes.json());
      if (followRes.ok) {
        const fd = await followRes.json();
        setFollowStats({ followers_count: fd.followers_count ?? 0, following_count: fd.following_count ?? 0 });
      }
      setProfileLoaded(true);
    }
  }

  // ── Like toggle ──────────────────────────────────────────────────────────────
  async function handleLike(postId: string) {
    const prev = likeState[postId] ?? { liked: false, count: 0 };
    // Optimistic update
    setLikeState((s) => ({
      ...s,
      [postId]: { liked: !prev.liked, count: prev.liked ? prev.count - 1 : prev.count + 1 },
    }));

    const res = await fetch(`/api/social/${postId}/like`, { method: 'POST' });
    if (res.ok) {
      const { liked, count } = await res.json();
      setLikeState((s) => ({ ...s, [postId]: { liked, count } }));
    } else {
      // Revert on failure
      setLikeState((s) => ({ ...s, [postId]: prev }));
      if (res.status === 503) setSetupNeeded(true); // nudge banner
    }
  }

  // ── Follow toggle ────────────────────────────────────────────────────────────
  async function handleFollow(authorId: string) {
    const wasFollowing = followingIds.has(authorId);
    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (next.has(authorId)) next.delete(authorId); else next.add(authorId);
      return next;
    });
    if (!wasFollowing) setSuggested((prev) => prev.filter((u) => u.id !== authorId));

    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: authorId }),
    });

    if (!res.ok) {
      // Revert on failure
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(authorId); else next.delete(authorId);
        return next;
      });
      if (res.status === 503) setSetupNeeded(true); // nudge migration banner
      else showToast('Could not update follow. Please try again.');
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(photoId: string) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(photoId);
    const res = await fetch(`/api/progress/${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadFeed(currentUserId, feedFilter);
      showToast('Photo deleted.');
    } else {
      const d = await res.json();
      showToast(d.error || 'Failed to delete photo.');
    }
    setDeletingId(null);
  }

  // ── Caption edit ─────────────────────────────────────────────────────────────
  async function saveCaption(photoId: string) {
    setSavingCaption(true);
    const res = await fetch(`/api/progress/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: editCaption }),
    });
    if (res.ok) { await loadFeed(currentUserId, feedFilter); setEditingId(null); }
    else { const d = await res.json(); showToast(d.error || 'Failed to save'); }
    setSavingCaption(false);
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd });
    if (res.ok) {
      const { avatar_url } = await res.json();
      setCurrentUser((u) => ({ ...u, avatar_url }));
      setProfileData((p) => p ? { ...p, avatar_url } : p);
      showToast('Profile picture updated!');
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || 'Upload failed');
    }
    setUploadingAvatar(false);
    if (avatarFileRef.current) avatarFileRef.current.value = '';
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── Manual refresh ────────────────────────────────────────────────────────────
  async function handleRefresh() {
    if (refreshing || !currentUserId) return;
    setRefreshing(true);
    await Promise.all([
      loadFeed(currentUserId, feedFilter),
      fetch('/api/users/suggested').then((r) => r.json()).then((d) => setSuggested(d.users ?? [])),
    ]);
    setRefreshing(false);
  }

  const MIGRATION_SQL = `-- Run this in Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES progress_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES progress_photos(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow','pr_highlight','streak')),
  post_id UUID REFERENCES progress_photos(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  meta JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (recipient_id, actor_id, type, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_recipient ON activity_feed(recipient_id, created_at DESC);`;

  async function copySql() {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    } catch { /* fallback */ }
  }

  // ─── Photo card ───────────────────────────────────────────────────────────────
  function PhotoCard({ photo, showUser = true }: { photo: SocialPost; showUser?: boolean }) {
    const displayName = photo.users?.name || photo.users?.phone_number || 'Anonymous';
    const isMe        = photo.users?.id === currentUserId || photo.user_id === currentUserId;
    const captionText = photo.caption || photo.note;
    const isEditing   = editingId === photo.id;
    const isFollowing = followingIds.has(photo.user_id);
    const ls          = likeState[photo.id] ?? { liked: photo.liked_by_me, count: photo.like_count };
    const cc          = commentCounts[photo.id] ?? photo.comment_count;

    return (
      <div className="glass-card overflow-hidden fade-in">
        {/* ── Header ── */}
        {showUser && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <Avatar user={photo.users} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {isMe ? `${displayName} (you)` : displayName}
              </p>
              <p className="text-xs text-slate-500">{formatDate(photo.date, 'MMM dd, yyyy')}</p>
            </div>

            {photo.is_weekly && <Badge variant="info" className="flex-shrink-0">Weekly</Badge>}

            {/* Follow button */}
            {!isMe && (
              <button
                onClick={() => handleFollow(photo.user_id)}
                className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${
                  isFollowing
                    ? 'border-slate-600 text-slate-400 bg-white/5'
                    : 'border-red-600/50 text-red-400 hover:bg-red-600/10'
                }`}
              >
                {isFollowing
                  ? <><UserCheck className="w-3 h-3" /> Following</>
                  : <><UserPlus className="w-3 h-3" /> Follow</>}
              </button>
            )}

            {/* Delete — own posts */}
            {isMe && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="p-2 text-slate-600 hover:text-red-400 min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0"
              >
                {deletingId === photo.id
                  ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {/* ── Image ── */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.image_url}
            alt={captionText || 'Progress photo'}
            className="w-full object-cover"
            style={{ maxHeight: '480px' }}
            loading="lazy"
          />
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center gap-5 px-4 pt-3 pb-1">
          <button
            onClick={() => handleLike(photo.id)}
            className={`flex items-center gap-1.5 transition-colors active:scale-90 ${
              ls.liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'
            }`}
          >
            <Heart className={`w-5 h-5 transition-none ${ls.liked ? 'fill-red-500' : ''}`} />
            <span className="text-sm font-medium tabular-nums">{ls.count}</span>
          </button>

          <button
            onClick={() => setCommentSheetId(photo.id)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors active:scale-90"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{cc}</span>
          </button>
        </div>

        {/* ── Likes label ── */}
        {ls.count > 0 && (
          <p className="px-4 pt-1 text-xs font-semibold text-white">
            {ls.count} {ls.count === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* ── Caption / edit ── */}
        {isEditing ? (
          <div className="px-4 py-3 space-y-2">
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={2}
              autoFocus
              className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 resize-none"
              placeholder="Add a caption…"
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
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2">
            {captionText ? (
              <div className="flex items-start gap-2 group">
                <p className="text-sm text-slate-300 leading-relaxed flex-1">
                  <span className="font-semibold text-white mr-1">{showUser ? displayName : 'You'}</span>
                  {captionText}
                </p>
                {isMe && (
                  <button
                    onClick={() => { setEditingId(photo.id); setEditCaption(captionText); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : isMe ? (
              <button
                onClick={() => { setEditingId(photo.id); setEditCaption(''); }}
                className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1 py-1"
              >
                <Pencil className="w-3 h-3" /> Add caption
              </button>
            ) : null}
          </div>
        )}

        {/* ── Comment preview ── */}
        {cc > 0 && (
          <button
            onClick={() => setCommentSheetId(photo.id)}
            className="px-4 pb-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            View all {cc} comment{cc !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    );
  }

  // ─── Activity item ────────────────────────────────────────────────────────────
  function ActivityRow({ item }: { item: ActivityItem }) {
    const actor = item.actor;
    if (!actor) return null;
    const actorName = actor.name || actor.phone_number;

    const message =
      item.type === 'like'    ? 'liked your photo' :
      item.type === 'comment' ? `commented: "${(item.meta?.body as string | undefined)?.slice(0, 40) ?? ''}"` :
      item.type === 'follow'  ? 'started following you' :
      item.type === 'pr_highlight' ? 'hit a new PR! 💪' :
      item.type === 'streak'  ? 'is on a 🔥 streak!' : '';

    return (
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${!item.read ? 'bg-white/2' : ''}`}>
        <Avatar user={actor} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-snug">
            <span className="font-semibold text-white">{actorName}</span>{' '}
            {message}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{relativeTime(item.created_at)}</p>
        </div>
        {item.post?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.post.image_url}
            alt=""
            className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-white/8"
          />
        )}
        {!item.read && (
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  // ─── Grid post modal ──────────────────────────────────────────────────────────
  const gridPost = gridPostId ? myPhotos.find((p) => p.id === gridPostId) : null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h1 className="font-display text-3xl sm:text-5xl text-white leading-none">SOCIAL FEED</h1>
        <p className="text-sm text-slate-400 mt-0.5">Community progress &amp; achievements</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f0f0f] rounded-xl p-1">
        {([
          ['feed',     'Community'],
          ['activity', 'Activity'],
          ['profile',  'My Profile'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => t === 'activity' ? openActivityTab() : t === 'profile' ? openProfileTab() : setTab(t)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium py-2 px-2 rounded-lg transition-all ${
              tab === t ? 'bg-red-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'activity' && (
              <>
                <Bell className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center flex-shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </>
            )}
            {t === 'profile' && (
              <>
                <Grid3X3 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </>
            )}
            {t === 'feed' && label}
          </button>
        ))}
      </div>

      {/* Setup banner — shown when social tables are missing */}
      {setupNeeded && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 fade-in">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">Social features need one-time setup</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Likes, comments &amp; follows require a database migration. Run it once in your Supabase SQL Editor.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  View Migration SQL →
                </button>
                <button
                  onClick={() => setSetupNeeded(false)}
                  className="text-xs text-amber-400/50 hover:text-amber-400 px-2 py-1.5"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migration SQL modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSetupModal(false)} />
          <div className="relative w-full sm:max-w-lg bg-[#0f0f0f] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/8 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
              <div>
                <h3 className="font-semibold text-white text-sm">Social Tables Migration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Paste &amp; run in Supabase Dashboard → SQL Editor</p>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="p-1.5 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs text-slate-300 bg-black/40 border border-white/8 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                {MIGRATION_SQL}
              </pre>
            </div>
            <div className="px-4 pb-4 pt-2 flex-shrink-0 space-y-2">
              <button
                onClick={copySql}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  sqlCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-700 hover:bg-red-600 text-white active:scale-[0.98]'
                }`}
              >
                {sqlCopied ? '✓ Copied!' : 'Copy SQL'}
              </button>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-xl text-sm font-medium text-center text-slate-400 border border-white/8 hover:text-white hover:border-white/20 transition-colors"
              >
                Open Supabase Dashboard ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="rounded-xl p-3 text-sm border fade-in bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          {toast}
        </div>
      )}

      {/* ── Community Feed ── */}
      {tab === 'feed' && (
        <div className="max-w-md mx-auto space-y-4">
          {/* Filter toggle + Refresh button */}
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="text-slate-500 truncate">
              {feedFilter === 'all' ? 'Showing all members' : 'Showing people you follow'}
            </span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setFeedFilter((f) => f === 'all' ? 'following' : 'all')}
                className="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                {feedFilter === 'all' ? 'Following →' : '← Everyone'}
              </button>
            </div>
          </div>

          {/* Suggested users */}
          {feedFilter === 'all' && (
            <SuggestedUsers
              users={suggested}
              followingIds={followingIds}
              onFollow={handleFollow}
            />
          )}

          {feedLoading ? (
            <><PhotoSkeleton /><PhotoSkeleton /></>
          ) : feed.length === 0 ? (
            <Card className="text-center py-12">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">
                {feedFilter === 'following'
                  ? 'No posts from people you follow yet.'
                  : 'No photos yet. Be the first to post!'}
              </p>
            </Card>
          ) : (
            feed.map((p) => <PhotoCard key={p.id} photo={p} showUser />)
          )}
        </div>
      )}

      {/* ── Activity / Notifications ── */}
      {tab === 'activity' && (
        <div className="max-w-md mx-auto space-y-4">
          {!activityLoaded ? (
            <div className="text-center py-12 text-slate-600 text-sm">Loading…</div>
          ) : activity.length === 0 ? (
            <Card className="text-center py-12">
              <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No activity yet.</p>
              <p className="text-slate-600 text-xs mt-1">
                Post a photo and your gym-mates will start engaging!
              </p>
            </Card>
          ) : (
            <div className="glass-card overflow-hidden divide-y divide-white/5">
              {activity.filter((a) => a.type === 'pr_highlight' || a.type === 'streak').length > 0 && (
                <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
                  <p className="text-xs text-amber-400/80 font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Highlights
                  </p>
                </div>
              )}
              {activity.map((item) => <ActivityRow key={item.id} item={item} />)}
            </div>
          )}

          <div className="glass-card p-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Daily engagement goals
            </p>
            {[
              'Like 3 posts today',
              "Comment on a friend's progress",
              'Post your workout selfie',
            ].map((goal) => (
              <div key={goal} className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/40 flex-shrink-0" />
                {goal}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Social Profile ── */}
      {tab === 'profile' && (
        <div className="max-w-md mx-auto space-y-4">
          {/* ── Profile Header ── */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-4">
              {/* Avatar + upload button */}
              <div className="relative flex-shrink-0">
                <Avatar user={currentUser} size={72} />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 border-2 border-[#0f0f0f] flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  title="Change photo"
                >
                  {uploadingAvatar
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-2.5 h-2.5 text-white" />}
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base truncate">
                  {currentUser.name || currentUser.phone_number || 'Athlete'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{currentUser.phone_number}</p>

                {/* Body stats row */}
                {profileData && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.weight_kg && (
                      <div className="flex items-center gap-1 text-[11px] bg-white/5 rounded-lg px-2 py-1">
                        <Scale className="w-3 h-3 text-red-400" />
                        <span className="text-slate-300">{profileData.weight_kg} kg</span>
                      </div>
                    )}
                    {profileData.height_cm && (
                      <div className="flex items-center gap-1 text-[11px] bg-white/5 rounded-lg px-2 py-1">
                        <Ruler className="w-3 h-3 text-blue-400" />
                        <span className="text-slate-300">{profileData.height_cm} cm</span>
                      </div>
                    )}
                    {profileData.bmi && (
                      <div className="flex items-center gap-1 text-[11px] bg-white/5 rounded-lg px-2 py-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span className="text-slate-300">BMI {profileData.bmi}</span>
                      </div>
                    )}
                    {profileData.goal && (
                      <div className="flex items-center gap-1 text-[11px] bg-white/5 rounded-lg px-2 py-1">
                        <Target className="w-3 h-3 text-amber-400" />
                        <span className="text-slate-300 capitalize">{profileData.goal.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {(!profileData || (!profileData.weight_kg && !profileData.height_cm)) && profileLoaded && (
                  <button
                    onClick={() => router.push('/analytics')}
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    + Set body stats in Analytics →
                  </button>
                )}
              </div>
            </div>

            {/* Followers / Following / Posts row */}
            <div className="flex gap-6 mt-4 pt-3 border-t border-white/5">
              <div className="text-center">
                <p className="text-lg font-bold text-white leading-none">{myPhotos.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white leading-none">{followStats.followers_count}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white leading-none">{followStats.following_count}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Following</p>
              </div>
            </div>
          </div>

          {/* ── Post Photo button ── */}
          {!showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
            >
              <Camera className="w-4 h-4" /> Post Progress Photo
            </button>
          )}

          {/* ── Upload form ── */}
          {showUploadForm && (
            <UploadForm
              onSuccess={async () => {
                setShowUploadForm(false);
                showToast('Photo posted! 🎉');
                await loadFeed(currentUserId, feedFilter);
              }}
              onCancel={() => setShowUploadForm(false)}
            />
          )}

          {/* ── Suggested users (on profile) ── */}
          {suggested.length > 0 && (
            <SuggestedUsers
              users={suggested}
              followingIds={followingIds}
              onFollow={handleFollow}
            />
          )}

          {/* ── Posts grid ── */}
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5" /> My Posts
            </p>
            {feedLoading ? (
              <div className="grid grid-cols-3 gap-0.5">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="skeleton aspect-square" />
                ))}
              </div>
            ) : myPhotos.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-sm">
                <Camera className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                No posts yet. Share your first progress photo!
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden">
                {myPhotos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setGridPostId(p.id)}
                    className="relative aspect-square overflow-hidden bg-white/5 active:opacity-80 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url}
                      alt={p.caption || 'Post'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Like/comment overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-all">
                      <span className="text-white text-xs font-semibold flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-white" />
                        {(likeState[p.id]?.count ?? p.like_count) || 0}
                      </span>
                      <span className="text-white text-xs font-semibold flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {commentCounts[p.id] ?? p.comment_count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Grid Post Modal ── */}
      {gridPost && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGridPostId(null)} />
          <div className="relative w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#0f0f0f] shadow-2xl">
            {/* Close bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-[#0f0f0f] z-10">
              <button
                onClick={() => setGridPostId(null)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <p className="text-xs text-slate-500">{formatDate(gridPost.date, 'MMM dd, yyyy')}</p>
            </div>
            <PhotoCard photo={gridPost} showUser={false} />
          </div>
        </div>
      )}

      {/* Comment sheet */}
      {commentSheetId && (
        <CommentSheet
          postId={commentSheetId}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onClose={() => {
            fetch(`/api/social/${commentSheetId}/comments`)
              .then((r) => r.json())
              .then((d) => setCommentCounts((c) => ({ ...c, [commentSheetId]: (d.comments ?? []).length })));
            setCommentSheetId(null);
          }}
        />
      )}
    </div>
  );
}
