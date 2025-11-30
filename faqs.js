import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  Search, 
  ChevronDown, 
  FileText
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- MOCK DATA ---
const studentProfile = {
  name: "Rahul Sharma",
  role: "Student • CSE-A",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
};

const INITIAL_FAQS = [
  {
    category: "Academics",
    questions: [
      { id: 1, q: "What is the minimum attendance required to appear for exams?", a: "As per university norms, a minimum of 75% attendance in each subject is mandatory to be eligible for the end-semester examinations." },
      { id: 2, q: "How can I apply for a bonafide certificate?", a: "You can apply for a bonafide certificate through the Student Portal under the 'Services' tab. The physical copy can be collected from the Admin Block, Counter 4, after 2 working days." },
      { id: 3, q: "Where can I find the academic calendar?", a: "The academic calendar is available on the main college website and is also pinned on the notice board outside the Dean's office." }
    ]
  },
  {
    category: "Campus Life",
    questions: [
      { id: 4, q: "What are the library timings?", a: "The Central Library is open from 8:00 AM to 8:00 PM on weekdays and 9:00 AM to 5:00 PM on Saturdays. It remains closed on Sundays and public holidays." },
      { id: 5, q: "How do I register for college bus service?", a: "Bus registration forms are available at the Transport Office (Ground Floor, Block B). You need to submit a passport-size photo and a copy of your ID card." },
      { id: 6, q: "Is there a dress code for the campus?", a: "Students are expected to wear smart casuals. Sleeveless tops, shorts, and distressed jeans are generally discouraged in academic blocks." }
    ]
  },
  {
    category: "Technical & WiFi",
    questions: [
      { id: 7, q: "How do I connect to the campus WiFi?", a: "Select the network 'Campus-Student'. Use your Roll Number as the username and your DOB (DDMMYYYY) as the initial password." },
      { id: 8, q: "Who do I contact for ID card loss?", a: "Please report a lost ID card immediately to the Security Office and then apply for a duplicate at the Admin Block. A fine of ₹200 applies." }
    ]
  }
];

// --- COMPONENTS ---

// 1. Wiki Page Component
const WikiPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = INITIAL_FAQS.map(category => {
    const filteredQuestions = category.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...category, questions: filteredQuestions };
  }).filter(category => category.questions.length > 0);

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold mb-3">College Wiki & FAQ</h1>
          <p className="text-indigo-100 mb-8 max-w-lg text-sm sm:text-base leading-relaxed">
            Everything you need to know about campus life, academics, and administrative procedures in one place.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-indigo-300" />
            <input 
              type="text"
              placeholder="Search for answers (e.g., 'exams', 'wifi', 'bus')..."
              className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:outline-none focus:bg-white/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* FAQs List */}
      <div className="grid gap-6">
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((cat, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-slate-700">{cat.category}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.questions.map((item) => (
                  <div key={item.id} className="group">
                    <button 
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-4 text-left flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      <span className="font-medium text-slate-800 leading-relaxed text-sm sm:text-base">{item.q}</span>
                      <span className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${openItems[item.id] ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5" />
                      </span>
                    </button>
                    <div 
                      className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                        openItems[item.id] ? 'max-h-48 opacity-100 pb-4' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <p className="text-slate-600 text-sm leading-relaxed pl-1 border-l-2 border-indigo-200">
                        {item.a}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">No results found</h3>
            <p className="text-slate-500">Try searching for different keywords.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);

  // Authentication Setup (Kept for potential future features)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
           {/* Logo */}
           <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-2 rounded-lg">
               <BookOpen className="w-5 h-5 text-white" />
             </div>
             <span className="text-xl font-bold text-slate-800">SC Portal</span>
           </div>

           {/* User Profile (Read Only) */}
           <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <div className="text-sm font-medium text-slate-900">{studentProfile.name}</div>
               <div className="text-xs text-slate-500">{studentProfile.role}</div>
             </div>
             <img 
               src={studentProfile.avatar} 
               alt="Profile" 
               className="w-9 h-9 rounded-full border border-slate-200 bg-white" 
             />
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <WikiPage />
      </main>
    </div>
  );
}