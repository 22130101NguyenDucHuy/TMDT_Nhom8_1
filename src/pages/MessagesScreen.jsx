import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { conversations, books } from "../data/siteData";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function MessagesScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(conversations[0].messages);
  const [newMessage, setNewMessage] = useState("");
  const room = "conversation_1";
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (location.state?.initialOffer) {
      const { bookTitle, offerPrice } = location.state.initialOffer;
      const offerMessage = {
        room: room,
        from: "me",
        text: `[OFFER] Tôi muốn trả giá cuốn sách "${bookTitle}" với giá ${offerPrice}đ`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      socket.emit("send_message", offerMessage);
      setMessages((prev) => [...prev, offerMessage]);
      
      // Clear state to prevent resending on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    socket.emit("join_room", room);

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;

    const messageData = {
      room: room,
      from: "me",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit("send_message", messageData);
    setMessages((prev) => [...prev, messageData]);
    setNewMessage("");
  };

  const handleAcceptOffer = () => {
    const acceptMessage = {
      room: room,
      from: "me",
      text: "Tôi đồng ý bán với giá bạn đưa ra. Hãy tiến hành thanh toán nhé!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit("send_message", acceptMessage);
    setMessages((prev) => [...prev, acceptMessage]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-160px)] min-h-[600px] border border-slate-200 bg-white shadow-sm mt-6">
      {/* Left Sidebar: Conversatons List */}
      <div className="w-1/3 flex flex-col border-r border-slate-200">
        <div className="p-4 border-b border-slate-200">
           <h1 className="text-xl font-bold text-slate-900">Tin nhắn</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
           {conversations.map((c, i) => (
             <div key={c.id} className={`p-4 border-b border-slate-100 flex gap-3 cursor-pointer transition-colors ${i === 0 ? "bg-slate-50 relative" : "bg-white hover:bg-slate-50"}`}>
               {i === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-700"></div>}
               <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold shrink-0">{c.name.charAt(0)}</div>
               <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                     <p className="font-bold text-slate-900 truncate pr-2">{c.name}</p>
                     <span className="text-[11px] text-slate-500 shrink-0">11:24</span>
                  </div>
                  <p className={`text-sm truncate ${i === 0 ? "text-slate-900 font-medium" : "text-slate-500"}`}>{c.preview}</p>
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* Right Sidebar: Chat Area */}
      <div className="w-2/3 flex flex-col relative bg-white">
         <div className="p-4 border-b border-slate-200 flex justify-between items-center h-[73px]">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold shrink-0">M</div>
              <h2 className="font-bold text-slate-900">Minh Anh</h2>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-900">Campbell Biology 12th</p>
               <p className="text-sm font-bold text-teal-700">125.000đ</p>
             </div>
             <img src={books[0].image} className="w-10 h-10 object-cover border border-slate-200 rounded" />
           </div>
         </div>

         <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-[#fdfdfd]">
            <div className="text-center text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Hôm nay</div>
            
            {/* System / Context Message */}
            <div className="self-center bg-slate-100 px-4 py-2 rounded-full text-xs text-slate-500 font-semibold mb-2">
               Minh Anh đã bắt đầu cuộc trò chuyện về một tài liệu
            </div>

            {messages.map((m, i) => (
              <div key={i} className={`flex max-w-[70%] gap-3 ${m.from === 'me' ? "self-end flex-row-reverse" : "self-start"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${m.from === 'me' ? 'bg-slate-200 text-slate-700' : 'bg-teal-100 text-teal-700'}`}>
                  {m.from === 'me' ? 'M' : 'M'}
                </div>
                <div>
                   <div className={`p-3 text-[15px] leading-relaxed ${m.from === 'me' ? "bg-teal-700 text-white rounded-2xl rounded-tr-sm" : "bg-slate-100 text-slate-900 rounded-2xl rounded-tl-sm"}`}>
                     {m.text}
                     {m.text.includes("[OFFER]") && (
                       <div onClick={handleAcceptOffer} className="mt-3 bg-white/20 p-2 rounded text-sm text-center font-bold cursor-pointer hover:bg-white/30 transition-colors">
                          Chấp nhận giá
                       </div>
                     )}
                   </div>
                   <div className={`text-[11px] text-slate-400 mt-1 uppercase ${m.from === 'me' ? 'text-right' : 'text-left'}`}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
         </div>

         <div className="p-4 border-t border-slate-200">
           <div className="flex items-center gap-3">
             <button className="w-10 h-10 flex items-center justify-center text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
             </button>
             <input 
               type="text" 
               className="vinted-input m-0 flex-1 bg-slate-50 border-transparent focus:border-teal-500 focus:bg-white focus:ring-0" 
               placeholder="Viết tin nhắn..." 
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyDown={handleKeyDown}
             />
             <button 
               onClick={handleSendMessage}
               className="px-6 py-3 font-bold text-teal-700 hover:bg-teal-50 rounded transition-colors shrink-0">
               Gửi
             </button>
           </div>
         </div>
      </div>
    </div>
  );
}
