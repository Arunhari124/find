'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Navigation, Heart, Flag, Send } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import TicTacToe from '@/components/TicTacToe';
import { supabase } from '@/lib/supabase';
import styles from './feed.module.css';

const getCategoryStyle = (category: string) => {
  if (!category) return { background: 'var(--glass-bg)' };

  const cat = category.toLowerCase();
  let gradient = 'var(--glass-bg)';

  if (cat.includes('wallet') || cat.includes('card')) {
    gradient = 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('electronic') || cat.includes('phone')) {
    gradient = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('jewelry') || cat.includes('watch') || cat.includes('gold')) {
    gradient = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, var(--glass-bg) 100%)';
  } else if (cat.includes('key')) {
    gradient = 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, var(--glass-bg) 100%)';
  }

  return { background: gradient };
};

export default function FeedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
  const [tempComments, setTempComments] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch Live Data from Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // Using a simpler query since relation mapping error might occur if comments table is not properly set yet.
    // If the comments table isn't created by the user yet, this could fail. 
    // We will separate the comments fetch to prevent the entire feed from failing.
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        profiles!inner ( id, full_name, phone_number, whatsapp_number )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (itemsData) {
      // Safely attempt to fetch comments per item in parallel
      const enrichedItems = await Promise.all(itemsData.map(async (d: any) => {
        let commentsList: any[] = [];
        try {
          const { data: cData } = await supabase
            .from('comments')
            .select('id, content, profiles(full_name)')
            .eq('item_id', d.id)
            .order('created_at', { ascending: false })
            .limit(3);
          if (cData) commentsList = cData;
        } catch (e) { /* ignore if comments table not yet created */ }

        return {
          id: d.id,
          type: d.type,
          category: d.category || 'Other',
          name: d.product_name,
          user: d.profiles?.full_name || 'Guest User',
          user_id: d.profiles?.id,
          distance: d.location_area || 'Nearby',
          image: d.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
          description: d.description || 'No description provided.',
          comments: commentsList
        };
      }));
      setItems(enrichedItems);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSwipe = (direction: 'left' | 'right', id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (direction === 'right') {
      alert('Interest noted! You can contact the user from your profile matches.');
    }
  };

  const toggleLike = (id: number) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCommentSubmit = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must be logged in to comment.");
      return;
    }
    const text = tempComments[itemId];
    if (!text || !text.trim()) return;

    // Optimistically update
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          comments: [{ id: Math.random(), content: text, profiles: { full_name: 'You' } }, ...item.comments]
        };
      }
      return item;
    }));
    setTempComments(prev => ({ ...prev, [itemId]: '' }));

    // Send to DB
    const { error } = await supabase.from('comments').insert({
      item_id: itemId,
      user_id: currentUser.id,
      content: text
    });

    if (error) {
      console.error("Make sure to run the SQL to create the comments table!");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTabs}>
          <div className={styles.activeTab}>Main Feed</div>
          <Link href="/found" className={styles.tab} style={{ textDecoration: 'none' }}>Found Gallery</Link>
        </div>
      </header>

      <div className={styles.cardContainer}>
        <AnimatePresence>
          {loading ? (
            <div className={styles.emptyState}>
              <p>Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState} style={{ zIndex: 10 }}>
              <TicTacToe />
              <button onClick={fetchItems} className="btn-3d btn-primary" style={{ marginTop: '2rem' }}>
                Refresh Feed / Loop Back
              </button>
            </div>
          ) : (
            items.map((item, index) => {
              const isTop = index === 0;
              return (
                <motion.div
                  key={item.id}
                  className={styles.cardWrapper}
                  initial={{ scale: 0.9, opacity: 0, y: 50 }}
                  animate={{
                    scale: isTop ? 1 : 0.95,
                    opacity: 1,
                    y: isTop ? 0 : 20,
                    zIndex: items.length - index,
                  }}
                  exit={{ x: -300, opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  drag={isTop ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset }) => {
                    if (offset.x > 100) handleSwipe('right', item.id);
                    else if (offset.x < -100) handleSwipe('left', item.id);
                  }}
                  whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
                >
                  <div className={`glass-card ${styles.itemCard}`}>
                    <div className={styles.cardBadge} style={{
                      background: item.type === 'lost' ? 'var(--status-lost-bg)' : 'var(--status-found-bg)',
                      color: item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)',
                    }}>
                      {item.type.toUpperCase()}
                    </div>

                    <img src={item.image} alt={item.name} className={styles.itemImage} draggable="false" />

                    <div className={styles.itemInfo} style={getCategoryStyle(item.category)}>
                      <div className={styles.metaRow}>
                        <span className={styles.itemCategory}>{item.category}</span>
                        <span className={styles.itemDistance}><Navigation size={12} /> {item.distance}</span>
                      </div>
                      <h3 className={styles.itemName}>{item.name}</h3>
                      <p className={styles.itemDescription}>{item.description}</p>

                      <div className={styles.userRow}>
                        <div className={styles.userAvatar}>{item.user[0]}</div>
                        <span className={styles.userName}>{item.user} ✓</span>
                      </div>

                      {/* Privacy enhancement: Only show chat, do not expose phone number on feed */}
                      <div className={styles.actionButtons} style={{ marginTop: '16px' }}>
                        <Link href={`/chat?peer=${item.user_id}`} className="btn-3d btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
                          <MessageCircle size={18} /> Direct Message
                        </Link>
                      </div>

                      <Link href={`/item/${item.id}`} className="btn-3d" style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '12px', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                        View Full Details
                      </Link>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <button onClick={() => toggleLike(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: likedItems.has(item.id) ? 'var(--status-lost-text)' : 'var(--text-secondary)' }}>
                            <Heart size={20} fill={likedItems.has(item.id) ? 'var(--status-lost-text)' : 'none'} />
                            <span style={{ fontSize: '0.8rem' }}>{likedItems.has(item.id) ? 'Liked' : 'Like'}</span>
                          </button>
                        </div>
                        <button onClick={() => alert('Item reported for moderation.')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <Flag size={18} />
                          <span style={{ fontSize: '0.8rem' }}>Report</span>
                        </button>
                      </div>

                      {/* Real Comments Section */}
                      {item.comments && item.comments.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                          {item.comments.slice(0, 2).map((c: any) => (
                            <p key={c.id} style={{ fontSize: '0.8rem', margin: '4px 0', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', marginRight: '4px' }}>
                                {c.profiles?.full_name || 'User'}:
                              </span>
                              {c.content}
                            </p>
                          ))}
                          {item.comments.length > 2 && <Link href={`/item/${item.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>View all comments...</Link>}
                        </div>
                      )}

                      {/* Add Comment Input */}
                      <form onSubmit={(e) => handleCommentSubmit(e, item.id)} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <input
                          type="text"
                          placeholder="Add a real comment..."
                          value={tempComments[item.id] || ''}
                          onChange={e => setTempComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px 16px', color: 'white', fontSize: '0.85rem' }}
                        />
                        <button type="submit" style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Send size={14} color="white" />
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
