import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CustomerSidebar } from '@/components/layout/CustomerSidebar'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/context/AuthContext'
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react'

interface Message {
  id: number
  text: string
  sender: 'user' | 'support'
  timestamp: Date
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: "Hello! Welcome to TicketRush Support. How can I help you today?",
    sender: 'support',
    timestamp: new Date(Date.now() - 60000),
  },
]

export default function Help() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onSidebarNavigate = (tab: string) => {
    if (tab === 'tickets') return navigate('/tickets')
    if (tab === 'profile') return navigate('/profile')
    if (tab === 'favourites') return navigate('/favourites') 
    if (tab === 'payments') return navigate('/payments')  
    if (tab === "settings") return navigate('/settings') 
    if (tab === 'help') return navigate('/help')  
    if (tab === 'logout') {
      logout()
      return navigate('/')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate support response
    setTimeout(() => {
      const responses = [
        "Thank you for contacting us. Let me look into that for you.",
        "I understand your concern. Could you provide more details?",
        "I'm here to help! Let me check our system for that information.",
        "Great question! Here's what I found...",
        "I appreciate your patience. Our team is working on this.",
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const supportMessage: Message = {
        id: messages.length + 2,
        text: randomResponse,
        sender: 'support',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, supportMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickReplies = [
    "How do I get a refund?",
    "Where is my ticket?",
    "How to change my seat?",
    "Contact human support",
  ]

  return (
    <>
      <Navbar />
      <div className="pt-[80px] min-h-screen bg-background flex">
        <CustomerSidebar
          activeTab="help"
          userName={user?.full_name ?? 'Customer'}
          membershipLevel="Stellar Member"
          onNavigate={onSidebarNavigate}
        />

        <main className="flex-1 p-8 lg:p-12 max-w-5xl mx-auto">
          <header className="mb-6">
            <h1 className="text-5xl font-black text-on-background font-headline tracking-tighter">
              Help Center
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-lg">
              Chat with our support team. We're here to help you 24/7.
            </p>
          </header>

          {/* Chat Container */}
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
            {/* Chat Header */}
            <div className="bg-surface-container-high border-b border-white/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">TR</span>
                </div>
                <div>
                  <h3 className="text-on-background font-bold">TicketRush Support</h3>
                  <p className="text-on-surface-variant text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button className="text-on-surface-variant hover:text-on-background p-2">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-primary-container text-on-primary-container rounded-br-md'
                        : 'bg-surface-container-high text-on-surface rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-on-primary-container/70' : 'text-on-surface-variant'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce"></span>
                      <span
                        className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(reply)}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-xs rounded-full whitespace-nowrap hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="bg-surface-container-high border-t border-white/5 p-4">
              <div className="flex items-end gap-3">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-primary resize-none"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>

                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <Smile className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="p-3 bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel rounded-xl p-6">
              <h4 className="text-on-background font-bold mb-3">📚 Knowledge Base</h4>
              <p className="text-on-surface-variant text-sm mb-4">
                Browse our comprehensive guides and FAQs to find answers quickly.
              </p>
              <button className="text-primary text-sm font-bold hover:underline">
                Explore Knowledge Base →
              </button>
            </div>

            <div className="glass-panel rounded-xl p-6">
              <h4 className="text-on-background font-bold mb-3">📧 Email Support</h4>
              <p className="text-on-surface-variant text-sm mb-4">
                Prefer email? Send us a message and we'll respond within 24 hours.
              </p>
              <button className="text-primary text-sm font-bold hover:underline">
                support@ticketrush.com →
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}