import React from "react";

export default function TopTopicsCard() {
  const topics = [
    { name: "Topic 1", count: 301 },
    { name: "Topic 2", count: 154 },
    { name: "Topic 3", count: 52 },
    { name: "Topic 4", count: 32 }
  ];

  const maxCount = Math.max(...topics.map(topic => topic.count));

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3 className="card-title">Top Consultation Topics</h3>
      </div>
      <div className="topics-content">
        <div className="topics-header">
          <span className="topics-header-text">Topic</span>
        </div>
        <div className="topics-list">
          {topics.map((topic, index) => {
            const percentage = (topic.count / maxCount) * 100;
            return (
              <div key={index} className="topic-item">
                <div className="topic-bar-container">
                  <div 
                    className="topic-bar-background"
                    style={{ width: `${percentage}%` }}
                  />
                  <span className="topic-name">{topic.name}</span>
                </div>
                <span className="topic-count">{topic.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
