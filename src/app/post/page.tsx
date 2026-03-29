'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, CheckCircle, Navigation, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './post.module.css';

export default function PostItemPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'student' | 'other' | null>(null);
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [aiVerified, setAiVerified] = useState<boolean | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    studentClass: '',
    rollNumber: '',
    occupation: '',
    category: '',
    productName: '',
    description: '',
    location: '',
    lat: null as number | null,
    lng: null as number | null,
    date: '',
    reward: '',
    brand: '',
    model: '',
    color: '',
    uniqueId: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  // Smart Matching State
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);

  // Smart Matching Effect
  useEffect(() => {
    const searchMatches = async () => {
      if (formData.productName.length < 3 || step !== 3) {
        setLiveMatches([]);
        return;
      }
      setIsSearchingMatch(true);
      
      const oppositeType = itemType === 'lost' ? 'found' : 'lost';
      const { data } = await supabase
        .from('items')
        .select('id, product_name, image_url, location_area, user_id, profiles!inner(full_name)')
        .eq('status', 'active')
        .eq('type', oppositeType)
        .ilike('product_name', `%${formData.productName}%`)
        .limit(3);
        
      if (data) setLiveMatches(data);
      setIsSearchingMatch(false);
    };

    const debounceTimer = setTimeout(searchMatches, 800);
    return () => clearTimeout(debounceTimer);
  }, [formData.productName, step, itemType]);

  const handleNext = () => {
    if (step === 2) {
      if (!formData.name.trim() || !formData.phone.trim()) {
        alert("Please provide your Full Name and Phone Number to continue.");
        return;
      }
      if (userType === 'student' && (!formData.studentClass.trim() || !formData.rollNumber.trim())) {
        alert("Please provide your Class and Roll Number.");
        return;
      }
    }
    setStep(step + 1);
  };
  const handleBack = () => setStep(step - 1);

  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.city_district || data.address?.city || data.address?.town || "Unknown Area";
          setFormData(prev => ({ 
            ...prev, 
            location: `${area}, ${data.address?.state || 'Local'}`,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }));
        } catch(e) {
          setFormData(prev => ({ 
            ...prev, 
            location: `Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }));
        }
      });
    } else {
      alert('Geolocation not supported');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('item-images').upload(fileName, file);

    if (uploadError) {
      alert('Error uploading image to Database bucket: ' + uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('item-images').getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setAiVerified(true);
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName.trim() || !formData.description.trim() || !formData.category) {
      alert("Product Name, Category, and Description are mandatory fields.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to post.");
      router.push('/login');
      return;
    }

    const fullDescription = formData.description + 
      (formData.brand ? `\n\nBrand: ${formData.brand}\nColor: ${formData.color}\nUniqueID: ${formData.uniqueId}` : '');

    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      type: itemType,
      category: formData.category || 'other',
      product_name: formData.productName || 'Unnamed Item',
      description: fullDescription,
      location_area: formData.location || 'Unknown Location',
      lat: formData.lat,
      lng: formData.lng,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
      status: 'active'
    });

    if (error) {
      alert("Error posting item: " + error.message);
    } else {
      alert('Item posted successfully!');
      router.push('/home');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => step > 1 ? handleBack() : router.push('/home')} className={styles.backBtn}>
          &larr; Back
        </button>
        <h2>Post {itemType === 'lost' ? 'Lost' : 'Found'} Item</h2>
      </header>

      <main className={styles.mainContent} style={{ paddingBottom: '100px' }}>
        {step === 1 && (
          <div className={`glass-card ${styles.card}`}>
            <h3>Are you posting a Lost or Found item?</h3>
            <div className={styles.roleGrid}>
              <button 
                className={`btn-3d ${itemType === 'lost' ? 'btn-primary' : ''}`}
                onClick={() => setItemType('lost')}
              >
                Lost
              </button>
              <button 
                className={`btn-3d ${itemType === 'found' ? 'btn-primary' : ''}`}
                onClick={() => setItemType('found')}
              >
                Found
              </button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>Are you a:</h3>
            <div className={styles.roleGrid}>
              <button 
                className={`btn-3d ${userType === 'student' ? 'btn-primary' : ''}`}
                onClick={() => setUserType('student')}
              >
                Student
              </button>
              <button 
                className={`btn-3d ${userType === 'other' ? 'btn-primary' : ''}`}
                onClick={() => setUserType('other')}
              >
                Other
              </button>
            </div>

            <button 
              className="btn-3d btn-primary" 
              style={{ width: '100%', marginTop: '2rem' }}
              disabled={!userType}
              onClick={handleNext}
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={`glass-card ${styles.card}`}>
            <h3>Personal Details</h3>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input type="text" className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            {userType === 'student' ? (
              <>
                <div className={styles.formGroup}>
                  <label>Class / Course</label>
                  <input type="text" className={styles.input} value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>Roll Number</label>
                  <input type="text" className={styles.input} value={formData.rollNumber} onChange={e => setFormData({...formData, rollNumber: e.target.value})} />
                </div>
              </>
            ) : (
              <div className={styles.formGroup}>
                <label>Occupation (Optional)</label>
                <input type="text" className={styles.input} value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})}  />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input type="tel" className={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            
            <button className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleNext}>
              Next Step
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={`glass-card ${styles.card}`}>
            <h3>Item Details</h3>
            
            <label htmlFor="imageUpload" className={styles.imageUpload} style={{ display: 'block', cursor: 'pointer' }}>
              <input type="file" id="imageUpload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              {uploadingImage ? (
                <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Uploading to Database...</div>
              ) : aiVerified && imageUrl ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <img src={imageUrl} alt="Uploaded Item" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', marginBottom: '10px' }} />
                  <div className={styles.aiSuccess}>
                    <CheckCircle size={24} />
                    <p style={{margin:0}}>Image Saved to Cloud</p>
                  </div>
                </div>
              ) : (
                <>
                  <Camera size={32} color="var(--text-secondary)" />
                  <p>Tap to select real image</p>
                  <small>Supabase Cloud Storage</small>
                </>
              )}
            </label>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Product Name</label>
              <input type="text" className={styles.input} value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} />
              {isSearchingMatch && <span style={{position:'absolute', right:12, top:38, fontSize:'0.75rem', color:'var(--text-secondary)'}}>Searching matches...</span>}
            </div>

            {/* Smart Similarity Matches Block */}
            {liveMatches.length > 0 && (
              <div className="glass-card" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> Wait, is this your item?
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  We found {liveMatches.length} recently {itemType === 'lost' ? 'found' : 'lost'} items that match your description!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {liveMatches.map(match => (
                    <div key={match.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px' }}>
                      <img src={match.image_url} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{match.product_name}</h5>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>By {match.profiles?.full_name} • {match.location_area}</span>
                      </div>
                      <Link href={`/chat?peer=${match.user_id}`} className="btn-3d btn-primary" style={{ padding: '6px 12px', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', textDecoration: 'none' }}>
                        <MessageCircle size={14} /> Contact
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Category</label>
              <select className={styles.input} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="electronics">Electronics/Phones</option>
                <option value="wallet">Wallet/Cards</option>
                <option value="jewelry">Jewelry/Watches</option>
                <option value="keys">Keys</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Location Area (Uses Exact GPS if allowed)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className={styles.input} style={{ flex: 1 }} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Area name..." />
                <button type="button" onClick={fetchLocation} className="btn-3d" style={{ padding: '0 12px' }}><MapPin size={20} color={formData.lat ? "var(--status-found-bg)" : "var(--accent-primary)"} /></button>
              </div>
              {formData.lat && <small style={{ color: 'var(--status-found-text)', display: 'block', marginTop: '4px' }}>✓ Exact Location Captured</small>}
            </div>

            {['electronics', 'phones', 'jewelry', 'watches'].some(c => (formData.category||'').toLowerCase().includes(c)) && (
              <div className="glass-card" style={{ marginTop: '1rem', padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Extra Details (Optional)</h4>
                <div className={styles.formGroup}>
                  <label>Brand</label>
                  <input type="text" className={styles.input} value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>Color</label>
                  <input type="text" className={styles.input} value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>Unique ID / Serial Num</label>
                  <input type="text" className={styles.input} value={formData.uniqueId} onChange={e => setFormData({...formData, uniqueId: e.target.value})} />
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea className={styles.input} rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>

            <button className="btn-3d btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleSubmit}>
              Post Item
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
