import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";
import { releaseEscrow, submitSellerRating } from "../services/payment";

/** Tạo conversation_id nhất quán giữa 2 user cho 1 cuốn sách */
function buildConvId(uid1, uid2, bookId) {
  const sorted = [uid1, uid2].sort();
  return `${sorted[0]}_${sorted[1]}_${bookId}`;
}

export default function MessagesScreen() {
  const { user, userData, requireAuth, showToast } = useAuth();
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

  const [txnInfo, setTxnInfo] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [disputeTxnId, setDisputeTxnId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Rating and Offer states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);

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
        .select("id, name, avatar_url")
        .in("id", partnerIds);
      if (uErr) console.error("[fetchConversations] users error:", uErr.message);
      (users || []).forEach((u) => (userMap[u.id] = { name: u.name, avatar_url: u.avatar_url }));
    }

    // Resolve thông tin sách
    const bookIds = [...new Set(convList.map((c) => c.bookId).filter(Boolean))];
    let bookMap = {};
    if (bookIds.length > 0) {
      const { data: books, error: bErr } = await supabase
        .from("lb_books")
        .select("id, title, images, price, seller_id")
        .in("id", bookIds);
      if (bErr) console.error("[fetchConversations] books error:", bErr.message);
      (books || []).forEach((b) => (bookMap[b.id] = b));
    }

    return convList.map((c) => ({
      ...c,
      partnerName: (userMap[c.partnerId]?.name) || "Người dùng",
      partnerAvatar: userMap[c.partnerId]?.avatar_url || null,
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
          .select("id, name, avatar_url")
          .eq("id", state.sellerId)
          .single();

        // Lấy thông tin sách
        const { data: bookData } = await supabase
          .from("lb_books")
          .select("id, title, images, price, seller_id")
          .eq("id", state.bookId)
          .single();

        const newConv = {
          id: convId,
          partnerId: state.sellerId,
          partnerName: sellerData?.name || state.sellerName || "Người bán",
          partnerAvatar: sellerData?.avatar_url || null,
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
        fetchTxnForConv(newConv);

        // Gửi offer nếu có
        if (state.initialOffer?.offerPrice) {
          const offerPrice = parseInt(state.initialOffer.offerPrice, 10);
          const offerText = `[OFFER:${offerPrice}] Tôi muốn trả giá "${state.bookTitle}" với mức ${offerPrice.toLocaleString("vi-VN")}₫`;
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
          fetchTxnForConv(first);
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

  // ── Transaction actions ────────────────────────────────────────────
  const fetchTxnForConv = useCallback(async (conv) => {
    if (!conv?.bookId || !user) { setTxnInfo(null); return; }
    const buyerId = user.id;
    const sellerId = conv.partnerId;
    const { data } = await supabase
      .from("lb_transactions")
      .select("*")
      .eq("book_id", conv.bookId)
      .or(`and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTxnInfo(data || null);
  }, [user]);

  const handleConfirmReceived = async () => {
    if (!txnInfo) return;
    setConfirmLoading(true);
    try {
      await releaseEscrow(txnInfo.id);
      showToast("Đã xác nhận nhận sách! Tiền đã được giải ngân cho người bán.", "success");
      fetchTxnForConv(activeConvRef.current);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi xác nhận", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSellerComplete = async () => {
    if (!txnInfo) return;
    setConfirmLoading(true);
    try {
      const { error } = await supabase
        .from('lb_transactions')
        .update({ status: 'completed', is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', txnInfo.id);
      if (error) throw error;

      await supabase
        .from('lb_books')
        .update({ status: 'sold', is_sold: true, sold_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', txnInfo.book_id);

      showToast("Đã xác nhận giao dịch thành công!", "success");
      fetchTxnForConv(activeConvRef.current);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const canDispute = useCallback((txn) => {
    if (!txn || !user) return false;
    const isParticipant = txn.buyer_id === user.id || txn.seller_id === user.id;
    if (!isParticipant) return false;
    if (['cancelled', 'refunded', 'disputed'].includes(txn.status)) return false;
    const txnTime = new Date(txn.completed_at || txn.created_at);
    const hoursDiff = (new Date() - txnTime) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  }, [user]);

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) { showToast("Vui lòng nhập lý do khiếu nại", "error"); return; }
    setDisputeLoading(true);
    try {
      const { openDispute } = await import("../services/payment");
      await openDispute(disputeTxnId, user.id, disputeReason.trim());
      showToast("Đã gửi khiếu nại! Admin sẽ xem xét trong thời gian sớm nhất.", "success");
      setDisputeTxnId(null);
      setDisputeReason("");
      fetchTxnForConv(activeConvRef.current);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi gửi khiếu nại", "error");
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleRateSeller = async () => {
    if (!txnInfo) return;
    setRatingSubmitting(true);
    try {
      await submitSellerRating(txnInfo.id, txnInfo.seller_id, ratingValue);
      showToast("Cảm ơn bạn đã đánh giá người bán!", "success");
      setShowRatingModal(false);
      fetchTxnForConv(activeConvRef.current);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi đánh giá", "error");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleAcceptOffer = async (msg, offerPrice) => {
    if (!activeConv || processingOfferId) return;
    if (!window.confirm(`Bạn có đồng ý bán sách với mức giá ${offerPrice.toLocaleString("vi-VN")}₫?`)) return;

    setProcessingOfferId(msg.id);
    try {
      const { error: bookErr } = await supabase
        .from('lb_books')
        .update({ price: offerPrice, updated_at: new Date().toISOString() })
        .eq('id', activeConv.bookId);
      if (bookErr) throw bookErr;

      const { error: msgErr } = await supabase
        .from('lb_messages')
        .update({ text: msg.text + '|status:accepted' })
        .eq('id', msg.id);
      if (msgErr) throw msgErr;

      const textNoti = `[HỆ THỐNG] Người bán đã đồng ý giá đề xuất ${offerPrice.toLocaleString("vi-VN")}₫. Bạn có thể đặt mua ngay bây giờ với giá mới!`;
      await supabase.from('lb_messages').insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        receiver_id: activeConv.partnerId,
        book_id: activeConv.bookId,
        text: textNoti,
        message_type: 'text',
        created_at: new Date().toISOString()
      });

      showToast("Đã chấp nhận giá đề xuất!", "success");
      
      const { data: updatedBook } = await supabase
        .from('lb_books')
        .select('id, title, images, price, seller_id')
        .eq('id', activeConv.bookId)
        .single();
      
      if (updatedBook) {
        setActiveConv(prev => ({
          ...prev,
          book: updatedBook
        }));
      }
      
      const { data: newMsgs } = await supabase
        .from('lb_messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });
      setMessages(newMsgs || []);
    } catch (err) {
      showToast(err.message || "Lỗi khi đồng ý giá đề xuất", "error");
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleDeclineOffer = async (msg, offerPrice) => {
    if (!activeConv || processingOfferId) return;
    if (!window.confirm("Bạn muốn từ chối mức đề xuất giá này?")) return;

    setProcessingOfferId(msg.id);
    try {
      const { error: msgErr } = await supabase
        .from('lb_messages')
        .update({ text: msg.text + '|status:rejected' })
        .eq('id', msg.id);
      if (msgErr) throw msgErr;

      const textNoti = `[HỆ THỐNG] Người bán đã từ chối giá đề xuất ${offerPrice.toLocaleString("vi-VN")}₫.`;
      await supabase.from('lb_messages').insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        receiver_id: activeConv.partnerId,
        book_id: activeConv.bookId,
        text: textNoti,
        message_type: 'text',
        created_at: new Date().toISOString()
      });

      showToast("Đã từ chối giá đề xuất", "info");

      const { data: newMsgs } = await supabase
        .from('lb_messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });
      setMessages(newMsgs || []);
    } catch (err) {
      showToast(err.message || "Lỗi khi từ chối giá đề xuất", "error");
    } finally {
      setProcessingOfferId(null);
    }
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
    fetchTxnForConv(conv);
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

  if (userData && userData.status === 'inactive') {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-full mb-6 text-amber-500 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Tài khoản chưa được kích hoạt</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">Tài khoản sinh viên của bạn đang chờ phê duyệt thẻ sinh viên để sử dụng tính năng nhắn tin.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  if (userData && userData.status === 'suspended') {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6 text-red-500 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Tài khoản đã bị khóa</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">Tài khoản của bạn đã bị khóa do vi phạm chính sách của LoopBook.</p>
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
                ) : c.partnerAvatar ? (
                  <img
                    src={c.partnerAvatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
              {activeConv.partnerAvatar ? (
                <img
                  src={activeConv.partnerAvatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100"
                />
              ) : (
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              )}
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
              {/* ── Transaction actions ── */}
              {txnInfo && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {txnInfo.status === "pending" && !txnInfo.is_completed && txnInfo.buyer_id === user.id && (
                    <button
                      onClick={handleConfirmReceived}
                      disabled={confirmLoading}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      {confirmLoading ? (
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Xác nhận đã nhận sách
                    </button>
                  )}
                  {txnInfo.status === "pending" && !txnInfo.is_completed && txnInfo.seller_id === user.id && (
                    <>
                      {txnInfo.payment_method === 'wallet' || txnInfo.payment_method === 'payos' ? (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Đang chờ người mua xác nhận
                        </span>
                      ) : (
                        <button
                          onClick={handleSellerComplete}
                          disabled={confirmLoading}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          {confirmLoading ? (
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Xác nhận đã giao sách
                        </button>
                      )}
                    </>
                  )}
                  {txnInfo.status === "completed" && (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {txnInfo.buyer_id === user.id ? "Đã nhận sách" : "Đã bán"}
                    </span>
                  )}
                  {txnInfo.status === "completed" && txnInfo.buyer_id === user.id && !txnInfo.notes?.includes('|rated:true') && (
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span className="text-yellow-500">★</span> Đánh giá người bán
                    </button>
                  )}
                  {txnInfo.status === "disputed" && (
                    <span className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Đang tranh chấp
                    </span>
                  )}
                  {canDispute(txnInfo) && (
                    <button
                      onClick={() => setDisputeTxnId(txnInfo.id)}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Khiếu nại
                    </button>
                  )}
                </div>
              )}
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
          ) : (
            <>
              {activeConv?.book && (
                <div className="flex max-w-[70%] gap-2 self-start">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div>
                    <div className="bg-slate-100 text-slate-900 rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed space-y-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-base">🤖</span>
                        <span className="font-semibold text-xs text-slate-600">LoopBook Bot</span>
                      </div>
                      <p>👋 Chào bạn! Bạn đang quan tâm tới tài liệu này:</p>
                      <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                        {activeConv.book.images?.[0] ? (
                          <img src={activeConv.book.images[0]} alt="" className="w-16 h-20 rounded-lg object-cover shrink-0 border border-slate-100" />
                        ) : (
                          <div className="w-16 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{activeConv.book.title}</p>
                          {activeConv.book.price && (
                            <p className="text-sm text-teal-700 font-extrabold mt-0.5">{formatPrice(activeConv.book.price)}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1.5">
                            Người bán: <span className="font-medium text-slate-600">{activeConv.partnerName}</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-slate-500">Hãy gửi tin nhắn để trao đổi với người bán nhé! 💬</p>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 text-left">{new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                const isMe = m.sender_id === user.id;
                return (
                  <div
                    key={m.id || i}
                    className={`flex max-w-[70%] gap-2 ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                  >
                    {isMe ? (
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    ) : activeConv?.partnerAvatar ? (
                      <img
                        src={activeConv.partnerAvatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                    <div>
                      {(() => {
                        const isOffer = m.text.startsWith('[OFFER:');
                        if (isOffer) {
                          const match = m.text.match(/^\[OFFER:(\d+)\]/);
                          const offerPrice = match ? parseInt(match[1], 10) : 0;
                          
                          let offerStatus = 'pending';
                          if (m.text.includes('|status:accepted')) offerStatus = 'accepted';
                          else if (m.text.includes('|status:rejected')) offerStatus = 'rejected';

                          const cleanText = m.text
                            .replace(/^\[OFFER:\d+\]\s*/, '')
                            .replace(/\|status:\w+/, '');

                          const isSeller = activeConv?.book?.seller_id === user.id;

                          return (
                            <div className="flex flex-col gap-2">
                              <div
                                className={`px-4 py-2.5 text-sm leading-relaxed border ${
                                  isMe
                                    ? "bg-teal-50 border-teal-200 text-teal-900 rounded-2xl rounded-tr-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-950 rounded-2xl rounded-tl-sm"
                                }`}
                              >
                                <div className="font-semibold text-xs text-amber-700 uppercase tracking-wider mb-1">🏷️ Đề xuất giá từ người mua</div>
                                <div className="text-slate-800">{cleanText}</div>
                                
                                {offerStatus === 'accepted' && (
                                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                    ✓ Đã đồng ý mức giá này
                                  </div>
                                )}
                                {offerStatus === 'rejected' && (
                                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                    ✕ Đã từ chối đề xuất
                                  </div>
                                )}
                              </div>

                              {offerStatus === 'pending' && isSeller && !isMe && (
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleAcceptOffer(m, offerPrice)}
                                    disabled={processingOfferId === m.id}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    Đồng ý bán
                                  </button>
                                  <button
                                    onClick={() => handleDeclineOffer(m, offerPrice)}
                                    disabled={processingOfferId === m.id}
                                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            className={`px-4 py-2.5 text-sm leading-relaxed ${
                              isMe
                                ? "bg-teal-700 text-white rounded-2xl rounded-tr-sm"
                                : "bg-slate-100 text-slate-900 rounded-2xl rounded-tl-sm"
                            } ${m._optimistic ? "opacity-60" : ""}`}
                          >
                            {m.text}
                          </div>
                        );
                      })()}
                      <div className={`text-[11px] text-slate-400 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                        {m.created_at
                          ? new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
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
      {/* Modal khiếu nại */}
      {disputeTxnId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">🚨 Khiếu nại đơn hàng</h3>
              <button
                onClick={() => { setDisputeTxnId(null); setDisputeReason(""); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Mô tả chi tiết vấn đề bạn gặp phải. Cả người mua và người bán đều có thể khiếu nại trong vòng <strong>48 giờ</strong> kể từ khi giao dịch được tạo.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="VD: Sách không đúng mô tả, thiếu trang, hư hỏng..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 h-28 resize-y"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-right mt-1">{disputeReason.length}/500</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setDisputeTxnId(null); setDisputeReason(""); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleOpenDispute}
                  disabled={disputeLoading || !disputeReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {disputeLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    <>Gửi khiếu nại</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đánh giá người bán */}
      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">⭐ Đánh giá Người bán</h3>
              <button
                onClick={() => { setShowRatingModal(false); setRatingValue(5); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600 mb-6">
                Vui lòng chấm điểm chất lượng và thái độ của người bán đối với đơn hàng này.
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="text-4xl transition-transform hover:scale-110 duration-150 focus:outline-none"
                  >
                    <span className={star <= ratingValue ? "text-yellow-400" : "text-slate-300"}>★</span>
                  </button>
                ))}
              </div>

              <div className="text-sm font-semibold text-slate-700 mb-6">
                {ratingValue === 5 && "🤩 Tuyệt vời - Rất hài lòng!"}
                {ratingValue === 4 && "😊 Tốt - Khá hài lòng"}
                {ratingValue === 3 && "😐 Bình thường"}
                {ratingValue === 2 && "🙁 Chưa tốt"}
                {ratingValue === 1 && "😡 Tệ - Rất không hài lòng"}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRatingModal(false); setRatingValue(5); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleRateSeller}
                  disabled={ratingSubmitting}
                  className="flex-1 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {ratingSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    <>Gửi đánh giá</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
