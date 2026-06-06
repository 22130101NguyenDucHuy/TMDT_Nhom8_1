import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { categories } from "../data/siteData";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const conditionOptions = [
   { id: "brand_new", label: "Mới 100%" },
   { id: "like_new", label: "Như mới 90-95%" },
   { id: "very_good", label: "Rất tốt" },
   { id: "good", label: "Tốt - Có ghi chú" },
   { id: "acceptable", label: "Cũ" },
];

const deliveryOptions = [
   { id: "meet", label: "Gặp trực tiếp" },
   { id: "cod", label: "Ship COD" },
   { id: "transfer", label: "Chuyển khoản trước" },
];

const schoolSuggestions = [
   "Đại học Bách Khoa Hà Nội",
   "Đại học Bách Khoa TP.HCM",
   "Đại học Kinh tế Quốc dân",
   "Đại học Ngoại thương",
   "Đại học Kinh tế TP.HCM",
   "Đại học Khoa học Xã hội và Nhân văn",
   "Đại học Khoa học Tự nhiên",
   "Đại học Sư phạm",
   "Học viện Bưu chính Viễn thông",
   "Học viện Tài chính",
   "Học viện Nông nghiệp Việt Nam"
];

export default function SellScreen() {
   const { user, userData, showToast } = useAuth();
   const navigate = useNavigate();

   // Khối 1: Cơ bản
   const [images, setImages] = useState([]);
   const [title, setTitle] = useState("");
   const [category, setCategory] = useState("");
   const [customCategory, setCustomCategory] = useState("");

   // Khối 2: Chi tiết
   const [condition, setCondition] = useState("");
   const [author, setAuthor] = useState("");
   const [publisher, setPublisher] = useState("");
   const [edition, setEdition] = useState("");
   const [school, setSchool] = useState("");
   const [year, setYear] = useState("");

   // Khối 3: Định giá & Mô tả
   const [price, setPrice] = useState("");
   const [allowOffers, setAllowOffers] = useState(true);
   const [description, setDescription] = useState("");

   // Khối 4: Giao dịch & Urgent
   const [locationStr, setLocationStr] = useState("");
   const [selectedDeliveries, setSelectedDeliveries] = useState(["meet"]);
   const [isUrgent, setIsUrgent] = useState(false);

   const [loading, setLoading] = useState(false);
   const [uploadStep, setUploadStep] = useState("");
   const [errors, setErrors] = useState({});

   const fileInputRef = useRef(null);

    if (!userData) {
      return (
         <div className="max-w-4xl mx-auto py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
               <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
            <p className="text-slate-600 mb-6">Vui lòng đăng nhập để sử dụng tính năng đăng bán tài liệu.</p>
            <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
         </div>
      );
   }

   const formatPrice = (value) => {
      const rawValue = value.replace(/\D/g, "");
      if (!rawValue) return "";
      return parseInt(rawValue, 10).toLocaleString("en-US");
   };

   const handlePriceChange = (e) => setPrice(formatPrice(e.target.value));

   const handleImageChange = (e) => {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 20) {
         showToast("Chỉ được tải lên tối đa 20 ảnh.", "error");
         return;
      }
      const newImages = files.map(file => ({
         file,
         preview: URL.createObjectURL(file)
      }));
      setImages([...images, ...newImages]);
   };

   const removeImage = (index) => {
      const newImages = [...images];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      setImages(newImages);
   };

   const toggleDelivery = (id) => {
      if (selectedDeliveries.includes(id)) {
         if (selectedDeliveries.length > 1) {
            setSelectedDeliveries(selectedDeliveries.filter(d => d !== id));
         } else {
            showToast("Phải chọn ít nhất 1 phương thức giao hàng", "error");
         }
      } else {
         setSelectedDeliveries([...selectedDeliveries, id]);
      }
   };

   const applyTemplate = () => {
      setDescription("Sách sử dụng cho môn [...], tình trạng [...], có highlight ở chương [...], mua tại [...]. Phù hợp cho các bạn sinh viên năm [...].");
   };

   const validateForm = () => {
      const newErrors = {};
      if (images.length === 0) newErrors.images = "Vui lòng tải lên ít nhất 1 ảnh.";
      if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề.";
      if (!category) newErrors.category = "Vui lòng chọn danh mục.";
      if (category === 'other' && !customCategory.trim()) newErrors.customCategory = "Vui lòng nhập danh mục.";
      if (!condition) newErrors.condition = "Vui lòng chọn tình trạng.";
      if (!price) newErrors.price = "Vui lòng nhập mức giá bán.";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   };

   const handleSubmit = async (status = 'active') => {
      if (status === 'active' && !validateForm()) {
         showToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
         window.scrollTo({ top: 0, behavior: 'smooth' });
         return;
      }

      setLoading(true);
      try {
         // 1. Generate unique ID cho bài đăng
         const bookId = `bk_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
         const numericPrice = price ? parseInt(price.replace(/,/g, ""), 10) : 0;
         const numericYear = year ? parseInt(year, 10) : null;

         // 2. Upload TẤT CẢ ảnh lên Storage
         const uploadedUrls = [];
         for (let i = 0; i < images.length; i++) {
            setUploadStep(`Đang tải ảnh ${i + 1}/${images.length}...`);
            const file = images[i].file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${bookId}_${i}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
               .from('books2')
               .upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('books2').getPublicUrl(fileName);
            uploadedUrls.push(urlData.publicUrl);
         }

         setUploadStep("Đang lưu thông tin...");

         // 3. Build tags array (jsonb - KHÔNG stringify)
         const tags = [];
         if (isUrgent) tags.push("Bán gấp");
         if (allowOffers) tags.push("Cho phép trả giá");
         selectedDeliveries.forEach(id => {
            const method = deliveryOptions.find(d => d.id === id);
            if (method) tags.push(method.label);
         });
         if (locationStr) tags.push(`Giao dịch: ${locationStr}`);
         // Khi chọn "Khác", lưu tên môn vào tags (tránh vi phạm FK constraint)
         if (category === 'other' && customCategory.trim()) {
            tags.push(`Môn học: ${customCategory.trim()}`);
         }

          // 4. Xác định category
          const dbCategory = category === 'other' ? null : category;

          // 5. Insert DB
          const { data: insertData, error } = await supabase
             .from('lb_books')
             .insert([{
                id: bookId,
                seller_id: userData.id,
                title: title.trim(),
                description: description.trim() || null,
                category: dbCategory,
                condition: condition,
                price: numericPrice,
                original_price: null,
                images: uploadedUrls,
                status: status,
                author: author.trim() || null,
                publisher: publisher.trim() || null,
                edition: edition.trim() || null,
                school: school.trim() || null,
                year: numericYear,
                urgent: isUrgent,
                allow_offers: allowOffers,
                delivery_methods: selectedDeliveries,
                location_text: locationStr || null,
                tags: tags,
             }])
             .select();

         if (error) throw error;

         showToast(status === 'draft' ? "Đã lưu nháp thành công!" : "Đăng bán thành công!", "success");
         navigate("/quan-ly");
      } catch (err) {
         console.error("Submit error:", err);
         showToast(err.message || "Có lỗi xảy ra khi lưu trữ, vui lòng thử lại.", "error");
      } finally {
         setLoading(false);
         setUploadStep("");
      }
   };

   return (
      <div className="max-w-4xl mx-auto py-8">
         <h1 className="text-2xl font-bold text-slate-900 mb-6">Đăng bán tài liệu</h1>

         {/* KHỐI 1: Trực quan & Cơ bản */}
         <div className={`bg-white border ${errors.images ? 'border-red-400' : 'border-slate-200'} rounded-lg p-6 mb-6 shadow-sm`}>
            <div className="mb-6">
               <h2 className="font-bold text-slate-900 text-lg mb-2">Hình ảnh tài liệu <span className="text-red-500">*</span></h2>
               <p className="text-sm text-slate-500 mb-4">Tải lên tối đa 20 ảnh chất lượng cao để sách của bạn dễ bán hơn.</p>

               {images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                     {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-slate-200 group">
                           <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                           <button
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                           >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                           {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-teal-700/90 text-white text-[10px] font-medium text-center py-1">ẢNH BÌA</span>}
                        </div>
                     ))}
                     {images.length < 20 && (
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-300 rounded-md bg-slate-50 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors">
                           <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                     )}
                  </div>
               ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center py-12 px-4 cursor-pointer hover:border-teal-500 hover:bg-teal-50/50 transition-colors">
                     <svg className="w-10 h-10 text-teal-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                     <span className="vinted-btn-outline w-auto px-6 py-2 mb-2 pointer-events-none">Tải ảnh lên</span>
                     <p className="text-xs text-slate-500 text-center pointer-events-none">Hoặc kéo thả ảnh vào khu vực này</p>
                  </div>
               )}
               <input type="file" multiple accept="image/jpeg, image/png" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
               {errors.images && <p className="text-red-500 text-sm mt-2">{errors.images}</p>}
            </div>

            <div className="border-t border-slate-100 pt-6">
               <label className="font-bold text-slate-900 block mb-2">Tiêu đề <span className="text-red-500">*</span></label>
               <input
                  type="text"
                  value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
                  className={`vinted-input text-lg ${errors.title ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                  placeholder="VD: Giáo trình Kinh tế vi mô bản mới nhất"
               />
               <div className="flex justify-between mt-1">
                  {errors.title ? <p className="text-red-500 text-xs">{errors.title}</p> : <div></div>}
                  <p className="text-xs text-slate-400">{title.length}/100</p>
               </div>
            </div>

            <div className="pt-4">
               <label className="font-bold text-slate-900 block mb-3">Danh mục tài liệu <span className="text-red-500">*</span></label>
               <div className="flex flex-wrap gap-2">
                  {[...categories, { id: 'other', name: 'Khác' }].map(c => (
                     <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${category === c.id ? 'bg-teal-700 text-white border-teal-700 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'}`}
                     >
                        {c.name}
                     </button>
                  ))}
               </div>
               {category === 'other' && (
                  <div className="mt-3">
                     <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className={`vinted-input ${errors.customCategory ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                        placeholder="Nhập môn học khác..."
                     />
                     {errors.customCategory && <p className="text-red-500 text-xs mt-1">{errors.customCategory}</p>}
                  </div>
               )}
               {errors.category && <p className="text-red-500 text-xs mt-2">{errors.category}</p>}
            </div>
         </div>

         {/* KHỐI 2: Chi tiết thuộc tính */}
         <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Chi tiết thuộc tính</h2>

            <div className="mb-6">
               <label className="font-bold text-slate-900 block mb-3">Tình trạng sách <span className="text-red-500">*</span></label>
               <div className="flex flex-wrap gap-2">
                  {conditionOptions.map(c => (
                     <button
                        key={c.id}
                        onClick={() => setCondition(c.id)}
                        className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${condition === c.id ? 'bg-teal-50 text-teal-800 border-teal-500 ring-1 ring-teal-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                     >
                        {c.label}
                     </button>
                  ))}
               </div>
               {errors.condition && <p className="text-red-500 text-xs mt-2">{errors.condition}</p>}
            </div>

            {/* Thông tin mở rộng - Luôn hiển thị vì là form chuyên sách */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
               <div>
                  <label className="font-bold text-slate-900 text-sm block mb-2">Trường Đại học</label>
                  <input
                     type="text"
                     list="school-list"
                     value={school} onChange={e => setSchool(e.target.value)}
                     className="vinted-input"
                     placeholder="Gõ để tìm tên trường..."
                  />
                  <datalist id="school-list">
                     {schoolSuggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
               </div>
               <div>
                  <label className="font-bold text-slate-900 text-sm block mb-2">Tác giả</label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="vinted-input" placeholder="VD: Nguyễn Văn A" />
               </div>
               <div>
                  <label className="font-bold text-slate-900 text-sm block mb-2">Phiên bản / Lần tái bản</label>
                  <input type="text" value={edition} onChange={e => setEdition(e.target.value)} className="vinted-input" placeholder="VD: Tái bản lần 5" />
               </div>
               <div className="flex gap-4">
                  <div className="w-1/2">
                     <label className="font-bold text-slate-900 text-sm block mb-2">Năm xuất bản</label>
                     <input type="number" value={year} onChange={e => setYear(e.target.value)} className="vinted-input" placeholder="VD: 2022" />
                  </div>
                  <div className="w-1/2">
                     <label className="font-bold text-slate-900 text-sm block mb-2">Nhà XB</label>
                     <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} className="vinted-input" placeholder="VD: NXB Giáo dục" />
                  </div>
               </div>
            </div>
         </div>

         {/* KHỐI 3: Định giá & Mô tả */}
         <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Định giá & Mô tả</h2>

            <div className="mb-6">
               <label className="font-bold text-teal-800 block mb-2">Mức giá bán <span className="text-red-500">*</span></label>
               <div className="relative md:w-1/2">
                  <span className="absolute right-4 top-3.5 text-teal-800 font-bold">₫</span>
                  <input
                     type="text"
                     value={price} onChange={handlePriceChange}
                     className={`vinted-input pr-10 text-lg font-bold text-teal-800 border-teal-200 focus:border-teal-500 bg-teal-50/30 ${errors.price ? 'border-red-400' : ''}`}
                     placeholder="0"
                  />
               </div>
               {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>

            <div className="mb-6">
               <div className="flex justify-between items-end mb-2">
                  <label className="font-bold text-slate-900">Mô tả tài liệu</label>
                  <button onClick={applyTemplate} type="button" className="text-teal-700 text-sm font-semibold hover:bg-teal-50 px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     Dùng mẫu gợi ý
                  </button>
               </div>
               <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000}
                  className={`vinted-input h-32 resize-y ${errors.description ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                  placeholder="Mô tả chi tiết giúp người mua tin tưởng và chốt đơn nhanh hơn..."
               />
               <div className="flex justify-between mt-1">
                  {errors.description ? <p className="text-red-500 text-xs">{errors.description}</p> : <div></div>}
                  <p className="text-xs text-slate-400">{description.length}/1000</p>
               </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
               <input type="checkbox" checked={allowOffers} onChange={(e) => setAllowOffers(e.target.checked)} className="w-5 h-5 accent-teal-700 rounded" />
               <div>
                  <p className="font-bold text-slate-900 text-sm">Chấp nhận trả giá</p>
                  <p className="text-xs text-slate-500">Cho phép người mua đề xuất mức giá thấp hơn mức giá niêm yết của bạn.</p>
               </div>
            </label>
         </div>

         {/* KHỐI 4: Giao dịch & Đăng tin */}
         <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Giao dịch & Trạng thái</h2>

            <div className="mb-6">
               <label className="font-bold text-slate-900 block mb-2">Khu vực / Địa điểm giao dịch</label>
               <input
                  type="text"
                  value={locationStr} onChange={e => setLocationStr(e.target.value)}
                  className="vinted-input"
                  placeholder="VD: KTX Khu A, ĐHQG TP.HCM hoặc Quận Cầu Giấy, Hà Nội..."
               />
            </div>

            <div className="mb-6">
               <label className="font-bold text-slate-900 block mb-3">Hình thức giao dịch</label>
               <div className="flex flex-wrap gap-2">
                  {deliveryOptions.map(d => (
                     <button
                        key={d.id}
                        onClick={() => toggleDelivery(d.id)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${selectedDeliveries.includes(d.id) ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'}`}
                     >
                        {selectedDeliveries.includes(d.id) && <span className="mr-1">✓</span>}
                        {d.label}
                     </button>
                  ))}
               </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
               <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-lg">🔥 Cần bán gấp</span>
                        {isUrgent && <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full font-bold">Urgent</span>}
                     </div>
                     <p className="text-sm text-slate-500 mt-1">Tin đăng sẽ được ưu tiên gắn nhãn nổi bật để thu hút người mua nhanh nhất.</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} className="sr-only peer" />
                     <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
                  </div>
               </label>
            </div>
         </div>

         {/* Nút hành động */}
         <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 pb-12">
            <button type="button" onClick={() => navigate("/")} className="px-6 py-3 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors text-sm" disabled={loading}>
               Hủy
            </button>
            <button type="button" onClick={() => handleSubmit('draft')} className="px-6 py-3 font-semibold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 shadow-sm rounded-lg transition-colors text-sm" disabled={loading}>
               Lưu nháp
            </button>
            <button type="button" onClick={() => handleSubmit('active')} className="vinted-btn-primary sm:w-auto shadow-xl flex items-center justify-center gap-2 py-3 px-8 text-base" disabled={loading}>
               {loading ? (
                  <>
                     <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     {uploadStep || "Đang xử lý..."}
                  </>
               ) : "Đăng bán ngay"}
            </button>
         </div>
      </div>
   );
}
