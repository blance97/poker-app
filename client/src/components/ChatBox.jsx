// client/src/components/ChatBox.jsx
import { useState, useRef, useEffect } from 'react';

export default function ChatBox({ messages, onSend }) {
    const [text, setText] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <div className="chat-box">
            <div className="chat-box__header">💬 Chat</div>
            <div className="chat-box__messages">
                {messages.map((msg, i) => (
                    <div key={i} className="chat-box__message">
                        <span className="chat-box__sender">{msg.playerName}:</span>
                        <span className="chat-box__text">{msg.text}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-box__form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-box__input"
                />
                <button type="submit" className="chat-box__send">Send</button>
            </form>
        </div>
    );
}
