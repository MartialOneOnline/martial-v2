'use client'

import { useState } from 'react'
import { X, Sparkles, Send, RefreshCw, Copy, Check } from 'lucide-react'

interface Props {
  onClose: () => void
}

const PROMPTS = [
  { label: 'Re-engagement',     text: 'Write a friendly re-engagement message for students who haven\'t attended in 3 weeks.' },
  { label: 'Class reminder',    text: 'Write a reminder message for tomorrow\'s BJJ Advanced class at 7pm.' },
  { label: 'Promotion',         text: 'Write a promotional message for our summer membership deal — 20% off.' },
  { label: 'Grading congrats',  text: 'Write a congratulations message for students who passed their belt grading.' },
  { label: 'New student',       text: 'Write a warm welcome message for new trial students.' },
]

const GENERATED: Record<string, string> = {
  'Re-engagement':    'Hey [Student Name]! 👋 We\'ve missed you on the mats lately! Life gets busy, we get it — but your Jiu Jitsu journey is waiting. Come back this week and your first class back is on us. See you soon! 🥋',
  'Class reminder':   '⏰ Reminder: BJJ Advanced class tomorrow at 7:00 PM sharp. Bring your gi, stay hydrated, and be ready to roll! Coach will be covering back control submissions. Don\'t miss it! 💪',
  'Promotion':        '🎉 SUMMER SPECIAL — 20% off all memberships this month! There\'s never been a better time to start or upgrade your martial arts journey. Limited spots available. Tap to claim your discount before it\'s gone! 🔥',
  'Grading congrats': '🏆 CONGRATULATIONS to all our students who graded this weekend! Your hard work, dedication, and heart on the mats paid off. We\'re incredibly proud of each one of you. Keep pushing! 🥋⭐',
  'New student':      '🌟 Welcome to the family, [Student Name]! We\'re so excited to have you join us. Your first week of classes is going to be amazing — come with an open mind, leave everything on the mat, and enjoy every moment. See you soon! 🥋',
}

export default function AIMessagesModal({ onClose }: Props) {
  const [selected, setSelected]   = useState<string | null>(null)
  const [custom, setCustom]       = useState('')
  const [generated, setGenerated] = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)

  const generate = (label: string) => {
    setSelected(label)
    setLoading(true)
    setTimeout(() => {
      setGenerated(GENERATED[label] ?? 'Here is your AI-generated message...')
      setLoading(false)
    }, 900)
  }

  const generateCustom = () => {
    if (!custom.trim()) return
    setLoading(true)
    setTimeout(() => {
      setGenerated(`🤖 Based on your prompt: "${custom}" — here is a personalized message crafted for your academy students. Feel free to edit before sending!`)
      setLoading(false)
    }, 1100)
  }

  const copy = () => {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
              <Sparkles size={14} style={{ color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>AI Message Generator</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Powered by Martial AI</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* Quick prompts */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => generate(p.label)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: selected === p.label ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#F3F4F6',
                    color: selected === p.label ? '#fff' : '#374151',
                    border: 'none',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Or describe what you need</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateCustom()}
                placeholder="e.g. Write a message about class schedule change..."
                className="flex-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
              />
              <button
                onClick={generateCustom}
                className="px-4 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none' }}
              >
                <Sparkles size={13} /> Go
              </button>
            </div>
          </div>

          {/* Generated output */}
          {(loading || generated) && (
            <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              {loading ? (
                <div className="flex items-center gap-2" style={{ color: '#6366F1' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Generating message...</span>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{generated}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={copy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{ background: copied ? '#F0FDF4' : '#EEF2FF', color: copied ? '#16A34A' : '#6366F1', border: 'none' }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => selected ? generate(selected) : generateCustom()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{ background: '#F3F4F6', color: '#374151', border: 'none' }}
                    >
                      <RefreshCw size={12} /> Regenerate
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ml-auto"
                      style={{ background: '#0071E3', border: 'none' }}
                    >
                      <Send size={12} /> Send Message
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
