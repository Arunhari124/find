'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import styles from './chat.module.css';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div style={{padding: '2rem'}}>Loading Chat...</div></div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
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

      const peerParam = searchParams.get('peer');
      let peer = null;

      if (peerParam) {
        const { data: specificPeer } = await supabase.from('profiles').select('*').eq('id', peerParam).single();
        if (specificPeer) peer = specificPeer;
      }
      
      if (!peer) {
        // Fallback to community peer if no specific chat started
        const { data: others } = await supabase.from('profiles').select('*').neq('id', user.id).limit(1);
        if (others && others.length > 0) peer = others[0];
      }

      if (peer) {
        setPeerUser(peer);
        // Fetch existing messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peer.id}),and(sender_id.eq.${peer.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
        
        if (msgs) {
          setMessages(msgs);
        }

        // Subscribe to real-time incoming
        const channel = supabase.channel('chat_room')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === user.id && newMsg.receiver_id === peer.id) ||
              (newMsg.sender_id === peer.id && newMsg.receiver_id === user.id)
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
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || !peerUser) return;
    
    // Optimistic UI could go here, but let's just insert and let the realtime channel catch it
    const msgText = message;
    setMessage('');
    
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: peerUser.id,
      content: msgText
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/home" className={styles.backBtn}><ArrowLeft size={24} /></Link>
          <div className={styles.avatar}>{peerUser?.full_name?.[0] || 'C'}</div>
          <div>
            <h2 className={styles.chatName}>{peerUser?.full_name || 'Community Peer'}</h2>
            <p className={styles.chatSub}>General Lost & Found Chat</p>
          </div>
        </div>
      </header>

      <div className={styles.chatContainer}>
        <div className={styles.warningBanner}>
          Protect yourself from scams. Do not send money before meeting in person.
        </div>
        
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.myWrapper : styles.otherWrapper}`}>
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

      <BottomNav />
    </div>
  );
}
