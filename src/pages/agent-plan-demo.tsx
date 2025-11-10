/**
 * Agent Plan Demo Page
 * 
 * Demonstrates the agent plan component for task visualization
 */

import React, { useState } from 'react';
import { Tabs } from 'antd';
import Plan from '@/components/ui/agent-plan';
import AgentPlanEmbedded, { Task } from '@/components/ui/agent-plan-embedded';

const sampleTasks: Task[] = [
  {
    id: "1",
    title: "Analyze Trading Chart",
    description: "Perform technical analysis on the provided chart",
    status: "completed",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "1.1",
        title: "Identify key support/resistance levels",
        description: "Mark horizontal levels where price has bounced",
        status: "completed",
        priority: "high",
        tools: ["browser", "screenshot-analyzer"],
      },
      {
        id: "1.2",
        title: "Draw trendlines and channels",
        description: "Connect swing highs and lows to identify trends",
        status: "completed",
        priority: "medium",
        tools: ["browser", "drawing-tools"],
      },
    ],
  },
  {
    id: "2",
    title: "Create Trade Scenarios",
    description: "Define entry, stop-loss, and take-profit levels",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: ["1"],
    subtasks: [
      {
        id: "2.1",
        title: "Define primary scenario",
        description: "Set up the main trade setup with entry and targets",
        status: "in-progress",
        priority: "high",
        tools: ["position-calculator", "risk-manager"],
      },
      {
        id: "2.2",
        title: "Set price alerts",
        description: "Configure alerts at key price levels",
        status: "pending",
        priority: "medium",
        tools: ["alert-manager"],
      },
    ],
  },
  {
    id: "3",
    title: "Export Analysis Report",
    description: "Compile findings into a structured report",
    status: "pending",
    priority: "medium",
    level: 1,
    dependencies: ["1", "2"],
    subtasks: [
      {
        id: "3.1",
        title: "Generate report document",
        description: "Create formatted analysis report",
        status: "pending",
        priority: "medium",
        tools: ["file-system", "markdown-processor"],
      },
    ],
  },
];

export default function AgentPlanDemo() {
  const [activeTab, setActiveTab] = useState('full');

  const items = [
    {
      key: 'full',
      label: 'Full View',
      children: (
        <div className="h-full overflow-hidden">
          <Plan />
        </div>
      ),
    },
    {
      key: 'embedded',
      label: 'Embedded View',
      children: (
        <div className="space-y-4 p-4">
          <div>
            <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--color-text-01-dark)' }}>
              Compact Version (for chat messages)
            </h3>
            <AgentPlanEmbedded tasks={sampleTasks} compact />
          </div>
          
          <div>
            <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--color-text-01-dark)' }}>
              Standard Version
            </h3>
            <AgentPlanEmbedded tasks={sampleTasks} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-01-dark)' }}>
          Agent Plan Demo
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-03-dark)' }}>
          Interactive task planning and execution visualization for AI agents
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          className="h-full"
          style={{
            '--ant-tabs-ink-bar-color': 'rgba(255, 255, 255, 0.8)',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
