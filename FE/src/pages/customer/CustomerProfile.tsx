import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CustomerSidebar } from '@/components/layout/CustomerSidebar'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/context/AuthContext'
import { Calendar, Mail, User, VenusAndMars } from 'lucide-react'

function inferBirthYear(age: number) {
  return new Date().getFullYear() - age
}

function formatGenderLabel(gender: 'male' | 'female' | 'other') {
  if (gender === 'male') return 'Male'
  if (gender === 'female') return 'Female'
  return 'Other'
}

export default function CustomerProfile() {
  const navigate = useNavigate()
  const { user, updateProfile, logout } = useAuth()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(user?.gender ?? 'other')
  const [age, setAge] = useState<number>(user?.age ?? 18)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')

  const estimatedBirthYear = useMemo(() => inferBirthYear(age), [age])

  const onSidebarNavigate = (tab: string) => {
    if (tab === 'tickets') return navigate('/tickets')
    if (tab === 'profile') return navigate('/profile')
    if (tab === 'logout') {
      logout()
      return navigate('/')
    }
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await updateProfile({
        full_name: fullName.trim(),
        gender,
        age: Math.max(10, Math.min(100, age)),
      })
      setMessage('Profile updated successfully.')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="pt-[80px] min-h-screen bg-[#0B0F19] flex">
        <CustomerSidebar
          activeTab="profile"
          userName={user?.full_name ?? 'Customer'}
          membershipLevel="Stellar Member"
          onNavigate={onSidebarNavigate}
        />

        <main className="flex-1 p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white font-headline tracking-tight">My Profile</h1>
            <p className="text-slate-400 mt-2">Manage your customer account information.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full bg-slate-800/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                <div className="relative">
                  <VenusAndMars className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as 'male' | 'female' | 'other')}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-red-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={age}
                    onChange={(event) => setAge(Number(event.target.value) || 18)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-800/40 border border-white/10 p-4 text-sm text-slate-300">
              Current profile: {formatGenderLabel(gender)}, {age} years old (estimated birth year {estimatedBirthYear})
            </div>

            {error ? <p className="text-sm text-amber-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 px-8 rounded-xl transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
