import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function NewSeriesCollection() {
  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">New Series Collection</h2>
        <div className="section-actions">
          <MoreHorizontal size={18} />
        </div>
      </div>

      <div className="new-series-row" onClick={() => window.open('https://awoiaf.westeros.org/', '_blank')}>
        <div className="series-covers">
          <div className="series-cover-1" style={{ backgroundImage: 'linear-gradient(135deg, #a83d36 0%, #5c1b17 100%)' }}></div>
          <div className="series-cover-2" style={{ backgroundImage: 'linear-gradient(135deg, #b8860b 0%, #8b6508 100%)' }}></div>
        </div>
        <div className="series-info">
          <div>
            <div className="series-title">A Legend of Ice and Fire: The Ice Horse</div>
            <div className="series-subtitle">8 chapters each vol</div>
          </div>
          <div className="series-vol">2 vol</div>
        </div>
      </div>
    </section>
  );
}
