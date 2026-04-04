'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

export default function TourOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay to let the app load before checking tour
    const timer = setTimeout(() => {
      const hasSeen = localStorage.getItem('hasSeenTour');
      if (!hasSeen) {
        setShow(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const completeTour = () => {
    localStorage.setItem('hasSeenTour', 'true');
    setShow(false);
  };

  const steps = [
    {
      title: "Welcome to FIND! 👋",
      content: "Let's take a quick tour to help you connect lost items with their owners.",
      highlight: null
    },
    {
      title: "The Main Feed 📰",
      content: "Swipe through items happening around you right now. You can leave comments or Direct Message the posters.",
      highlight: "feed-nav-btn"
    },
    {
      title: "Live Match Radar 🗺️",
      content: "Use the map to explicitly find missing items within a 5km radius of your exact GPS location.",
      highlight: "map-nav-btn"
    },
    {
      title: "Post an Item 📸",
      content: "Lost something? Found something? Snap a picture here. Our Smart AI will instantly warn you if it matches an existing item!",
      highlight: "post-nav-btn"
    },
    {
      title: "Private Inbox 💬",
      content: "All your private 1-on-1 conversations are stored here securely. If an item gets deleted, the chat cleans itself up automatically.",
      highlight: "chat-nav-btn"
    }
  ];

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <AnimatePresence mode="wait">
        <motion.div
           key={currentStep}
           initial={{ scale: 0.8, opacity: 0, y: 20 }}
           animate={{ scale: 1, opacity: 1, y: 0 }}
           exit={{ scale: 0.8, opacity: 0, y: -20 }}
           transition={{ type: 'spring', damping: 20, stiffness: 200 }}
           className="glass-card"
           style={{
             background: 'var(--bg-secondary)',
             padding: '24px',
             width: '100%',
             maxWidth: '350px',
             position: 'relative',
             textAlign: 'center',
             border: '1px solid var(--accent-primary)',
             boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
           }}
        >
          <button onClick={completeTour} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
          
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '12px' }}>
            {steps[currentStep].title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
            {steps[currentStep].content}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {steps.map((_, idx) => (
                <div key={idx} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: idx === currentStep ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'
                }} />
              ))}
            </div>

            {currentStep < steps.length - 1 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="btn-3d btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                Next Step
              </button>
            ) : (
              <button 
                onClick={completeTour}
                className="btn-3d"
                style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'var(--status-found-bg)', color: 'white', border: 'none' }}
              >
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}/> 
                Let's Go!
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
