import { useEffect, useMemo, useState } from "react";
import { books } from "../../data/siteData";

export default function ListingManagement() {
  const [listings, setListings] = useState(
    books.map((book, idx) => ({
      id: book.id ?? idx + 1,
      title: book.title,
      seller: book.seller?.name ?? "Nguyễn Minh Anh",
      category: book.category ?? "Kinh tế",
      price: book.price,
      condition: "85%",
      status: idx % 3 === 0 ? "pending" : idx % 3 === 1 ? "published" : "flagged",
      views: Math.floor(Math.random() * 500),
      createdDate: "2024-03-25"
    }))
  );

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdDate", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredListings = useMemo(() => (
    listings.filter((listing) => {
      const matchStatus = filterStatus === "all" || listing.status === filterStatus;
      const matchSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    })
  ), [filterStatus, listings, searchTerm]);

  const sortedListings = useMemo(() => {
    const sorted = [...filteredListings];
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (key === "createdDate") {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return (aDate - bDate) * dir;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * dir;
      }

      return String(aValue).localeCompare(String(bValue), "vi") * dir;
    });

    return sorted;
  }, [filteredListings, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedListings.length / pageSize));
  const currentListings = sortedListings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  const handleApprove = (id) => {
    setListings(listings.map(l => l.id === id ? { ...l, status: "published" } : l));
  };

  const handleReject = (id) => {
    setListings(listings.filter(l => l.id !== id));
  };

  const statusColor = (status) => {
    switch(status) {
      case "published": return "admin-badge-success";
      case "pending": return "admin-badge-warning";
      case "flagged": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch(status) {
      case "published": return "Đã Duyệt";
      case "pending": return "Chờ Duyệt";
      case "flagged": return "Vi Phạm";
      default: return status;
    }
  };

  const getSortSymbol = (key) => {
    if (sortConfig.key !== key) return "^v";
    return sortConfig.direction === "asc" ? "^" : "v";
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Listing/Sách</h1>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-secondary">Báo Cáo</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            className="admin-filter-input with-search" 
            placeholder="Tìm theo tên sách..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất Cả Trạng Thái</option>
          <option value="published">Đã Duyệt</option>
          <option value="pending">Chờ Duyệt</option>
          <option value="flagged">Vi Phạm</option>
        </select>
      </div>

      {/* Listings Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên Sách</th>
              <th>Người Bán</th>
              <th>Danh Mục</th>
              <th>Giá</th>
              <th>Trạng Thái</th>
              <th>Lượt Xem</th>
              <th>Ngày Tạo</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredListings.map(listing => (
              <tr key={listing.id}>
                <td><strong>{listing.title}</strong></td>
                <td>{listing.seller}</td>
                <td>{listing.category}</td>
                <td style={{ fontWeight: 600 }}>{listing.price.toLocaleString("vi-VN")}đ</td>
                <td>
                  <span className={`admin-badge ${statusColor(listing.status)}`}>
                    {statusText(listing.status)}
                  </span>
                </td>
                <td>{listing.views}</td>
                <td>{listing.createdDate}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Xem
                    </button>
                    {listing.status === "pending" && (
                      <>
                        <button 
                          className="admin-btn admin-btn-success" 
                          style={{ padding: "6px 10px", fontSize: "12px" }}
                          onClick={() => handleApprove(listing.id)}
                        >
                          Duyệt
                        </button>
                        <button 
                          className="admin-btn admin-btn-danger" 
                          style={{ padding: "6px 10px", fontSize: "12px" }}
                          onClick={() => handleReject(listing.id)}
                        >
                          Từ Chối
                        </button>
                      </>
                    )}
                    {listing.status === "flagged" && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        onClick={() => handleReject(listing.id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "16px", color: "#56647e", fontSize: "14px" }}>
        Hiển thị {filteredListings.length} / {listings.length} listing
      </div>
    </div>
  );
}
