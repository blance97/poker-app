// client/src/components/ChatBox.jsx
import { useState, useRef, useEffect } from 'react';

const EMOTES = ['😂', '🔥', '👍', '💀', '😤', '🤙'];

export default function ChatBox({ messages, onSend, onEmote }) {
    const [text, setText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (expanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, expanded]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <div className={`chat-box ${expanded ? 'chat-box--expanded' : ''}`}>
            <button
                className="chat-box__header"
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
            >
                💬 Chat
                <span className="chat-box__toggle-icon">{expanded ? '▾' : '▴'}</span>
            </button>
            <div className="chat-box__body">
                <div className="chat-box__messages">
                    {messages.map((msg, i) => (
                        <div key={i} className="chat-box__message">
                            <span className="chat-box__sender">{msg.playerName}:</span>
                            <span className="chat-box__text">{msg.text}</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                {onEmote && (
                    <div className="chat-box__emotes">
                        {EMOTES.map(e => (
                            <button key={e} className="chat-box__emote-btn" onClick={() => onEmote(e)}>
                                {e}
                            </button>
                        ))}
                    </div>
                )}
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
        </div>
    );
}
