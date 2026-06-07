import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";

/** Tạo conversation_id nhất quán giữa 2 user cho 1 cuốn sách */
function buildConvId(uid1, uid2, bookId) {
  const sorted = [uid1, uid2].sort();
  return `${sorted[0]}_${sorted[1]}_${bookId}`;
}

export default function MessagesScreen() {
  const { user, userData, requireAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const activeConvRef = useRef(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // ── Tải tin nhắn của một conversation cụ thể ─────────────────────────────
  const fetchMessages = useCallback(async (convId) => {
    const { data, error } = await supabase
      .from("lb_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[fetchMessages] error:", error.message, error.details, error.hint);
      return [];
    }
    return data || [];
  }, []);

  // ── Tải danh sách conversations từ messages ───────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return [];

    // Lấy tất cả messages liên quan đến user hiện tại
    const { data: msgs, error } = await supabase
      .from("lb_messages")
      .select("conversation_id, sender_id, receiver_id, book_id, text, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[fetchConversations] messages error:", error.message, error.hint);
      return [];
    }

    if (!msgs || msgs.length === 0) return [];

    // Gom theo conversation_id — lấy tin nhắn mới nhất làm preview
    const convMap = new Map();
    msgs.forEach((m) => {
      const cid = m.conversation_id;
      if (!convMap.has(cid)) {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        convMap.set(cid, {
          id: cid,
          partnerId,
          partnerName: null, // sẽ resolve bên dưới
          bookId: m.book_id || null,
          preview: m.text,
          messages: [],
        });
      }
    });

    const convList = [...convMap.values()];

    // Resolve tên partner từ lb_users
    const partnerIds = [...new Set(convList.map((c) => c.partnerId).filter(Boolean))];
    let userMap = {};
    if (partnerIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("lb_users")
        .select("id, name")
        .in("id", partnerIds);
      if (uErr) console.error("[fetchConversations] users error:", uErr.message);
      (users || []).forEach((u) => (userMap[u.id] = u.name));
    }

    // Resolve thông tin sách
    const bookIds = [...new Set(convList.map((c) => c.bookId).filter(Boolean))];
    let bookMap = {};
    if (bookIds.length > 0) {
      const { data: books, error: bErr } = await supabase
        .from("lb_books")
        .select("id, title, images, price")
        .in("id", bookIds);
      if (bErr) console.error("[fetchConversations] books error:", bErr.message);
      (books || []).forEach((b) => (bookMap[b.id] = b));
    }

    return convList.map((c) => ({
      ...c,
      partnerName: userMap[c.partnerId] || "Người dùng",
      book: c.bookId ? bookMap[c.bookId] || null : null,
    }));
  }, [user]);

  // ── Subscribe Supabase Realtime ───────────────────────────────────────────
  const subscribeToConv = useCallback((convId) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    if (!convId || !user) return;

    const channel = supabase
      .channel(`conv_${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lb_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const msg = payload.new;
          // Bỏ qua tin nhắn do chính mình gửi (đã optimistic update)
          if (msg.sender_id === user.id) return;
          setMessages((prev) => [...prev, msg]);
          setConversations((prev) =>
            prev.map((c) => c.id === convId ? { ...c, preview: msg.text } : c)
          );
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("[realtime] subscribe error:", err);
      });

    realtimeChannelRef.current = channel;
  }, [user]);

  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // ── Khởi tạo ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { requireAuth(); return; }

    const init = async () => {
      setLoading(true);
      const state = location.state;

      if (state?.sellerId && state?.bookId) {
        // === Đến từ trang chi tiết sản phẩm ===
        const convId = buildConvId(user.id, state.sellerId, state.bookId);

        // Lấy thông tin seller
        const { data: sellerData } = await supabase
          .from("lb_users")
          .select("id, name")
          .eq("id", state.sellerId)
          .single();

        // Lấy thông tin sách
        const { data: bookData } = await supabase
          .from("lb_books")
          .select("id, title, images, price")
          .eq("id", state.bookId)
          .single();

        const newConv = {
          id: convId,
          partnerId: state.sellerId,
          partnerName: sellerData?.name || state.sellerName || "Người bán",
          bookId: state.bookId,
          book: bookData || {
            id: state.bookId,
            title: state.bookTitle || "",
            images: state.bookImage ? [state.bookImage] : [],
            price: null,
          },
          preview: "",
        };

        // Load tin nhắn cũ của conversation này (nếu đã từng chat)
        setMessagesLoading(true);
        const existingMsgs = await fetchMessages(convId);
        setMessagesLoading(false);

        // Load tất cả conversations để hiển thị sidebar
        const allConvs = await fetchConversations();
        // Đưa conv hiện tại lên đầu, tránh trùng
        const otherConvs = allConvs.filter((c) => c.id !== convId);
        setConversations([{ ...newConv, preview: existingMsgs.at(-1)?.text || newConv.preview }, ...otherConvs]);

        setActiveConv(newConv);
        setMessages(existingMsgs);
        subscribeToConv(convId);

        // Gửi offer nếu có
        if (state.initialOffer?.offerPrice) {
          const offerText = `[OFFER] Tôi muốn trả giá "${state.bookTitle}" với mức ${Number(state.initialOffer.offerPrice).toLocaleString("vi-VN")}₫`;
          await insertMessage(offerText, newConv);
        }

        navigate(location.pathname, { replace: true, state: null });
      } else {
        // === Vào thẳng trang /tin-nhan ===
        const allConvs = await fetchConversations();
        setConversations(allConvs);

        if (allConvs.length > 0) {
          const first = allConvs[0];
          setActiveConv(first);
          setMessagesLoading(true);
          const msgs = await fetchMessages(first.id);
          setMessages(msgs);
          setMessagesLoading(false);
          subscribeToConv(first.id);
        }
      }

      setLoading(false);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Insert tin nhắn vào Supabase ─────────────────────────────────────────
  const insertMessage = async (text, convOverride) => {
    const conv = convOverride || activeConvRef.current;
    if (!text?.trim() || !conv || !user) return false;

    const optimisticId = `opt_${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      conversation_id: conv.id,
      sender_id: user.id,
      receiver_id: conv.partnerId,
      book_id: conv.bookId || null,
      text: text.trim(),
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    // Hiện tin nhắn ngay (optimistic)
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) =>
      prev.map((c) => c.id === conv.id ? { ...c, preview: text.trim() } : c)
    );

    setSendError(null);
    const { error } = await supabase.from("lb_messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      receiver_id: conv.partnerId || null,
      book_id: conv.bookId || null,
      text: text.trim(),
      message_type: "text",
    });

    if (error) {
      console.error("[sendMessage] insert error:", error.message, error.details, error.hint, error.code);
      setSendError(`Lỗi gửi tin: ${error.message}`);
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return false;
    }

    // Xoá optimistic flag (tin nhắn thật sẽ đến qua realtime nếu sender khác,
    // với sender là chính mình — giữ nguyên optimistic, đủ dùng)
    return true;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    const text = newMessage;
    setNewMessage("");
    setSending(true);
    await insertMessage(text);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const switchConversation = async (conv) => {
    setActiveConv(conv);
    setMessagesLoading(true);
    setMessages([]);
    subscribeToConv(conv.id);
    const msgs = await fetchMessages(conv.id);
    setMessages(msgs);
    setMessagesLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để sử dụng tính năng nhắn tin.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex h-[calc(100vh-160px)] min-h-[600px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-160px)] min-h-[600px] border border-slate-200 bg-white shadow-sm mt-6">

      {/* ── Sidebar: danh sách conversations ── */}
      <div className="w-1/3 flex flex-col border-r border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Tin nhắn</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-sm text-slate-400 text-center">Chưa có tin nhắn nào</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => switchConversation(c)}
                className={`p-4 border-b border-slate-100 flex gap-3 cursor-pointer transition-colors relative ${activeConv?.id === c.id ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}
              >
                {activeConv?.id === c.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-700 rounded-r" />
                )}
                {c.book?.images?.[0] ? (
                  <img
                    src={c.book.images[0]}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg shrink-0">
                    {(c.partnerName || "U").charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate text-sm">{c.partnerName}</p>
                  {c.book?.title && (
                    <p className="text-xs text-teal-700 font-medium truncate">{c.book.title}</p>
                  )}
                  <p className="text-xs text-slate-400 truncate mt-0.5">{c.preview}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Khung chat ── */}
      <div className="w-2/3 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 min-h-[73px]">
          {activeConv ? (
            <>
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold shrink-0">
                {(activeConv.partnerName || "U").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900">{activeConv.partnerName}</h2>
                {activeConv.book && (
                  <Link
                    to={`/sach/${activeConv.book.id}`}
                    className="inline-flex items-center gap-2 mt-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg hover:border-teal-300 transition-colors max-w-xs group"
                  >
                    {activeConv.book.images?.[0] && (
                      <img src={activeConv.book.images[0]} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-teal-700">
                        {activeConv.book.title}
                      </p>
                      {activeConv.book.price && (
                        <p className="text-xs text-teal-700 font-bold">{formatPrice(activeConv.book.price)}</p>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">Chọn một cuộc trò chuyện</p>
          )}
        </div>

        {/* Nội dung chat */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-[#fdfdfd]">
          {!activeConv ? (
            <div className="text-center text-sm text-slate-400 my-auto">
              Chọn một cuộc trò chuyện để bắt đầu
            </div>
          ) : messagesLoading ? (
            <div className="flex items-center justify-center my-auto">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-slate-400 my-auto flex flex-col items-center gap-3">
              {activeConv.book && (
                <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                  {activeConv.book.images?.[0] && (
                    <img src={activeConv.book.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  )}
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Đang hỏi về</p>
                    <p className="text-sm font-semibold text-slate-800">{activeConv.book.title}</p>
                  </div>
                </div>
              )}
              <p>Hãy bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.sender_id === user.id;
              return (
                <div
                  key={m.id || i}
                  className={`flex max-w-[70%] gap-2 ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isMe ? "bg-slate-200 text-slate-700" : "bg-teal-100 text-teal-700"}`}
                  >
                    {isMe
                      ? (userData?.name?.charAt(0) || "U")
                      : (activeConv?.partnerName?.charAt(0) || "U")}
                  </div>
                  <div>
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "bg-teal-700 text-white rounded-2xl rounded-tr-sm"
                          : "bg-slate-100 text-slate-900 rounded-2xl rounded-tl-sm"
                      } ${m._optimistic ? "opacity-60" : ""}`}
                    >
                      {m.text}
                    </div>
                    <div className={`text-[11px] text-slate-400 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                      {m.created_at
                        ? new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          {sendError && (
            <p className="text-xs text-red-500 mb-2 px-1">{sendError}</p>
          )}
          {activeConv?.book?.title && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-teal-50 rounded-lg border border-teal-100">
              <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs text-teal-700 font-medium truncate">{activeConv.book.title}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="vinted-input m-0 flex-1 bg-slate-50 border-transparent focus:border-teal-500 focus:bg-white focus:ring-0"
              placeholder={activeConv ? "Viết tin nhắn..." : "Chọn cuộc trò chuyện trước"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConv || sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !activeConv || sending}
              className="px-6 py-3 font-bold text-teal-700 hover:bg-teal-50 rounded transition-colors shrink-0 disabled:opacity-40"
            >
              {sending ? (
                <svg className="animate-spin h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : "Gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
