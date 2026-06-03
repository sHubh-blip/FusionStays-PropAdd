import React, { useState, useEffect, useRef, useContext } from 'react';
import { MessageSquare, Send, X, ChevronLeft, User, Search, MessageCircle, Trash2 } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const ChatPanel = ({ isOpen, onClose, onUnreadCountChange }) => {
  const { user: currentUser } = useContext(AuthContext);
  
  // State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUser, setActiveUser] = useState(null); // The user object we are chatting with
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [allMessages, setAllMessages] = useState([]); // All messages involving currentUser

  // Refs
  const messageEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const backgroundPollingIntervalRef = useRef(null);

  // Sound effect on new message (optional, but premium feel!)
  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fetch all active users
  const fetchUsers = async () => {
    if (!currentUser) return;
    setIsLoadingUsers(true);
    try {
      const { data } = await api.get('/users/list');
      // Filter out the current logged in user
      const filtered = (data || []).filter(u => u.email.toLowerCase().trim() !== currentUser.email.toLowerCase().trim());
      setUsers(filtered);
    } catch (error) {
      console.error('Failed to fetch users list:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch all messages for the current user (for unread count tracking)
  const fetchAllMessages = async () => {
    if (!currentUser || document.hidden) return;
    try {
      const { data } = await api.get('/messages');
      setAllMessages(data || []);
    } catch (error) {
      console.error('Failed to fetch all messages:', error);
    }
  };

  // Fetch conversation between current user and activeUser
  const fetchConversation = async (recipientEmail) => {
    if (!currentUser || !recipientEmail || document.hidden) return;
    try {
      const { data } = await api.get(`/messages/${recipientEmail}`);
      
      // Check if we received new messages to play a sound and scroll
      setMessages(prev => {
        if (data && data.length > prev.length) {
          const lastMsg = data[data.length - 1];
          if (lastMsg.sender.toLowerCase().trim() === recipientEmail.toLowerCase().trim()) {
            playNotificationSound();
          }
          // Request scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
        return data || [];
      });

      // Update last seen timestamp for this recipient
      updateLastSeen(recipientEmail);
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    }
  };

  // Update last seen timestamp for a recipient
  const updateLastSeen = (recipientEmail) => {
    if (!currentUser || !recipientEmail) return;
    const key = `lastSeenTime_${currentUser.email.toLowerCase()}_${recipientEmail.toLowerCase()}`;
    localStorage.setItem(key, new Date().toISOString());
    calculateUnreadCounts();
  };

  // Calculate unread counts per user and trigger global badge callback
  const calculateUnreadCounts = () => {
    if (!currentUser || allMessages.length === 0) {
      if (onUnreadCountChange) onUnreadCountChange(0);
      return;
    }

    let totalGlobalUnread = 0;

    // We count unread for each potential chat user
    const updatedUsers = users.map(u => {
      const email = u.email.toLowerCase().trim();
      const key = `lastSeenTime_${currentUser.email.toLowerCase()}_${email}`;
      const lastSeen = localStorage.getItem(key) || '1970-01-01T00:00:00.000Z';
      
      // Unread messages are ones from 'email' sent to 'currentUser' after 'lastSeen'
      const unreadMsgs = allMessages.filter(m => 
        m.sender === email && 
        m.recipient === currentUser.email.toLowerCase().trim() && 
        new Date(m.timestamp) > new Date(lastSeen)
      );

      const count = unreadMsgs.length;
      totalGlobalUnread += count;

      return { ...u, unreadCount: count };
    });

    // Only update state if unread values changed to avoid re-renders
    const hasDiff = JSON.stringify(users.map(u => u.unreadCount)) !== JSON.stringify(updatedUsers.map(u => u.unreadCount));
    if (hasDiff && users.length > 0) {
      setUsers(updatedUsers);
    }

    if (onUnreadCountChange) {
      onUnreadCountChange(totalGlobalUnread);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || isSending) return;

    const messageText = newMessage;
    setNewMessage('');
    setIsSending(true);

    try {
      const response = await api.post('/messages', {
        recipient: activeUser.email,
        message: messageText
      });

      // Add to local message list immediately for fast UI feedback
      setMessages(prev => [...prev, response.data]);
      setTimeout(scrollToBottom, 50);

      // Force refresh unread counts
      updateLastSeen(activeUser.email);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Try again.');
      setNewMessage(messageText); // restore text
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeUser) return;
    const confirmClear = window.confirm(`Are you sure you want to clear your chat history with ${activeUser.email}? This will delete all messages permanently.`);
    if (!confirmClear) return;

    try {
      await api.delete(`/messages/${activeUser.email}`);
      setMessages([]); // Clear local UI messages instantly
      updateLastSeen(activeUser.email);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      alert('Failed to clear chat. Try again.');
    }
  };

  // Initial Fetch of users
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Handle active polling for current conversation
  useEffect(() => {
    // Clear active chat polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (isOpen && activeUser) {
      setIsLoadingMessages(true);
      fetchConversation(activeUser.email).then(() => {
        setIsLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      });

      // Poll every 3 seconds for active conversation
      pollingIntervalRef.current = setInterval(() => {
        fetchConversation(activeUser.email);
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeUser, isOpen]);

  // Handle background polling for unread counts (all messages)
  useEffect(() => {
    // Fetch all messages on load to calculate initial counts
    if (currentUser) {
      fetchAllMessages();
    }

    // Set up long-poll check for all messages
    // 15 seconds if closed, 6 seconds if open (and on user list)
    if (backgroundPollingIntervalRef.current) {
      clearInterval(backgroundPollingIntervalRef.current);
    }

    const intervalTime = isOpen ? 6000 : 15000;
    
    backgroundPollingIntervalRef.current = setInterval(() => {
      fetchAllMessages();
    }, intervalTime);

    return () => {
      if (backgroundPollingIntervalRef.current) {
        clearInterval(backgroundPollingIntervalRef.current);
      }
    };
  }, [isOpen, currentUser]);

  // Recalculate unread counts whenever messages or users list changes
  useEffect(() => {
    calculateUnreadCounts();
  }, [allMessages, users.length]);

  // Listen to tab focus/visibility changes to pause polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Clear intervals to save resources
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (backgroundPollingIntervalRef.current) clearInterval(backgroundPollingIntervalRef.current);
      } else {
        // Resume polling
        if (isOpen && activeUser) {
          fetchConversation(activeUser.email);
          pollingIntervalRef.current = setInterval(() => {
            fetchConversation(activeUser.email);
          }, 3000);
        }
        fetchAllMessages();
        const intervalTime = isOpen ? 6000 : 15000;
        backgroundPollingIntervalRef.current = setInterval(() => {
          fetchAllMessages();
        }, intervalTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, activeUser]);

  // Filtered users for search
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to format timestamp nicely
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : '?';
  };

  const getRandomColorClass = (email) => {
    const colors = [
      'bg-indigo-500 text-white',
      'bg-emerald-500 text-white',
      'bg-amber-500 text-white',
      'bg-rose-500 text-white',
      'bg-sky-500 text-white',
      'bg-violet-500 text-white',
      'bg-purple-500 text-white',
    ];
    let sum = 0;
    for (let i = 0; i < email.length; i++) sum += email.charCodeAt(i);
    return colors[sum % colors.length];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200/50 flex flex-col h-full overflow-hidden transition-transform duration-300 transform translate-x-0">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            {activeUser ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setActiveUser(null); setMessages([]); }} 
                  className="p-1.5 hover:bg-slate-200/70 rounded-lg transition-colors text-slate-500"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${getRandomColorClass(activeUser.email)}`}>
                    {getInitials(activeUser.email)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{activeUser.email}</span>
                    <span className="text-[10px] text-emerald-600 font-medium capitalize flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
                      {activeUser.role}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Team Chat</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Direct messages between members</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              {activeUser && (
                <button
                  onClick={handleClearChat}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500 mr-1"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-200/70 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
            {activeUser ? (
              /* Chat Message Logs View */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {isLoadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-400 font-medium">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <MessageCircle className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">No Messages Yet</h4>
                      <p className="text-xs text-slate-400 max-w-[200px] mt-1">Start the conversation by typing a message below.</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.sender.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-all ${
                            isMe 
                              ? 'bg-brand-600 text-white rounded-tr-none' 
                              : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none'
                          }`}>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                            <span className={`block text-[9px] mt-1 text-right font-medium ${
                              isMe ? 'text-brand-100' : 'text-slate-400'
                            }`}>
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>

                {/* Message Input Footer */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shadow-sm flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              /* Members List View */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search members */}
                <div className="p-3 bg-white border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search team member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {isLoadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-400 font-medium">Loading members...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium">
                      No team members found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const email = u.email;
                      const hasUnread = u.unreadCount > 0;
                      return (
                        <button
                          key={email}
                          onClick={() => setActiveUser(u)}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-sm hover:border hover:border-slate-100 border border-transparent transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105 ${getRandomColorClass(email)}`}>
                                {getInitials(email)}
                              </div>
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-50 rounded-full"></span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-700 truncate max-w-[220px] group-hover:text-brand-700 transition-colors">{email}</span>
                              <span className="text-[10px] text-slate-400 font-medium capitalize">{u.role}</span>
                            </div>
                          </div>

                          {hasUnread && (
                            <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-brand-100 animate-bounce">
                              {u.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
