import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import BookCard from './BookCard';

export default function BookShelf({ displayedShortcuts, openEditModal, openAddModal }) {
  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">Popular Now</h2>
        <div className="section-actions">
          <MoreHorizontal size={18} />
        </div>
      </div>

      <div className="book-shelf">
        {displayedShortcuts.slice(0, 5).map((item) => (
          <BookCard
            key={item.id}
            item={item}
            openEditModal={openEditModal}
          />
        ))}

        {/* Add Custom Website Shortcut */}
        <div className="add-book-card" onClick={openAddModal}>
          <div className="add-book-cover">
            <div className="add-icon-circle">
              <Plus size={20} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Add Shortcut</span>
          </div>
          <div className="book-card-title">Add Website</div>
          <div className="book-card-subtitle">As book cover</div>
        </div>
      </div>
    </section>
  );
}
