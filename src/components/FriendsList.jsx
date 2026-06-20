import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function FriendsList() {
  return (
    <section className="friends-container">
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 className="calendar-title">Reader Friends</h2>
        <div className="section-actions">
          <MoreHorizontal size={18} />
        </div>
      </div>

      <div className="friend-item">
        <div className="activity-line"></div>
        <img
          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80"
          className="friend-avatar"
          alt="Grvua"
        />
        <div className="friend-details">
          <div className="friend-name">Grvua</div>
          <p className="friend-comment">
            The chapter was so immersive! I loved exploring Diagon Alley and all its magical shops.
          </p>
          <div className="friend-activity">
            <span className="friend-activity-text">✓ Chapter Five: Diagon Alley</span>
            <span className="friend-time">5 min ago</span>
          </div>
        </div>
      </div>

      <div className="friend-item">
        <div className="activity-line"></div>
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
          className="friend-avatar"
          alt="Lilac"
        />
        <div className="friend-details">
          <div className="friend-name">Lilac</div>
          <p className="friend-comment">
            I really enjoyed the character introductions. The story keeps getting better with each chapter.
          </p>
          <div className="friend-activity">
            <span className="friend-activity-text">✓ Chapter Four: Flourish and Blotts</span>
            <span className="friend-time">32 min ago</span>
          </div>
        </div>
      </div>

      <div className="friend-item">
        <img
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80"
          className="friend-avatar"
          alt="Lilie"
        />
        <div className="friend-details">
          <div className="friend-name">Lilie</div>
          <p className="friend-comment">
            The magical world-building is amazing. Can't wait to continue reading the next chapter!
          </p>
          <div className="friend-activity">
            <span className="friend-activity-text">✓ Chapter Six: The Journey Begins</span>
            <span className="friend-time">2 hrs ago</span>
          </div>
        </div>
      </div>
    </section>
  );
}
