'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, CheckCircle } from 'lucide-react';
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
    // Student specifics
    studentClass: '',
    rollNumber: '',
    // Other specifics
    occupation: '',
    // Common Item details
    category: '',
    productName: '',
    description: '',
    location: '',
    date: '',
    reward: '',
    // Extra details (Electronics/Jewelry)
    brand: '',
    model: '',
    color: '',
    uniqueId: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

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
          setFormData(prev => ({ ...prev, location: `${area}, ${data.address?.state || 'Local'}` }));
        } catch(e) {
          setFormData(prev => ({ ...prev, location: `Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}` }));
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
    
    // Upload standard to "item-images" bucket in Supabase Storage
    const { error: uploadError } = await supabase.storage.from('item-images').upload(fileName, file);

    if (uploadError) {
      alert('Error uploading image to Database bucket. Please ensure "item-images" public bucket is created: ' + uploadError.message);
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

      <main className={styles.mainContent}>
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

            <div className={styles.formGroup}>
              <label>Product Name</label>
              <input type="text" className={styles.input} value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} />
            </div>

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
              <label>Location Area</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className={styles.input} style={{ flex: 1 }} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Area name..." />
                <button type="button" onClick={fetchLocation} className="btn-3d" style={{ padding: '0 12px' }}><MapPin size={20} color="var(--accent-primary)" /></button>
              </div>
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
