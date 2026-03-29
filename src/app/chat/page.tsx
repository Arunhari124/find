'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
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

  if (peerParam) {
    return <ChatContent peerId={peerParam} />;
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

      // 1. Fetch all messages where we are sender or receiver
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messages && messages.length > 0) {
        // 2. Identify unique peers and the latest message for each
        const peerMap = new Map();
        messages.forEach(msg => {
          const peerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!peerMap.has(peerId)) {
            peerMap.set(peerId, msg);
          }
        });

        const peerIds = Array.from(peerMap.keys());

        // 3. Fetch profiles for these peers
        if (peerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', peerIds);

          if (profiles) {
            const convoList = profiles.map(profile => {
              const latestMsg = peerMap.get(profile.id);
              return {
                peerId: profile.id,
                peerName: profile.full_name,
                latestMessage: latestMsg.content,
                timestamp: latestMsg.created_at,
                isUnread: false // simplistic placeholder
              };
            });
            // Sort by latest timestamp
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
        <p className={styles.chatSub}>Your conversations</p>
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
                key={convo.peerId} 
                href={`/chat?peer=${convo.peerId}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
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

function ChatContent({ peerId }: { peerId: string }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [peerUser, setPeerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: specificPeer } = await supabase.from('profiles').select('*').eq('id', peerId).single();
      if (specificPeer) {
        setPeerUser(specificPeer);
        
        // Fetch existing messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${specificPeer.id}),and(sender_id.eq.${specificPeer.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
        
        if (msgs) {
          setMessages(msgs);
        }

        // Subscribe to real-time incoming
        const channel = supabase.channel(`chat_room_${specificPeer.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === user.id && newMsg.receiver_id === specificPeer.id) ||
              (newMsg.sender_id === specificPeer.id && newMsg.receiver_id === user.id)
            ) {
              setMessages(prev => [...prev, newMsg]);
            }
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); }
      }
      setLoading(false);
    }
    loadChat();
  }, [peerId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || !peerUser) return;
    
    const msgText = message;
    setMessage('');
    
    // Add optimistic UI message
    const tempMsg = {
      id: Math.random().toString(),
      sender_id: currentUser.id,
      receiver_id: peerUser.id,
      content: msgText,
      created_at: new Date().toISOString(),
      optimistic: true
    };
    setMessages(prev => [...prev, tempMsg]);

    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: peerUser.id,
      content: msgText
    });
  };

  if (loading && !peerUser) {
    return <div className={styles.container}><div style={{padding: '2rem'}}>Loading...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/chat" className={styles.backBtn}><ArrowLeft size={24} /></Link>
          <div className={styles.avatar}>{peerUser?.full_name?.[0] || 'C'}</div>
          <div>
            <h2 className={styles.chatName}>{peerUser?.full_name || 'Unknown User'}</h2>
            <p className={styles.chatSub}>Private Conversation</p>
          </div>
        </div>
      </header>

      <div className={styles.chatContainer}>
        <div className={styles.warningBanner}>
          Protect yourself from scams. Do not send money before meeting in person.
        </div>
        
        {messages.map((msg, idx) => {
          // Avoid duplicating optimistic messages when they arrive from DB
          if (msg.optimistic && messages.some((m, i) => i !== idx && m.content === msg.content && !m.optimistic)) return null;

          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.myWrapper : styles.otherWrapper}`} style={{ opacity: msg.optimistic ? 0.7 : 1 }}>
              <div className={`${styles.messageBubble} ${isMe ? styles.myMessage : styles.otherMessage}`}>
                {msg.content}
              </div>
              <span className={styles.time}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSend} className={styles.inputForm}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={`btn-3d ${styles.sendBtn}`}>
            <Send size={20} color="var(--accent-primary)" />
          </button>
        </form>
      </div>
    </div>
  );
}
