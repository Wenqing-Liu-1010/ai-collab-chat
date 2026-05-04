'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, Bot, Sparkles, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

/**
 * DATABASE SCHEMA (Run this in Supabase SQL Editor):
 * 
 * create table messages (
 *   id uuid default gen_random_uuid() primary key,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   text text not null,
 *   sender text not null,
 *   room_id text not null,
 *   is_ai boolean default false
 * );
 * 
 * -- Enable real-time for this table
 * alter publication supabase_realtime add table messages;
 */

interface Message {
  id: string;
  text: string;
  sender: string;
  is_ai: boolean;
  created_at: string;
  room_id: string;
}

export default function Home() {
  const [isJoined, setIsJoined] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial messages and subscribe to real-time updates
  useEffect(() => {
    if (!isJoined || !roomName) return;

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomName)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room-${roomName}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${roomName}` 
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isJoined, roomName]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName && userName) setIsJoined(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    // Insert user message into Supabase
    const { error } = await supabase.from('messages').insert([
      { text: textToSend, sender: userName, room_id: roomName, is_ai: false }
    ]);

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    // Trigger AI for every message
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { text: textToSend, sender: userName, is_ai: false }] }),
      });
      const data = await response.json();
      
      // Insert AI response into Supabase
      await supabase.from('messages').insert([
        { text: data.text, sender: 'AI Assistant', room_id: roomName, is_ai: true }
      ]);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isJoined) {
    return (
      <main className="login-container">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card login-card"
        >
          <div className="logo-section">
            <Sparkles className="logo-icon" size={48} />
            <h1>AI 协作空间</h1>
            <p>输入同一个房间 ID，即可与好友实时提问</p>
          </div>
          
          <form onSubmit={handleJoin} className="login-form">
            <div className="input-group">
              <label>房间 ID (两个人都填一样的)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="例如: coding_room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>你的昵称</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="例如: Alex"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary full-width">
              加入协作 <Zap size={18} />
            </button>
          </form>
          <div className="setup-tip">
            <p>需要配置 Supabase 和 Gemini API Key 才能正式使用实时同步和 AI 功能</p>
          </div>
        </motion.div>

        <style jsx>{`
          .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
          .login-card { width: 100%; max-width: 480px; padding: 48px; text-align: center; }
          .logo-section { margin-bottom: 32px; }
          .logo-icon { color: var(--primary); margin-bottom: 16px; }
          h1 { font-size: 2.2rem; margin-bottom: 12px; background: linear-gradient(135deg, #fff, #a5a6f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          p { color: rgba(255,255,255,0.6); font-size: 1rem; }
          .login-form { display: flex; flex-direction: column; gap: 24px; text-align: left; }
          .input-group label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: rgba(255,255,255,0.8); }
          .full-width { width: 100%; justify-content: center; padding: 16px; font-size: 1.1rem; margin-top: 10px; }
          .setup-tip { margin-top: 24px; padding: 12px; background: rgba(255,255,0,0.05); border-radius: 8px; border: 1px dashed rgba(255,255,0,0.2); }
          .setup-tip p { font-size: 0.8rem; color: #ffd700; opacity: 0.8; }
        `}</style>
      </main>
    );
  }

  return (
    <main className="chat-container">
      <header className="chat-header glass-card">
        <div className="header-left">
          <MessageSquare className="header-icon" />
          <div className="header-info">
            <h2>房间: {roomName}</h2>
            <span className="status-badge"><span className="dot pulse"></span> 实时同步中</span>
          </div>
        </div>
        <div className="header-right">
          <div className="user-badge">
            <User size={16} />
            <span>{userName}</span>
          </div>
        </div>
      </header>

      <section className="messages-area">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`message-wrapper ${msg.is_ai ? 'ai-msg' : msg.sender === userName ? 'own-msg' : 'other-msg'}`}
            >
              {!msg.is_ai && msg.sender !== userName && (
                <div className="msg-sender">{msg.sender}</div>
              )}
              <div className="message-content shadow-glow">
                {msg.is_ai && <Bot size={20} className="bot-icon" />}
                <p>{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="ai-loading">
            <Loader2 className="spin" size={16} />
            <span>AI 正在思考...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </section>

      <footer className="chat-footer">
        <form onSubmit={handleSendMessage} className="input-wrapper glass-card">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="输入消息... (提到 'ai' 触发智能回复)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="btn-send" disabled={!inputText.trim() || isLoading}>
            {isLoading ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </footer>

      <style jsx>{`
        .chat-container { height: 100vh; display: flex; flex-direction: column; max-width: 1100px; margin: 0 auto; padding: 24px; gap: 24px; }
        .chat-header { padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon { color: var(--primary); width: 28px; height: 28px; }
        .header-info h2 { font-size: 1.25rem; font-weight: 600; }
        .status-badge { font-size: 0.8rem; color: var(--success); display: flex; align-items: center; gap: 6px; }
        .dot { width: 8px; height: 8px; background: currentColor; border-radius: 50%; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        
        .user-badge { background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; border: 1px solid var(--glass-border); }

        .messages-area { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; padding: 10px; scrollbar-width: none; }
        .messages-area::-webkit-scrollbar { display: none; }
        
        .message-wrapper { display: flex; flex-direction: column; max-width: 75%; }
        .own-msg { align-self: flex-end; }
        .ai-msg { align-self: flex-start; max-width: 90%; width: 100%; }
        
        .msg-sender { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-bottom: 6px; margin-left: 12px; font-weight: 500; }

        .message-content { padding: 14px 20px; border-radius: 20px; font-size: 1rem; line-height: 1.5; }
        .shadow-glow { box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        
        .own-msg .message-content { background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; border-bottom-right-radius: 4px; }
        .other-msg .message-content { background: var(--secondary); color: white; border-bottom-left-radius: 4px; border: 1px solid var(--glass-border); }
        
        .ai-msg .message-content { background: rgba(255,255,255,0.03); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; gap: 16px; border-radius: 24px; }
        .bot-icon { color: var(--primary); flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5)); }

        .ai-loading { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: rgba(255,255,255,0.03); border-radius: 20px; width: fit-content; font-size: 0.9rem; color: rgba(255,255,255,0.6); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .input-wrapper { display: flex; padding: 10px; align-items: center; gap: 10px; }
        .chat-input { flex: 1; background: transparent; border: none; padding: 14px 20px; color: white; outline: none; font-size: 1.05rem; }
        .btn-send { background: var(--primary); color: white; border: none; width: 50px; height: 50px; border-radius: 14px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; }
        .btn-send:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-2px); }
        .btn-send:disabled { opacity: 0.3; }
      `}</style>
    </main>
  );
}
