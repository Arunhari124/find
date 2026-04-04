'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, MessageSquare, MapPin, AlertTriangle, ShieldOff } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import styles from './chat.module.css';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div style={{padding: '2rem'}}>Loading Chat...</div></div>}>
      <ChatRouter />
    </Suspense>
  );
}

function ChatRouter() {
  const searchParams = useSearchParams();
  const peerParam = searchParams.get('peer');
  const itemParam = searchParams.get('item');

  if (peerParam) {
    return <ChatContent peerId={peerParam} itemId={itemParam} />;
  }
  return <InboxView />;
}

function InboxView() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInbox() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messages && messages.length > 0) {
        const peerMap = new Map();
        messages.forEach(msg => {
          // Group by peer + item to separate contexts
          const peerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const groupKey = `${peerId}_${msg.item_id || 'general'}`;
          if (!peerMap.has(groupKey)) {
            peerMap.set(groupKey, msg);
          }
        });

        const uniquePeers = Array.from(new Set(Array.from(peerMap.values()).map(m => m.sender_id === user.id ? m.receiver_id : m.sender_id)));

        if (uniquePeers.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uniquePeers);
          if (profiles) {
            const profileLookup = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
            const convoList = Array.from(peerMap.values()).map((latestMsg: any) => {
              const peerId = latestMsg.sender_id === user.id ? latestMsg.receiver_id : latestMsg.sender_id;
              return {
                peerId,
                itemId: latestMsg.item_id,
                peerName: profileLookup[peerId] || 'Unknown',
                latestMessage: latestMsg.content,
                timestamp: latestMsg.created_at,
              };
            });
            convoList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setConversations(convoList);
          }
        }
      }
      setLoading(false);
    }
    loadInbox();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.chatName}>Inbox</h2>
        <p className={styles.chatSub}>Your active matches</p>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading conversations...</p>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <MessageSquare size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>No messages yet.</p>
            <p style={{ fontSize: '0.85rem' }}>Start a conversation from an item's detail page.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {conversations.map(convo => (
              <Link 
                key={`${convo.peerId}_${convo.itemId}`} 
                href={`/chat?peer=${convo.peerId}${convo.itemId ? `&item=${convo.itemId}` : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className={styles.avatar} style={{ width: '40px', height: '40px', fontSize: '1.2rem', margin: 0 }}>
                    {convo.peerName[0]}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {convo.peerName}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(convo.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {convo.latestMessage}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function ChatContent({ peerId, itemId }: { peerId: string, itemId: string | null }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [peerUser, setPeerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Safety State
  const [isBlocked, setIsBlocked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Make sure we have an audio context setup safely
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    async function loadChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: specificPeer } = await supabase.from('profiles').select('*').eq('id', peerId).single();
      if (specificPeer) {
        setPeerUser(specificPeer);
        
        // Fetch existing messages
        let query = supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${specificPeer.id}),and(sender_id.eq.${specificPeer.id},receiver_id.eq.${user.id})`);
        
        if (itemId) query = query.eq('item_id', itemId);

        const { data: msgs } = await query.order('created_at', { ascending: true });
        
        if (msgs) setMessages(msgs);

        const channel = supabase.channel(`chat_room_${specificPeer.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            if (
              ((newMsg.sender_id === user.id && newMsg.receiver_id === specificPeer.id) ||
              (newMsg.sender_id === specificPeer.id && newMsg.receiver_id === user.id)) &&
              (!itemId || newMsg.item_id === itemId)
            ) {
              setMessages(prev => {
                const isDuplicate = prev.some(m => m.id === newMsg.id);
                if (isDuplicate) return prev;
                return [...prev, newMsg];
              });
              
              // Trigger sound for high value words if it's from the peer
              if (newMsg.sender_id === specificPeer.id && /money|found|lost|reward/i.test(newMsg.content)) {
                audioRef.current?.play().catch(() => {}); // catch auto-play blocks
              }
            }
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); }
      }
      setLoading(false);
    }
    loadChat();
  }, [peerId, itemId]);

  const handleSend = async (e?: React.FormEvent, explicitMessage?: string) => {
    if (e) e.preventDefault();
    if (isBlocked) return;
    
    const textToSend = explicitMessage || message;
    if (!textToSend.trim() || !currentUser || !peerUser) return;
    
    if (!explicitMessage) setMessage('');
    
    const tempMsg = {
      id: Math.random().toString(),
      sender_id: currentUser.id,
      receiver_id: peerUser.id,
      item_id: itemId || null,
      content: textToSend,
      created_at: new Date().toISOString(),
      optimistic: true
    };
    setMessages(prev => [...prev, tempMsg]);

    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: peerUser.id,
      item_id: itemId || null,
      content: textToSend
    });
  };

  const handleLocationShare = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locStr = `📍 Live Location Shared: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          handleSend(undefined, locStr);
        },
        (err) => alert("Could not fetch precise location. Please allow GPS access."),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const toggleBlock = () => {
    if (window.confirm("Are you sure you want to block this user?")) {
      setIsBlocked(true);
      setShowOptions(false);
    }
  };

  if (loading && !peerUser) return <div className={styles.container}><div style={{padding: '2rem'}}>Loading...</div></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/chat" className={styles.backBtn}><ArrowLeft size={24} /></Link>
          <div className={styles.avatar}>{peerUser?.full_name?.[0] || 'C'}</div>
          <div>
            <h2 className={styles.chatName}>{peerUser?.full_name || 'Unknown User'}</h2>
            <p className={styles.chatSub}>{isBlocked ? 'Blocked' : 'Private Conversation'}</p>
          </div>
        </div>
        
        {/* Settings Dot Menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowOptions(!showOptions)} style={{ background: 'none', border: 'none', color: 'white', padding: '8px' }}>⋮</button>
          {showOptions && (
            <div className="glass-card" style={{ position: 'absolute', right: 0, top: '40px', width: '150px', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
              <button onClick={toggleBlock} style={{ padding: '12px', background: 'none', border: 'none', color: 'var(--status-lost-text)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldOff size={16} /> Block User
              </button>
              <button onClick={() => { alert('User reported to moderation team.'); setShowOptions(false); }} style={{ padding: '12px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <AlertTriangle size={16} /> Report
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.chatContainer}>
        <div className={styles.warningBanner}>
          Protect yourself from scams. Do not send money before meeting in person.
        </div>
        
        {messages.map((msg, idx) => {
          if (msg.optimistic && messages.some((m, i) => i !== idx && m.content === msg.content && !m.optimistic)) return null;

          const isMe = msg.sender_id === currentUser?.id;
          const isHighlight = /money|found|lost|reward/i.test(msg.content);
          
          let bubbleStyle: React.CSSProperties = { opacity: msg.optimistic ? 0.7 : 1 };
          if (isHighlight) {
            bubbleStyle = {
               ...bubbleStyle,
               transform: 'perspective(600px) translateZ(30px) scale(1.05)',
               boxShadow: '0 10px 20px rgba(255,215,0,0.3)',
               border: '1px solid rgba(255,215,0,0.8)',
               background: isMe ? 'linear-gradient(135deg, var(--accent-primary) 0%, rgba(217, 119, 6, 0.8) 100%)' : 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(217, 119, 6, 0.4) 100%)',
               color: 'white',
               transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            };
          }

          return (
            <div key={msg.id || idx} className={`${styles.messageWrapper} ${isMe ? styles.myWrapper : styles.otherWrapper}`} style={{ transition: 'all 0.3s' }}>
              <div className={`${styles.messageBubble} ${isMe ? styles.myMessage : styles.otherMessage}`} style={bubbleStyle}>
                {msg.content.includes('http') ? (
                  <a href={msg.content.substring(msg.content.indexOf('http'))} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    {msg.content}
                  </a>
                ) : (
                  msg.content
                )}
              </div>
              <span className={styles.time}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          );
        })}
        {isBlocked && (
          <div style={{ textAlign: 'center', color: 'var(--status-lost-text)', fontSize: '0.8rem', padding: '16px' }}>
            You have blocked this user. Messages cannot be sent.
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSend} className={styles.inputForm}>
          <button type="button" onClick={handleLocationShare} disabled={isBlocked} title="Share Live Location" style={{ background: 'none', border: 'none', padding: '8px', cursor: isBlocked ? 'not-allowed' : 'pointer' }}>
            <MapPin size={24} color={isBlocked ? "var(--text-secondary)" : "var(--status-found-bg)"} />
          </button>
          <input 
            type="text" 
            placeholder={isBlocked ? "Cannot send message..." : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={styles.input}
            disabled={isBlocked}
          />
          <button type="submit" className={`btn-3d ${styles.sendBtn}`} disabled={isBlocked}>
            <Send size={20} color="var(--accent-primary)" />
          </button>
        </form>
      </div>
    </div>
  );
}
